-- Plazo de 14 días para comprar paquetes, puntos de regalo por compra dentro del plazo,
-- extensión desde administración, reactivación pagada y Galápagos como destino nacional.

-- ---------- Columnas ----------
alter table public.profiles
  add column if not exists purchase_window_started_at timestamptz,
  add column if not exists purchase_window_ends_at timestamptz,
  add column if not exists purchase_window_reminder int not null default 0;
alter table public.products add column if not exists bonus_points int not null default 0 check (bonus_points >= 0);
update public.products set bonus_points = 250 where slug = 'escape-esencial';
update public.products set bonus_points = 500 where slug = 'escape-plus';
update public.products set bonus_points = 1000 where slug = 'escape-premium';
alter table public.entitlements add column if not exists is_bonus boolean not null default false;
alter table public.access_purchases add column if not exists kind text not null default 'new' check (kind in ('new', 'reactivation'));

-- ---------- Plazo ----------
-- Abre el plazo la primera vez que el cliente entra a su portal (después de crear su contraseña).
create or replace function public.ensure_purchase_window() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_p public.profiles%rowtype;
begin
  select * into v_p from public.profiles where user_id = auth.uid() for update;
  if not found or v_p.role <> 'user' then return null; end if;
  if v_p.purchase_window_started_at is not null then return v_p.purchase_window_ends_at; end if;
  update public.profiles set purchase_window_started_at = now(), purchase_window_ends_at = now() + interval '14 days', purchase_window_reminder = 0
    where user_id = v_p.user_id;
  perform public.post_message(v_p.user_id, 'auto', '⏳ Tienes 14 días para elegir tu experiencia',
    'Son precios especiales de hospedaje que conseguimos por tiempo limitado. Compra tu paquete en los próximos 14 días y recibe además puntos de regalo: 250 con el Escape Esencial, 500 con el Escape Plus y 1.000 con el Escape Premium. Una vez comprado, tienes de 12 a 24 meses para usarlo.',
    '/cuenta/catalogo', null, false);
  return now() + interval '14 days';
end; $$;
revoke all on function public.ensure_purchase_window() from public, anon;
grant execute on function public.ensure_purchase_window() to authenticated;

-- No se pueden crear pedidos fuera del plazo.
create or replace function public.trg_orders_purchase_window() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_ends timestamptz;
begin
  select purchase_window_ends_at into v_ends from public.profiles where user_id = new.buyer_id;
  if v_ends is not null and now() > v_ends then
    raise exception 'Tu periodo de 14 días para comprar paquetes terminó. Puedes reactivar tu acceso desde Inicio.';
  end if;
  return new;
end; $$;
create trigger orders_purchase_window before insert on public.orders
  for each row execute function public.trg_orders_purchase_window();

-- Puntos de regalo al aprobarse el pago de un pedido creado dentro del plazo. Son de quien
-- compra (también cuando compra para regalar) y no se pueden regalar.
create or replace function public.trg_orders_bonus_points() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_ends timestamptz; v_points int; v_name text := new.product_snapshot->>'name';
begin
  if new.status <> 'approved' or old.status = 'approved' then return new; end if;
  select purchase_window_ends_at into v_ends from public.profiles where user_id = new.buyer_id;
  if v_ends is not null and new.created_at > v_ends then return new; end if;
  select coalesce(nullif((new.product_snapshot->>'bonus_points')::int, 0), p.bonus_points, 0) into v_points
    from public.products p where p.id = new.product_id;
  if coalesce(v_points, 0) <= 0 then return new; end if;
  if exists (select 1 from public.entitlements where order_id = new.id and is_bonus) then return new; end if;
  insert into public.entitlements (code, order_id, kind, seq, owner_id, purchaser_id, points, product_name, is_bonus)
    values (new.code || '-REG', new.id, 'points', 99, new.buyer_id, new.buyer_id, v_points, 'Regalo por tu compra: ' || v_name, true);
  perform public.post_message(new.buyer_id, 'auto', '🎁 Recibiste ' || v_points || ' puntos de regalo',
    'Por comprar ' || v_name || ' dentro de tu plazo de 14 días. Canjéalos en "Lo que tengo" y úsalos como pago parcial en tus próximas reservas de hotel. Los puntos no caducan. Aprende a sacarles el máximo provecho con los videos: https://go.bookvippoints.com/manual_usuario_bvpoints',
    '/cuenta/experiencias', null, true);
  return new;
end; $$;
create trigger orders_bonus_points after update of status on public.orders
  for each row execute function public.trg_orders_bonus_points();

