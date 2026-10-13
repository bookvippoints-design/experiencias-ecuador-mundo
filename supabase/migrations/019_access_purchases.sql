-- Venta del acceso al público (página /acceso): compra pagada con la Cajita PayPhone
-- que crea la cuenta del cliente al aprobarse el pago.

alter table public.profiles drop constraint profiles_created_via_check;
alter table public.profiles add constraint profiles_created_via_check check (created_via in ('admin','company','gift','purchase'));

create table if not exists public.access_purchases (
  id uuid primary key default gen_random_uuid(),
  client_tx_id text not null unique check (length(client_tx_id) <= 50),
  full_name text not null,
  email text not null check (email = lower(email)),
  phone text,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'started' check (status in ('started', 'approved', 'canceled', 'failed')),
  payphone_id bigint,
  authorization_code text,
  card_brand text,
  last_digits text,
  message text,
  response jsonb,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  credited_at timestamptz
);
create index if not exists access_purchases_status_idx on public.access_purchases(status, confirmed_at desc);
alter table public.access_purchases enable row level security;
create policy access_purchases_admin_read on public.access_purchases for select using (public.is_admin());
revoke insert, update, delete on public.access_purchases from anon, authenticated;

create or replace function public.access_finalize(p_purchase_id uuid, p_user_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_p public.access_purchases%rowtype; v_role text;
begin
  select * into v_p from public.access_purchases where id = p_purchase_id for update;
  if not found then raise exception 'Compra no encontrada'; end if;
  if v_p.status <> 'approved' then raise exception 'El pago no está aprobado'; end if;
  if v_p.credited_at is not null then return 'already'; end if;
  select role into v_role from public.profiles where user_id = p_user_id;
  if v_role is null then
    insert into public.profiles (user_id, role, full_name, email, phone, created_via)
      values (p_user_id, 'user', v_p.full_name, v_p.email, v_p.phone, 'purchase');
  elsif v_role <> 'user' then
    raise exception 'Ese correo pertenece a una cuenta de empresa o administración';
  end if;
  update public.access_purchases set user_id = p_user_id, credited_at = now() where id = v_p.id;
  insert into public.audit_events (actor_user_id, event_type, details)
    values (p_user_id, 'access_purchased', jsonb_build_object('purchase_id', v_p.id, 'payphone_id', v_p.payphone_id));
  perform public.post_message(p_user_id, 'auto', '¡Bienvenido a Experiencias Ecuador y el Mundo!',
    'Tu acceso está activo y no vence. Empieza por tus 100 puntos de bienvenida en "Inicio" y luego elige un paquete para ti o para regalar.',
    '/cuenta', null, false);
  return case when v_role is null then 'created' else 'linked' end;
end; $$;
revoke all on function public.access_finalize(uuid, uuid) from public, anon, authenticated;
