-- Bandeja "Mensajes" del cliente: mensajes de administración, avisos automáticos y
-- promociones (masivos, solo dentro de la plataforma). Los individuales también se
-- envían por correo (email_status = 'pending' → los despacha el servidor).

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- null = para todos los clientes
  kind text not null check (kind in ('admin', 'auto', 'broadcast')),
  title text not null,
  body text not null,
  link text,
  booking_id uuid references public.booking_requests(id) on delete set null,
  created_by uuid references auth.users(id),
  email_status text not null default 'none' check (email_status in ('none', 'pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);
create index if not exists messages_user_idx on public.messages(user_id, created_at desc);
create index if not exists messages_pending_idx on public.messages(email_status) where email_status = 'pending';

create table if not exists public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
create policy messages_read on public.messages for select using (
  public.is_admin()
  or user_id = auth.uid()
  or (user_id is null and public.current_app_role() = 'user'
      and created_at >= (select p.created_at from public.profiles p where p.user_id = auth.uid()))
);
create policy message_reads_read on public.message_reads for select using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.messages, public.message_reads from anon, authenticated;

-- Crea un mensaje (uso interno de triggers y funciones).
create or replace function public.post_message(p_user_id uuid, p_kind text, p_title text, p_body text,
  p_link text default null, p_booking_id uuid default null, p_email boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_user_id is not null and not exists (select 1 from public.profiles where user_id = p_user_id and role = 'user') then
    return null;  -- solo clientes tienen bandeja
  end if;
  insert into public.messages (user_id, kind, title, body, link, booking_id, created_by, email_status)
    values (p_user_id, p_kind, p_title, p_body, p_link, p_booking_id, auth.uid(),
            case when p_email and p_user_id is not null then 'pending' else 'none' end)
    returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.post_message(uuid, text, text, text, text, uuid, boolean) from public, anon, authenticated;

create or replace function public.my_unread_messages() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.messages m
  where (m.user_id = auth.uid()
         or (m.user_id is null and m.created_at >= (select p.created_at from public.profiles p where p.user_id = auth.uid() and p.role = 'user')))
    and not exists (select 1 from public.message_reads r where r.message_id = m.id and r.user_id = auth.uid());
$$;
grant execute on function public.my_unread_messages() to authenticated;

create or replace function public.mark_my_messages_read() returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.current_app_role() <> 'user' then return; end if;
  insert into public.message_reads (message_id, user_id)
    select m.id, auth.uid() from public.messages m
    where (m.user_id = auth.uid()
           or (m.user_id is null and m.created_at >= (select p.created_at from public.profiles p where p.user_id = auth.uid())))
    on conflict do nothing;
end; $$;
grant execute on function public.mark_my_messages_read() to authenticated;

-- Administración: mensaje a un cliente (también por correo) o a todos (solo en la plataforma).
create or replace function public.admin_send_message(p_user_id uuid, p_title text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  if trim(coalesce(p_title, '')) = '' or trim(coalesce(p_body, '')) = '' then raise exception 'Escribe el asunto y el mensaje'; end if;
  if p_user_id is not null and not exists (select 1 from public.profiles where user_id = p_user_id and role = 'user') then
    raise exception 'Cliente no encontrado';
  end if;
  insert into public.messages (user_id, kind, title, body, created_by, email_status)
    values (p_user_id, case when p_user_id is null then 'broadcast' else 'admin' end, trim(p_title), trim(p_body), auth.uid(),
            case when p_user_id is null then 'none' else 'pending' end)
    returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.admin_send_message(uuid, text, text) to authenticated;

-- ---------- Avisos automáticos ----------
create or replace function public.booking_label(p_kind text, p_destination text) returns text
language sql immutable as $$
  select case p_kind when 'national' then 'Escapada nacional a ' || p_destination
                     when 'international' then 'Invitación internacional a ' || p_destination
                     else 'Canje de puntos' end;
$$;

create or replace function public.trg_booking_messages() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_label text := public.booking_label(new.kind, new.destination); v_title text; v_body text;
begin
  if tg_op = 'INSERT' then
    perform public.post_message(new.user_id, 'auto', 'Recibimos tu solicitud: ' || v_label,
      case when new.kind = 'points' then 'Acreditaremos tus puntos en tu cuenta BookVipPoints (' || new.destination || ') y te avisaremos.'
           else 'Respondemos en 24 a 48 horas hábiles. Te escribiremos aquí y a tu correo.' end,
      '/cuenta/reservas', new.id, true);
    return new;
  end if;
  if new.status is distinct from old.status or new.admin_message is distinct from old.admin_message then
    if new.status = 'requested' then return new; end if;  -- cambio de fecha del propio cliente
    if new.kind = 'points' and new.status = 'confirmed' then return new; end if;       -- lo avisa la acreditación de puntos
    v_title := case new.status
      when 'in_progress' then 'Estamos gestionando: ' || v_label
      when 'confirmed' then '¡Confirmada! ' || v_label
      when 'cancelled' then 'Solicitud cancelada: ' || v_label
      else 'Actualización: ' || v_label end;
    v_body := coalesce(nullif(trim(new.admin_message), ''),
      case new.status
        when 'in_progress' then 'Estamos coordinando tu solicitud. Te avisaremos apenas esté lista.'
        when 'confirmed' then 'Tu solicitud fue confirmada.'
        when 'cancelled' then 'Tu solicitud fue cancelada y la experiencia volvió a estar disponible.'
        else 'Hay novedades en tu solicitud.' end);
    perform public.post_message(new.user_id, 'auto', v_title, v_body, '/cuenta/reservas', new.id, true);
  end if;
  return new;
end; $$;
create trigger booking_messages after insert or update on public.booking_requests
  for each row execute function public.trg_booking_messages();

create or replace function public.trg_order_messages() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text := new.product_snapshot->>'name';
begin
  if new.status = old.status then return new; end if;
  if new.status = 'approved' then
    if new.mode = 'gift' then
      perform public.post_message(new.buyer_id, 'auto', 'Pago aprobado: tu regalo fue entregado',
        'Tu regalo ' || v_name || ' ya está en la cuenta de ' || coalesce(new.recipient_name, 'su destinatario') || '.', '/cuenta/regalos', null, false);
    else
      perform public.post_message(new.buyer_id, 'auto', 'Pago aprobado: ' || v_name,
        'Confirmamos tu pago del pedido ' || new.code || '. Tus experiencias ya están en tu cuenta.', '/cuenta/experiencias', null, false);
    end if;
  elsif new.status = 'rejected' then
    perform public.post_message(new.buyer_id, 'auto', 'No pudimos verificar tu pago: ' || new.code,
      coalesce(nullif(trim(new.review_notes), ''), 'No encontramos el pago de este pedido en PayPhone. Escríbenos por WhatsApp para revisarlo.'),
      '/cuenta/pedidos', null, true);
  end if;
  return new;
end; $$;
create trigger order_messages after update of status on public.orders
  for each row execute function public.trg_order_messages();

create or replace function public.trg_gift_messages() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sender text;
begin
  select full_name into v_sender from public.profiles where user_id = new.sender_id;
  perform public.post_message(new.recipient_id, 'auto', '🎁 Recibiste un regalo de ' || coalesce(v_sender, 'alguien especial'),
    coalesce('“' || nullif(trim(new.dedication), '') || '” — ', '') || 'Ya está en tu cuenta, en "Lo que tengo".', '/cuenta/experiencias', null, false);
  perform public.post_message(new.sender_id, 'auto', 'Enviaste un regalo a ' || new.recipient_name,
    'Tu regalo ' || new.code || ' ya está en la cuenta de ' || new.recipient_name || '.', '/cuenta/regalos', null, false);
  return new;
end; $$;
create trigger gift_messages after insert on public.gifts
  for each row execute function public.trg_gift_messages();

create or replace function public.trg_entitlement_messages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'international' and old.invitation_delivered_at is null and new.invitation_delivered_at is not null then
    perform public.post_message(new.owner_id, 'auto', 'Tu invitación internacional fue emitida' || coalesce(' (' || new.destination || ')', ''),
      'Revisa tu correo: regístrala en 30 días con su código QR y paga los impuestos y tasas dentro de 7 días tras el registro.',
      '/cuenta/experiencias', null, true);
  end if;
  if new.kind = 'points' and old.points_credited_at is null and new.points_credited_at is not null then
    perform public.post_message(new.owner_id, 'auto', 'Tus ' || coalesce(new.points, 0) || ' puntos fueron acreditados',
      'Ya están en tu cuenta BookVipPoints. Úsalos como pago parcial al reservar tu hotel.', '/cuenta/puntos', null, true);
  end if;
  return new;
end; $$;
create trigger entitlement_messages after update of invitation_delivered_at, points_credited_at on public.entitlements
  for each row execute function public.trg_entitlement_messages();