-- Los puntos de regalo no se pueden regalar.
create or replace function public.entitlement_giftable(e public.entitlements) returns boolean
language sql stable set search_path = public as $$
  select e.status = 'available'
     and not coalesce(e.is_bonus, false)
     and (e.kind = 'points' or e.valid_until > now())
     and (e.kind <> 'points' or e.points_credited_at is null)
     and (e.kind <> 'international' or e.invitation_registered_at is null)
$$;

-- Administración: abre un nuevo plazo de 14 días (gratis), con derecho a puntos de regalo.
create or replace function public.admin_extend_purchase_window(p_user_id uuid, p_days int default 14) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_ends timestamptz := now() + make_interval(days => greatest(1, least(coalesce(p_days, 14), 60)));
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  update public.profiles set purchase_window_started_at = now(), purchase_window_ends_at = v_ends, purchase_window_reminder = 0
    where user_id = p_user_id and role = 'user';
  if not found then raise exception 'Cliente no encontrado'; end if;
  perform public.post_message(p_user_id, 'auto', '⏳ Tienes ' || greatest(1, least(coalesce(p_days, 14), 60)) || ' días más para elegir tu experiencia',
    'Reabrimos tu periodo de precios especiales. Compra tu paquete antes de que termine y recibe además puntos de regalo.', '/cuenta/catalogo', null, true);
  insert into public.audit_events (actor_user_id, event_type, details)
    values (auth.uid(), 'purchase_window_extended', jsonb_build_object('user_id', p_user_id, 'ends', v_ends));
  return v_ends;
end; $$;
revoke all on function public.admin_extend_purchase_window(uuid, int) from public, anon;
grant execute on function public.admin_extend_purchase_window(uuid, int) to authenticated;

-- Reactivación pagada (servidor con llave de servicio): abre 14 días nuevos.
create or replace function public.access_reactivate(p_purchase_id uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_p public.access_purchases%rowtype; v_ends timestamptz := now() + interval '14 days';
begin
  select * into v_p from public.access_purchases where id = p_purchase_id for update;
  if not found or v_p.kind <> 'reactivation' or v_p.user_id is null then raise exception 'Compra no encontrada'; end if;
  if v_p.status <> 'approved' then raise exception 'El pago no está aprobado'; end if;
  if v_p.credited_at is not null then
    return (select purchase_window_ends_at from public.profiles where user_id = v_p.user_id);
  end if;
  update public.profiles set purchase_window_started_at = now(), purchase_window_ends_at = v_ends, purchase_window_reminder = 0
    where user_id = v_p.user_id and role = 'user';
  update public.access_purchases set credited_at = now() where id = v_p.id;
  insert into public.audit_events (actor_user_id, event_type, details)
    values (v_p.user_id, 'access_reactivated', jsonb_build_object('purchase_id', v_p.id, 'payphone_id', v_p.payphone_id));
  perform public.post_message(v_p.user_id, 'auto', '✅ Acceso reactivado: tienes 14 días para elegir tu experiencia',
    'Compra tu paquete antes de que termine el plazo y recibe además puntos de regalo: 250 con el Escape Esencial, 500 con el Escape Plus y 1.000 con el Escape Premium.',
    '/cuenta/catalogo', null, false);
  return v_ends;
end; $$;
revoke all on function public.access_reactivate(uuid) from public, anon, authenticated;

-- Bienvenida de la compra del acceso, sin "no vence" ni 100 puntos.
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
    'Tu acceso está activo. Al entrar a tu portal empiezan tus 14 días para comprar paquetes con precios especiales y recibir puntos de regalo.',
    '/cuenta', null, false);
  return case when v_role is null then 'created' else 'linked' end;
end; $$;
revoke all on function public.access_finalize(uuid, uuid) from public, anon, authenticated;

-- ---------- Galápagos ----------
update public.products set
  description = replace(replace(description, 'Cuenca o Loja', 'Cuenca, Loja o Galápagos (Puerto Ayora)'), 'Cuenca y Loja', 'Cuenca, Loja y Galápagos (Puerto Ayora)'),
  conditions = replace(replace(conditions, 'Cuenca y Loja', 'Cuenca, Loja y Galápagos (Puerto Ayora)'), 'Cuenca o Loja', 'Cuenca, Loja o Galápagos (Puerto Ayora)')
  where category = 'escape';

-- Galápagos en la validación del canje nacional (se reescribe solo la lista de ciudades).
do $$
declare d text;
begin
  select pg_get_functiondef('public.request_booking(uuid,text,text,text,text,boolean,date,date,text)'::regprocedure) into d;
  if position('''Cuenca'',''Loja'')' in d) = 0 then raise exception 'Lista de ciudades no encontrada'; end if;
  d := replace(d, '''Cuenca'',''Loja'')', '''Cuenca'',''Loja'',''Galápagos (Puerto Ayora)'')');
  execute d;
end $$;
