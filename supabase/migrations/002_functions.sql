-- Experiencias Ecuador y el Mundo — funciones de negocio
-- Cada función valida el rol de quien llama y bloquea las filas que modifica,
-- para que doble clic o reintentos no dupliquen cupos ni beneficios.

-- ======================= Utilidades =======================
create or replace function public.normalize_email(p text) returns text
language sql immutable as $$ select lower(trim(coalesce(p, ''))) $$;

create or replace function public.valid_email(p text) returns boolean
language sql immutable as $$ select p ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' $$;

create or replace function public.email_in_use(p_email text) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.users where lower(email) = public.normalize_email(p_email))
      or exists (select 1 from public.profiles where email = public.normalize_email(p_email))
      or exists (select 1 from public.companies where contact_email = public.normalize_email(p_email));
$$;

create or replace function public.company_balance(p_company_id uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.quota_ledger where company_id = p_company_id;
$$;

-- ======================= Administración: empresas =======================
create or replace function public.register_company(p_name text, p_contact_email text, p_logo_url text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_email text := public.normalize_email(p_contact_email); v_slug text; v_id uuid;
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'El nombre de la empresa es obligatorio'; end if;
  if not public.valid_email(v_email) then raise exception 'El correo no es válido'; end if;
  if public.email_in_use(v_email) then
    raise exception 'Ese correo ya está registrado en la plataforma. Usa otro correo.';
  end if;
  v_slug := regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g') || '-' || substr(gen_random_uuid()::text, 1, 6);
  insert into public.companies (name, slug, contact_email, logo_url)
    values (trim(p_name), v_slug, v_email, nullif(trim(p_logo_url), ''))
    returning id into v_id;
  insert into public.audit_events (actor_user_id, company_id, event_type, details)
    values (auth.uid(), v_id, 'company_registered', jsonb_build_object('email', v_email));
  return v_id;
end; $$;

create or replace function public.set_company_status(p_company_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  if p_status not in ('active','read_only','blocked') then raise exception 'Estado inválido'; end if;
  update public.companies set status = p_status where id = p_company_id;
  if not found then raise exception 'Empresa no encontrada'; end if;
  insert into public.audit_events (actor_user_id, company_id, event_type, details)
    values (auth.uid(), p_company_id, 'company_status_changed', jsonb_build_object('status', p_status));
end; $$;

create or replace function public.admin_adjust_quota(p_company_id uuid, p_delta integer, p_note text)
returns integer language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  if coalesce(p_delta, 0) = 0 then raise exception 'La cantidad no puede ser cero'; end if;
  if nullif(trim(p_note), '') is null then raise exception 'Indica el motivo del ajuste'; end if;
  perform 1 from public.companies where id = p_company_id for update;
  if not found then raise exception 'Empresa no encontrada'; end if;
  if public.company_balance(p_company_id) + p_delta < 0 then
    raise exception 'El ajuste dejaría el saldo de cupos en negativo';
  end if;
  insert into public.quota_ledger (company_id, delta, reason, note, created_by)
    values (p_company_id, p_delta, 'admin_adjustment', trim(p_note), auth.uid());
  return public.company_balance(p_company_id);
end; $$;

-- ======================= Empresa: panel y usuarios =======================
create or replace function public.company_dashboard()
returns table(company_id uuid, company_name text, logo_url text, access_status text,
              purchased integer, used integer, available integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.current_app_role() <> 'company' then raise exception 'Acceso no autorizado'; end if;
  return query
    select c.id, c.name, c.logo_url, c.status,
      coalesce((select sum(delta) from public.quota_ledger l where l.company_id = c.id and l.delta > 0), 0)::int,
      coalesce((select -sum(delta) from public.quota_ledger l where l.company_id = c.id and l.reason = 'user_created'), 0)::int,
      public.company_balance(c.id)
    from public.companies c where c.id = public.current_company_id();
end; $$;

-- La empresa ve solo nombre, correo, teléfono y si el usuario ya activó su cuenta.
create or replace function public.company_users()
returns table(user_id uuid, full_name text, email text, phone text, created_at timestamptz, activated boolean)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if public.current_app_role() <> 'company' then raise exception 'Acceso no autorizado'; end if;
  return query
    select p.user_id, p.full_name, p.email, p.phone, p.created_at, (u.last_sign_in_at is not null)
    from public.profiles p join auth.users u on u.id = p.user_id
    where p.company_id = public.current_company_id() and p.role = 'user'
    order by p.created_at desc;
end; $$;

-- Validación previa (sin efectos) antes de crear la cuenta en Auth.
create or replace function public.company_check_new_user(p_name text, p_email text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_company public.companies%rowtype; v_email text := public.normalize_email(p_email);
begin
  if public.current_app_role() <> 'company' then raise exception 'Acceso no autorizado'; end if;
  select * into v_company from public.companies where id = public.current_company_id();
  if v_company.status <> 'active' then raise exception 'Tu cuenta no está habilitada para crear usuarios'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'El nombre es obligatorio'; end if;
  if not public.valid_email(v_email) then raise exception 'El correo no es válido'; end if;
  if public.email_in_use(v_email) then
    raise exception 'Ese correo ya está registrado en la plataforma. Usa otro correo.';
  end if;
  if public.company_balance(v_company.id) <= 0 then
    raise exception 'No tienes cupos disponibles. Compra un plan para crear más usuarios.';
  end if;
  return jsonb_build_object('company_id', v_company.id, 'email', v_email);
end; $$;

-- Solo el servidor (service_role) la ejecuta, después de crear la cuenta en Auth.
-- Bloquea la empresa, vuelve a validar saldo y descuenta exactamente un cupo.
create or replace function public.company_finalize_user(p_company_id uuid, p_user_id uuid, p_name text,
  p_email text, p_phone text, p_actor uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  select status into v_status from public.companies where id = p_company_id for update;
  if v_status is null then raise exception 'Empresa no encontrada'; end if;
  if v_status <> 'active' then raise exception 'La empresa no está habilitada para crear usuarios'; end if;
  if public.company_balance(p_company_id) <= 0 then raise exception 'No hay cupos disponibles'; end if;
  insert into public.profiles (user_id, role, full_name, email, phone, company_id, created_via)
    values (p_user_id, 'user', trim(p_name), public.normalize_email(p_email), nullif(trim(p_phone), ''), p_company_id, 'company');
  insert into public.quota_ledger (company_id, delta, reason, user_id, created_by)
    values (p_company_id, -1, 'user_created', p_user_id, p_actor);
  insert into public.audit_events (actor_user_id, company_id, event_type, details)
    values (p_actor, p_company_id, 'company_user_created', jsonb_build_object('email', public.normalize_email(p_email)));
  return public.company_balance(p_company_id);
end; $$;

-- La empresa solo puede reenviar la invitación a sus propios usuarios.
create or replace function public.company_can_resend(p_user_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare v_email text;
begin
  if public.current_app_role() <> 'company' then raise exception 'Acceso no autorizado'; end if;
  select email into v_email from public.profiles
    where user_id = p_user_id and company_id = public.current_company_id() and role = 'user';
  if v_email is null then raise exception 'Usuario no encontrado'; end if;
  return v_email;
end; $$;

create or replace function public.update_company_logo(p_logo_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_app_role() <> 'company' then raise exception 'Acceso no autorizado'; end if;
  update public.companies set logo_url = nullif(trim(p_logo_url), '') where id = public.current_company_id();
end; $$;

-- ======================= Compra de cupos =======================
create or replace function public.request_quota_purchase(p_plan_key text, p_payment_reference text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_plan public.company_plans%rowtype; v_id uuid;
begin
  if public.current_app_role() <> 'company' then raise exception 'Acceso no autorizado'; end if;
  select * into v_plan from public.company_plans where key = p_plan_key;
  if not found then raise exception 'Plan no encontrado'; end if;
  -- Cantidad y precio salen siempre del plan guardado en el servidor.
  insert into public.quota_purchases (company_id, plan_key, quantity, total_price, payment_reference, requested_by)
    values (public.current_company_id(), v_plan.key, v_plan.quantity, v_plan.total_price,
            nullif(trim(p_payment_reference), ''), auth.uid())
    returning id into v_id;
  return v_id;
end; $$;

create or replace function public.review_quota_purchase(p_purchase_id uuid, p_approve boolean, p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_p public.quota_purchases%rowtype;
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  select * into v_p from public.quota_purchases where id = p_purchase_id for update;
  if not found then raise exception 'Compra no encontrada'; end if;
  if v_p.status <> 'pending' then raise exception 'Esta compra ya fue revisada'; end if;
  update public.quota_purchases
    set status = case when p_approve then 'approved' else 'rejected' end,
        reviewed_by = auth.uid(), reviewed_at = now(), notes = nullif(trim(p_notes), '')
    where id = p_purchase_id;
  if p_approve then
    insert into public.quota_ledger (company_id, delta, reason, purchase_id, created_by)
      values (v_p.company_id, v_p.quantity, 'purchase', v_p.id, auth.uid());
  end if;
  insert into public.audit_events (actor_user_id, company_id, event_type, details)
    values (auth.uid(), v_p.company_id, 'quota_purchase_reviewed',
            jsonb_build_object('purchase_id', v_p.id, 'approved', p_approve));
end; $$;

-- ======================= Usuario: pedidos =======================
create or replace function public.create_order(p_product_slug text, p_mode text, p_recipient_name text default null,
  p_recipient_email text default null, p_recipient_email_confirm text default null,
  p_dedication text default null, p_accept_terms boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_prod public.products%rowtype; v_email text; v_me text; v_id uuid; v_code text;
begin
  if public.current_app_role() <> 'user' then raise exception 'Acceso no autorizado'; end if;
  if not coalesce(p_accept_terms, false) then raise exception 'Debes aceptar las condiciones para continuar'; end if;
  if p_mode not in ('self','gift') then raise exception 'Modo de compra inválido'; end if;
  select * into v_prod from public.products where slug = p_product_slug and active;
  if not found then raise exception 'Producto no encontrado'; end if;
  if not v_prod.purchasable or v_prod.price is null then
    raise exception 'Este producto todavía no está disponible para la compra';
  end if;
  if p_mode = 'gift' then
    v_email := public.normalize_email(p_recipient_email);
    if nullif(trim(p_recipient_name), '') is null then raise exception 'Indica el nombre de quien recibe el regalo'; end if;
    if not public.valid_email(v_email) then raise exception 'El correo del destinatario no es válido'; end if;
    if v_email <> public.normalize_email(p_recipient_email_confirm) then
      raise exception 'Los dos correos no coinciden. Revísalos antes de continuar.';
    end if;
    select email into v_me from public.profiles where user_id = auth.uid();
    if v_email = v_me then raise exception 'No puedes regalarte a ti mismo; elige "Lo quiero para mí"'; end if;
    if exists (select 1 from public.profiles where email = v_email and role <> 'user')
       or exists (select 1 from public.companies where contact_email = v_email) then
      raise exception 'Ese correo pertenece a una cuenta de empresa. Usa otro correo.';
    end if;
  end if;
  insert into public.orders (buyer_id, product_id, product_snapshot, price, mode,
      recipient_name, recipient_email, dedication, terms_accepted_at)
    values (auth.uid(), v_prod.id, to_jsonb(v_prod), v_prod.price, p_mode,
      case when p_mode = 'gift' then trim(p_recipient_name) end,
      case when p_mode = 'gift' then v_email end,
      case when p_mode = 'gift' then nullif(trim(p_dedication), '') end, now())
    returning id, code into v_id, v_code;
  return jsonb_build_object('id', v_id, 'code', v_code);
end; $$;

create or replace function public.report_order_payment(p_order_id uuid, p_reference text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype;
begin
  select * into v_o from public.orders where id = p_order_id for update;
  if not found or v_o.buyer_id <> auth.uid() then raise exception 'Pedido no encontrado'; end if;
  if v_o.status not in ('pending_payment','payment_reported') then raise exception 'Este pedido ya fue revisado'; end if;
  update public.orders set status = 'payment_reported', payment_reference = nullif(trim(p_reference), ''),
    payment_reported_at = now() where id = p_order_id;
end; $$;

create or replace function public.cancel_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype;
begin
  select * into v_o from public.orders where id = p_order_id for update;
  if not found or v_o.buyer_id <> auth.uid() then raise exception 'Pedido no encontrado'; end if;
  if v_o.status <> 'pending_payment' then raise exception 'Solo puedes cancelar un pedido sin pago reportado'; end if;
  update public.orders set status = 'cancelled' where id = p_order_id;
end; $$;

-- ======================= Beneficios: creación =======================
create or replace function public.ensure_user_profile(p_user_id uuid, p_name text, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  select role into v_role from public.profiles where user_id = p_user_id;
  if v_role is null then
    insert into public.profiles (user_id, role, full_name, email, created_via)
      values (p_user_id, 'user', trim(p_name), public.normalize_email(p_email), 'gift');
  elsif v_role <> 'user' then
    raise exception 'Ese correo pertenece a una cuenta de empresa o administración';
  end if;
end; $$;
revoke all on function public.ensure_user_profile(uuid, text, text) from public, anon, authenticated;

create or replace function public.create_entitlements(p_order public.orders, p_owner uuid, p_gift_id uuid,
  p_approved_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare s jsonb := p_order.product_snapshot; v_until timestamptz; i int; v_name text := s->>'name';
begin
  v_until := p_approved_at + make_interval(months => coalesce((s->>'validity_months')::int, 12));
  for i in 1 .. coalesce((s->>'national_count')::int, 0) loop
    insert into public.entitlements (code, order_id, kind, seq, owner_id, purchaser_id, gift_id, valid_until,
        national_days, national_nights, product_name)
      values (p_order.code || '-N' || i, p_order.id, 'national', i, p_owner, p_order.buyer_id, p_gift_id, v_until,
        (s->>'national_days')::int, (s->>'national_nights')::int, v_name);
  end loop;
  for i in 1 .. coalesce((s->>'international_count')::int, 0) loop
    insert into public.entitlements (code, order_id, kind, seq, owner_id, purchaser_id, gift_id, valid_until, product_name)
      values (p_order.code || '-I' || i, p_order.id, 'international', i, p_owner, p_order.buyer_id, p_gift_id, v_until, v_name);
  end loop;
  if coalesce((s->>'points')::int, 0) > 0 then
    insert into public.entitlements (code, order_id, kind, seq, owner_id, purchaser_id, gift_id, points, product_name)
      values (p_order.code || '-PT', p_order.id, 'points', 1, p_owner, p_order.buyer_id, p_gift_id, (s->>'points')::int, v_name);
  end if;
end; $$;
revoke all on function public.create_entitlements(public.orders, uuid, uuid, timestamptz) from public, anon, authenticated;

-- Administración aprueba un pago. Para regalos, el servidor crea antes la cuenta
-- del destinatario en Auth (si no existía) y luego llama esta función.
create or replace function public.admin_approve_order(p_order_id uuid, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare v_o public.orders%rowtype; v_now timestamptz := now(); v_recipient uuid; v_gift uuid; v_gift_code text;
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  select * into v_o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_o.status not in ('pending_payment','payment_reported') then
    raise exception 'Este pedido ya fue revisado';
  end if;
  update public.orders set status = 'approved', reviewed_by = auth.uid(), reviewed_at = v_now,
    review_notes = nullif(trim(p_notes), '') where id = p_order_id;
  if v_o.mode = 'self' then
    perform public.create_entitlements(v_o, v_o.buyer_id, null, v_now);
  else
    select id into v_recipient from auth.users where lower(email) = v_o.recipient_email;
    if v_recipient is null then raise exception 'Primero debe crearse la cuenta del destinatario'; end if;
    perform public.ensure_user_profile(v_recipient, v_o.recipient_name, v_o.recipient_email);
    insert into public.gifts (sender_id, recipient_id, recipient_name, recipient_email, dedication, order_id, delivered_by)
      values (v_o.buyer_id, v_recipient, v_o.recipient_name, v_o.recipient_email, v_o.dedication, v_o.id, auth.uid())
      returning id, code into v_gift, v_gift_code;
    perform public.create_entitlements(v_o, v_recipient, v_gift, v_now);
  end if;
  insert into public.audit_events (actor_user_id, event_type, details)
    values (auth.uid(), 'order_approved', jsonb_build_object('order', v_o.code, 'mode', v_o.mode));
  return jsonb_build_object('order_code', v_o.code, 'mode', v_o.mode, 'gift_id', v_gift, 'gift_code', v_gift_code,
    'buyer_id', v_o.buyer_id, 'recipient_id', v_recipient);
end; $$;

create or replace function public.admin_reject_order(p_order_id uuid, p_notes text)
returns void language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype;
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  select * into v_o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_o.status not in ('pending_payment','payment_reported') then raise exception 'Este pedido ya fue revisado'; end if;
  update public.orders set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
    review_notes = nullif(trim(p_notes), '') where id = p_order_id;
end; $$;

-- ======================= Regalar beneficios que ya se tienen =======================
create or replace function public.entitlement_giftable(e public.entitlements) returns boolean
language sql stable as $$
  select e.status = 'available'
     and (e.kind = 'points' or e.valid_until > now())
     and (e.kind <> 'points' or e.points_credited_at is null)
     and (e.kind <> 'international' or e.invitation_registered_at is null)
$$;

create or replace function public.gift_precheck(p_entitlement_ids uuid[], p_recipient_name text,
  p_email text, p_email_confirm text)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare v_email text := public.normalize_email(p_email); v_me text; v_bad int; v_count int;
begin
  if public.current_app_role() <> 'user' then raise exception 'Acceso no autorizado'; end if;
  if coalesce(array_length(p_entitlement_ids, 1), 0) = 0 then raise exception 'Elige al menos una experiencia para regalar'; end if;
  if nullif(trim(p_recipient_name), '') is null then raise exception 'Indica el nombre de quien recibe el regalo'; end if;
  if not public.valid_email(v_email) then raise exception 'El correo del destinatario no es válido'; end if;
  if v_email <> public.normalize_email(p_email_confirm) then
    raise exception 'Los dos correos no coinciden. Revísalos antes de continuar.';
  end if;
  select email into v_me from public.profiles where user_id = auth.uid();
  if v_email = v_me then raise exception 'No puedes regalarte a ti mismo'; end if;
  if exists (select 1 from public.profiles where email = v_email and role <> 'user')
     or exists (select 1 from public.companies where contact_email = v_email) then
    raise exception 'Ese correo pertenece a una cuenta de empresa. Usa otro correo.';
  end if;
  select count(*), count(*) filter (where not public.entitlement_giftable(e) or e.owner_id <> auth.uid())
    into v_count, v_bad from public.entitlements e where e.id = any(p_entitlement_ids);
  if v_count <> array_length(p_entitlement_ids, 1) or v_bad > 0 then
    raise exception 'Alguna experiencia ya no se puede regalar (fue solicitada, usada, vencida o ya no es tuya)';
  end if;
  return jsonb_build_object('email', v_email,
    'recipient_exists', exists (select 1 from auth.users where lower(email) = v_email));
end; $$;

create or replace function public.gift_entitlements(p_entitlement_ids uuid[], p_recipient_name text,
  p_email text, p_email_confirm text, p_dedication text default null)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare v_check jsonb; v_email text; v_recipient uuid; v_gift uuid; v_code text; r public.entitlements%rowtype;
begin
  v_check := public.gift_precheck(p_entitlement_ids, p_recipient_name, p_email, p_email_confirm);
  v_email := v_check->>'email';
  select id into v_recipient from auth.users where lower(email) = v_email;
  if v_recipient is null then raise exception 'Primero debe crearse la cuenta del destinatario'; end if;
  perform public.ensure_user_profile(v_recipient, p_recipient_name, v_email);
  -- Bloquea los beneficios y vuelve a verificar dueño y estado dentro de la transacción.
  for r in select * from public.entitlements where id = any(p_entitlement_ids) for update loop
    if r.owner_id <> auth.uid() or not public.entitlement_giftable(r) then
      raise exception 'Alguna experiencia ya no se puede regalar';
    end if;
  end loop;
  insert into public.gifts (sender_id, recipient_id, recipient_name, recipient_email, dedication)
    values (auth.uid(), v_recipient, trim(p_recipient_name), v_email, nullif(trim(p_dedication), ''))
    returning id, code into v_gift, v_code;
  insert into public.entitlement_transfers (entitlement_id, from_user, to_user, gift_id)
    select id, auth.uid(), v_recipient, v_gift from public.entitlements where id = any(p_entitlement_ids);
  update public.entitlements set owner_id = v_recipient, gift_id = v_gift where id = any(p_entitlement_ids);
  insert into public.audit_events (actor_user_id, event_type, details)
    values (auth.uid(), 'entitlements_gifted', jsonb_build_object('gift', v_code, 'count', array_length(p_entitlement_ids, 1)));
  return jsonb_build_object('gift_id', v_gift, 'gift_code', v_code, 'recipient_id', v_recipient);
end; $$;

-- Datos de la tarjeta de regalo (comprador, destinatario o admin)
create or replace function public.gift_card_data(p_gift_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_g public.gifts%rowtype; v_sender text;
begin
  select * into v_g from public.gifts where id = p_gift_id;
  if not found or not (public.is_admin() or v_g.sender_id = auth.uid() or v_g.recipient_id = auth.uid()) then
    raise exception 'Regalo no encontrado';
  end if;
  select full_name into v_sender from public.profiles where user_id = v_g.sender_id;
  return jsonb_build_object('code', v_g.code, 'sender_name', v_sender, 'recipient_name', v_g.recipient_name,
    'recipient_email', v_g.recipient_email, 'dedication', v_g.dedication, 'created_at', v_g.created_at,
    'items', coalesce((select jsonb_agg(jsonb_build_object('code', e.code, 'kind', e.kind, 'valid_until', e.valid_until,
        'points', e.points, 'national_days', e.national_days, 'national_nights', e.national_nights) order by e.kind, e.seq)
      from public.entitlements e
      where e.gift_id = v_g.id
         or e.id in (select entitlement_id from public.entitlement_transfers t where t.gift_id = v_g.id)), '[]'::jsonb));
end; $$;

-- ======================= Reservas =======================
create or replace function public.request_booking(p_entitlement_id uuid, p_destination text,
  p_preferred_dates text default null, p_travelers text default null, p_notes text default null,
  p_accept_rules boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_e public.entitlements%rowtype; v_dest text := trim(coalesce(p_destination, '')); v_id uuid;
begin
  if public.current_app_role() <> 'user' then raise exception 'Acceso no autorizado'; end if;
  select * into v_e from public.entitlements where id = p_entitlement_id for update;
  if not found or v_e.owner_id <> auth.uid() then raise exception 'Experiencia no encontrada'; end if;
  if v_e.kind = 'points' then raise exception 'Los puntos se usan al reservar hoteles en BookVipPoints'; end if;
  if v_e.status <> 'available' then raise exception 'Esta experiencia ya tiene una solicitud o fue utilizada'; end if;
  if v_e.valid_until <= now() then raise exception 'Esta experiencia está vencida'; end if;
  if v_dest = '' then raise exception 'Elige un destino'; end if;
  if v_e.kind = 'national' and v_dest not in ('Quito','Guayaquil','Manta','Cuenca','Loja') then
    raise exception 'Destino nacional no válido';
  end if;
  if v_e.kind = 'international' then
    if not coalesce(p_accept_rules, false) then
      raise exception 'Debes aceptar las reglas de uso de la invitación';
    end if;
    if exists (select 1 from public.booking_requests b where b.user_id = auth.uid() and b.kind = 'international'
               and b.status <> 'cancelled' and b.created_at > now() - interval '1 year') then
      raise exception 'Solo puedes usar una invitación internacional por año. Puedes regalar esta invitación a otra persona.';
    end if;
    if exists (select 1 from public.booking_requests b where b.user_id = auth.uid() and b.kind = 'international'
               and b.status <> 'cancelled' and lower(b.destination) = lower(v_dest)) then
      raise exception 'Ya solicitaste una invitación para ese destino. No se puede repetir destino.';
    end if;
    if exists (select 1 from public.booking_requests b join public.entitlements e2 on e2.id = b.entitlement_id
               where e2.order_id = v_e.order_id and e2.kind = 'international' and e2.id <> v_e.id
               and b.status <> 'cancelled' and lower(b.destination) = lower(v_dest)) then
      raise exception 'Las dos invitaciones de un mismo paquete no pueden usarse en el mismo destino.';
    end if;
  end if;
  insert into public.booking_requests (entitlement_id, user_id, kind, destination, preferred_dates, travelers, notes)
    values (v_e.id, auth.uid(), v_e.kind, v_dest, nullif(trim(p_preferred_dates), ''),
            nullif(trim(p_travelers), ''), nullif(trim(p_notes), ''))
    returning id into v_id;
  update public.entitlements set status = 'requested', destination = v_dest where id = v_e.id;
  return v_id;
end; $$;

create or replace function public.admin_update_booking(p_booking_id uuid, p_status text, p_message text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_b public.booking_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  if p_status not in ('requested','in_progress','confirmed','cancelled') then raise exception 'Estado inválido'; end if;
  select * into v_b from public.booking_requests where id = p_booking_id for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if v_b.status = 'cancelled' then raise exception 'La solicitud ya fue cancelada'; end if;
  update public.booking_requests set status = p_status, admin_message = coalesce(nullif(trim(p_message), ''), admin_message)
    where id = p_booking_id;
  if p_status = 'confirmed' and v_b.kind = 'national' then
    update public.entitlements set status = 'used' where id = v_b.entitlement_id;
  elsif p_status = 'cancelled' then
    update public.entitlements set status = 'available', destination = null
      where id = v_b.entitlement_id and invitation_registered_at is null;
  end if;
end; $$;

-- Invitación internacional: emitida y registrada/activada (desde ahí 18 meses para viajar)
create or replace function public.admin_update_invitation(p_entitlement_id uuid, p_step text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  if p_step = 'delivered' then
    update public.entitlements set invitation_delivered_at = coalesce(invitation_delivered_at, now())
      where id = p_entitlement_id and kind = 'international';
  elsif p_step = 'registered' then
    update public.entitlements set invitation_registered_at = coalesce(invitation_registered_at, now()),
      travel_deadline = coalesce(travel_deadline, now() + interval '18 months')
      where id = p_entitlement_id and kind = 'international';
  elsif p_step = 'used' then
    update public.entitlements set status = 'used' where id = p_entitlement_id and kind = 'international';
  else
    raise exception 'Paso inválido';
  end if;
  if not found then raise exception 'Invitación no encontrada'; end if;
end; $$;

create or replace function public.admin_mark_points_credited(p_entitlement_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  update public.entitlements set points_credited_at = coalesce(points_credited_at, now())
    where id = p_entitlement_id and kind = 'points';
  if not found then raise exception 'Puntos no encontrados'; end if;
end; $$;

-- ======================= Catálogo editable =======================
create or replace function public.admin_save_product(p_id uuid, p_data jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  if p_id is null then
    insert into public.products (slug, category, name) values (p_data->>'slug', p_data->>'category', p_data->>'name')
      returning id into v_id;
  else
    v_id := p_id;
  end if;
  update public.products set
    name = coalesce(nullif(p_data->>'name', ''), name),
    tagline = p_data->>'tagline',
    description = p_data->>'description',
    price = nullif(p_data->>'price', '')::numeric,
    purchasable = coalesce((p_data->>'purchasable')::boolean, false) and nullif(p_data->>'price', '') is not null,
    validity_months = nullif(p_data->>'validity_months', '')::int,
    national_count = coalesce(nullif(p_data->>'national_count', '')::int, 0),
    national_days = nullif(p_data->>'national_days', '')::int,
    national_nights = nullif(p_data->>'national_nights', '')::int,
    national_people = nullif(p_data->>'national_people', '')::int,
    breakfast_included = coalesce((p_data->>'breakfast_included')::boolean, false),
    international_count = coalesce(nullif(p_data->>'international_count', '')::int, 0),
    points = coalesce(nullif(p_data->>'points', '')::int, 0),
    conditions = p_data->>'conditions',
    image_url = p_data->>'image_url',
    highlight = p_data->>'highlight',
    sort = coalesce(nullif(p_data->>'sort', '')::int, sort),
    active = coalesce((p_data->>'active')::boolean, true)
  where id = v_id;
  insert into public.audit_events (actor_user_id, event_type, details)
    values (auth.uid(), 'product_saved', jsonb_build_object('product_id', v_id));
  return v_id;
end; $$;

-- ======================= Panel de administración =======================
create or replace function public.admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  return jsonb_build_object(
    'companies', (select count(*) from public.companies),
    'users', (select count(*) from public.profiles where role = 'user'),
    'quota_purchased', (select coalesce(sum(delta), 0) from public.quota_ledger where delta > 0),
    'quota_used', (select coalesce(-sum(delta), 0) from public.quota_ledger where reason = 'user_created'),
    'pending_quota_purchases', (select count(*) from public.quota_purchases where status = 'pending'),
    'pending_orders', (select count(*) from public.orders where status in ('pending_payment','payment_reported')),
    'reported_orders', (select count(*) from public.orders where status = 'payment_reported'),
    'approved_orders', (select count(*) from public.orders where status = 'approved'),
    'sales_total', (select coalesce(sum(price), 0) from public.orders where status = 'approved'),
    'open_bookings', (select count(*) from public.booking_requests where status in ('requested','in_progress')),
    'gifts', (select count(*) from public.gifts),
    'entitlements_available', (select count(*) from public.entitlements where status = 'available' and (kind = 'points' or valid_until > now())),
    'entitlements_used', (select count(*) from public.entitlements where status = 'used'),
    'entitlements_expired', (select count(*) from public.entitlements where status = 'available' and kind <> 'points' and valid_until <= now())
  );
end; $$;

-- Nombre y correo de cualquier usuario para las tablas de administración
create or replace function public.admin_people(p_ids uuid[])
returns table(user_id uuid, full_name text, email text, company_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  return query select p.user_id, p.full_name, p.email, c.name
    from public.profiles p left join public.companies c on c.id = p.company_id
    where p.user_id = any(p_ids);
end; $$;

-- Nombre de quien envió un regalo (para el destinatario)
create or replace function public.my_gift_senders()
returns table(gift_id uuid, sender_name text) language sql stable security definer set search_path = public as $$
  select g.id, p.full_name from public.gifts g join public.profiles p on p.user_id = g.sender_id
  where g.recipient_id = auth.uid() or g.sender_id = auth.uid();
$$;

-- ======================= Permisos de ejecución =======================
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.company_finalize_user(uuid, uuid, text, text, text, uuid) from authenticated;
revoke execute on function public.ensure_user_profile(uuid, text, text) from authenticated;
revoke execute on function public.create_entitlements(public.orders, uuid, uuid, timestamptz) from authenticated;
grant execute on all functions in schema public to service_role;
