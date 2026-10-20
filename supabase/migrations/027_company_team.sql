-- 027: Equipo de la empresa (subusuarios por departamento)
-- Dueño (owner) · Administrador (admin) · Usuario de departamento (member).
-- Todos comparten el saldo de cupos de la empresa. Los usuarios de departamento
-- tienen un límite diario (o sin límite) y el dueño o un administrador puede
-- darles cupos extra solo por hoy. Un usuario pausado puede entrar y ver lo
-- suyo, pero no puede crear accesos.

alter table public.profiles
  add column if not exists company_role text,
  add column if not exists department text,
  add column if not exists daily_limit integer,
  add column if not exists member_status text not null default 'active',
  add column if not exists invited_by uuid references auth.users(id);

update public.profiles set company_role = 'owner' where role = 'company' and company_role is null;

alter table public.profiles add constraint profiles_company_role_chk
  check (company_role is null or company_role in ('owner','admin','member'));
alter table public.profiles add constraint profiles_member_status_chk
  check (member_status in ('active','paused'));
alter table public.profiles add constraint profiles_daily_limit_chk
  check (daily_limit is null or daily_limit between 0 and 10000);

alter table public.companies
  add column if not exists departments text[] not null
  default array['Marketing','Ventas','Cobranzas','Servicio al Cliente','Posventa','Administración','Gerencia'];

create table if not exists public.company_daily_extra (
  member_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  extra integer not null check (extra between 0 and 10000),
  granted_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (member_id, day)
);
alter table public.company_daily_extra enable row level security;
create policy company_daily_extra_read on public.company_daily_extra for select
  using (public.is_admin() or company_id = public.current_company_id());

-- Día de hoy en Ecuador
create or replace function public.ec_today() returns date language sql stable as $$
  select (now() at time zone 'America/Guayaquil')::date;
$$;

-- Rol dentro de la empresa del usuario actual
create or replace function public.current_company_role() returns text
language sql stable security definer set search_path to 'public' as $$
  select company_role from public.profiles where user_id = auth.uid() and role = 'company';
$$;

create or replace function public.company_is_manager() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select coalesce(public.current_company_role() in ('owner','admin'), false);
$$;

-- Accesos que una persona del equipo creó hoy
create or replace function public.company_member_today(p_member uuid) returns integer
language sql stable security definer set search_path to 'public' as $$
  select count(*)::int from public.quota_ledger
   where created_by = p_member and reason = 'user_created'
     and (created_at at time zone 'America/Guayaquil')::date = public.ec_today();
$$;

-- Cuántos accesos más puede crear hoy (null = sin límite)
create or replace function public.company_member_remaining(p_member uuid) returns integer
language plpgsql stable security definer set search_path to 'public' as $$
declare v public.profiles%rowtype; v_extra int;
begin
  select * into v from public.profiles where user_id = p_member;
  if v.company_role is distinct from 'member' or v.daily_limit is null then return null; end if;
  select coalesce(extra, 0) into v_extra from public.company_daily_extra where member_id = p_member and day = public.ec_today();
  return greatest(0, v.daily_limit + coalesce(v_extra, 0) - public.company_member_today(p_member));
end; $$;

-- Valida que la persona del equipo pueda crear un acceso ahora
create or replace function public.company_actor_can_create(p_actor uuid, p_company_id uuid) returns void
language plpgsql stable security definer set search_path to 'public' as $$
declare v public.profiles%rowtype; v_left int;
begin
  select * into v from public.profiles where user_id = p_actor;
  if v.user_id is null or v.role <> 'company' or v.company_id is distinct from p_company_id then
    raise exception 'Acceso no autorizado';
  end if;
  if v.member_status = 'paused' then
    raise exception 'Tu usuario está pausado. Puedes ver tu información, pero no crear accesos. Habla con el administrador de tu empresa.';
  end if;
  v_left := public.company_member_remaining(p_actor);
  if v_left is not null and v_left <= 0 then
    raise exception 'Ya creaste todos tus accesos de hoy. Mañana podrás crear más. Si necesitas más hoy, pídele cupos extra a tu administrador.';
  end if;
end; $$;

-- Mi información dentro de la empresa
create or replace function public.company_me()
returns table(company_role text, department text, daily_limit integer, member_status text, today integer, extra_today integer, remaining integer)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if public.current_app_role() <> 'company' then raise exception 'Acceso no autorizado'; end if;
  return query
    select p.company_role, p.department, p.daily_limit, p.member_status,
      public.company_member_today(p.user_id),
      coalesce((select e.extra from public.company_daily_extra e where e.member_id = p.user_id and e.day = public.ec_today()), 0),
      public.company_member_remaining(p.user_id)
    from public.profiles p where p.user_id = auth.uid();
end; $$;

-- Validación previa al crear un acceso (ahora revisa también al usuario del equipo)
create or replace function public.company_check_new_user(p_name text, p_email text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_company public.companies%rowtype; v_email text := public.normalize_email(p_email);
begin
  if public.current_app_role() <> 'company' then raise exception 'Acceso no autorizado'; end if;
  select * into v_company from public.companies where id = public.current_company_id();
  if v_company.status <> 'active' then raise exception 'Tu cuenta no está habilitada para crear usuarios'; end if;
  perform public.company_actor_can_create(auth.uid(), v_company.id);
  if nullif(trim(p_name), '') is null then raise exception 'El nombre es obligatorio'; end if;
  if not public.valid_email(v_email) then raise exception 'El correo no es válido'; end if;
  if public.email_in_use(v_email) then
    raise exception 'Ese correo ya está registrado en la plataforma. Usa otro correo.';
  end if;
  if public.company_balance(v_company.id) <= 0 then
    raise exception 'No hay cupos disponibles en la empresa.';
  end if;
  return jsonb_build_object('company_id', v_company.id, 'email', v_email);
end; $$;

create or replace function public.company_finalize_user(p_company_id uuid, p_user_id uuid, p_name text, p_email text, p_phone text, p_actor uuid)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v_status text;
begin
  select status into v_status from public.companies where id = p_company_id for update;
  if v_status is null then raise exception 'Empresa no encontrada'; end if;
  if v_status <> 'active' then raise exception 'La empresa no está habilitada para crear usuarios'; end if;
  perform public.company_actor_can_create(p_actor, p_company_id);
  if public.company_balance(p_company_id) <= 0 then raise exception 'No hay cupos disponibles'; end if;
  insert into public.profiles (user_id, role, full_name, email, phone, company_id, created_via)
    values (p_user_id, 'user', trim(p_name), public.normalize_email(p_email), nullif(trim(p_phone), ''), p_company_id, 'company');
  insert into public.quota_ledger (company_id, delta, reason, user_id, created_by)
    values (p_company_id, -1, 'user_created', p_user_id, p_actor);
  insert into public.audit_events (actor_user_id, company_id, event_type, details)
    values (p_actor, p_company_id, 'company_user_created', jsonb_build_object('email', public.normalize_email(p_email)));
  return public.company_balance(p_company_id);
end; $$;

-- Clientes creados: el dueño y los administradores ven todos; el usuario de departamento solo los suyos
create or replace function public.company_users()
returns table(user_id uuid, full_name text, email text, phone text, created_at timestamptz, activated boolean)
language plpgsql stable security definer set search_path to 'public', 'auth' as $$
begin
  if public.current_app_role() <> 'company' then raise exception 'Acceso no autorizado'; end if;
  return query
    select p.user_id, p.full_name, p.email, p.phone, p.created_at,
           (u.encrypted_password is not null and u.encrypted_password <> '')
    from public.profiles p join auth.users u on u.id = p.user_id
    where p.company_id = public.current_company_id() and p.role = 'user'
      and (public.company_is_manager() or exists (
        select 1 from public.quota_ledger l where l.user_id = p.user_id and l.reason = 'user_created' and l.created_by = auth.uid()))
    order by p.created_at desc;
end; $$;

create or replace function public.company_users_detail()
returns table(user_id uuid, full_name text, email text, phone text, created_at timestamptz, activated boolean, created_by_name text, created_by_department text)
language plpgsql stable security definer set search_path to 'public', 'auth' as $$
begin
  if public.current_app_role() <> 'company' then raise exception 'Acceso no autorizado'; end if;
  return query
    select p.user_id, p.full_name, p.email, p.phone, p.created_at,
           (u.encrypted_password is not null and u.encrypted_password <> ''),
           c.full_name, c.department
    from public.profiles p join auth.users u on u.id = p.user_id
    left join lateral (select l.created_by from public.quota_ledger l where l.user_id = p.user_id and l.reason = 'user_created' order by l.created_at limit 1) l on true
    left join public.profiles c on c.user_id = l.created_by
    where p.company_id = public.current_company_id() and p.role = 'user'
      and (public.company_is_manager() or l.created_by = auth.uid())
    order by p.created_at desc;
end; $$;

create or replace function public.company_can_resend(p_user_id uuid)
returns text language plpgsql stable security definer set search_path to 'public' as $$
declare v_email text;
begin
  if public.current_app_role() <> 'company' then raise exception 'Acceso no autorizado'; end if;
  if (select member_status from public.profiles where user_id = auth.uid()) = 'paused' then
    raise exception 'Tu usuario está pausado. Habla con el administrador de tu empresa.';
  end if;
  select p.email into v_email from public.profiles p
    where p.user_id = p_user_id and p.company_id = public.current_company_id() and p.role = 'user'
      and (public.company_is_manager() or exists (
        select 1 from public.quota_ledger l where l.user_id = p.user_id and l.reason = 'user_created' and l.created_by = auth.uid()));
  if v_email is null then raise exception 'Usuario no encontrado'; end if;
  return v_email;
end; $$;

-- Equipo de la empresa (solo dueño y administradores)
create or replace function public.company_team()
returns table(user_id uuid, full_name text, email text, company_role text, department text, daily_limit integer,
  member_status text, activated boolean, today integer, extra_today integer, remaining integer, created_at timestamptz)
language plpgsql stable security definer set search_path to 'public', 'auth' as $$
begin
  if not public.company_is_manager() then raise exception 'Acceso no autorizado'; end if;
  return query
    select p.user_id, p.full_name, p.email, p.company_role, p.department, p.daily_limit, p.member_status,
      (u.encrypted_password is not null and u.encrypted_password <> ''),
      public.company_member_today(p.user_id),
      coalesce((select e.extra from public.company_daily_extra e where e.member_id = p.user_id and e.day = public.ec_today()), 0),
      public.company_member_remaining(p.user_id), p.created_at
    from public.profiles p join auth.users u on u.id = p.user_id
    where p.company_id = public.current_company_id() and p.role = 'company'
    order by case p.company_role when 'owner' then 0 when 'admin' then 1 else 2 end, p.department nulls first, p.full_name;
end; $$;

create or replace function public.company_team_check(p_name text, p_email text, p_role text, p_department text, p_daily_limit integer)
returns void language plpgsql stable security definer set search_path to 'public' as $$
declare v_email text := public.normalize_email(p_email);
begin
  if not public.company_is_manager() then raise exception 'Acceso no autorizado'; end if;
  if (select status from public.companies where id = public.current_company_id()) <> 'active' then
    raise exception 'Tu cuenta no está habilitada para agregar usuarios';
  end if;
  if nullif(trim(p_name), '') is null then raise exception 'El nombre es obligatorio'; end if;
  if not public.valid_email(v_email) then raise exception 'El correo no es válido'; end if;
  if p_role not in ('admin','member') then raise exception 'Tipo de usuario inválido'; end if;
  if p_role = 'member' and nullif(trim(p_department), '') is null then raise exception 'Elige el departamento'; end if;
  if p_daily_limit is not null and (p_daily_limit < 0 or p_daily_limit > 10000) then raise exception 'El límite diario no es válido'; end if;
  if public.email_in_use(v_email) then raise exception 'Ese correo ya está registrado en la plataforma. Usa otro correo.'; end if;
end; $$;

-- Crea el perfil del usuario del equipo (lo llama el servidor después de crear la cuenta)
create or replace function public.company_team_finalize(p_actor uuid, p_user_id uuid, p_name text, p_email text, p_role text, p_department text, p_daily_limit integer)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_actor public.profiles%rowtype;
begin
  select * into v_actor from public.profiles where user_id = p_actor;
  if v_actor.role <> 'company' or v_actor.company_role not in ('owner','admin') then raise exception 'Acceso no autorizado'; end if;
  if p_role not in ('admin','member') then raise exception 'Tipo de usuario inválido'; end if;
  insert into public.profiles (user_id, role, full_name, email, company_id, created_via, company_role, department, daily_limit, member_status, invited_by)
    values (p_user_id, 'company', trim(p_name), public.normalize_email(p_email), v_actor.company_id, 'company', p_role,
      nullif(trim(p_department), ''), case when p_role = 'member' then p_daily_limit end, 'active', p_actor);
  -- el departamento nuevo queda en la lista de la empresa
  if nullif(trim(p_department), '') is not null then
    update public.companies set departments = array_append(departments, trim(p_department))
      where id = v_actor.company_id and not (trim(p_department) = any(departments));
  end if;
  insert into public.audit_events (actor_user_id, company_id, event_type, details)
    values (p_actor, v_actor.company_id, 'company_team_member_added',
      jsonb_build_object('email', public.normalize_email(p_email), 'role', p_role, 'department', p_department, 'daily_limit', p_daily_limit));
end; $$;

create or replace function public.company_team_update(p_user_id uuid, p_role text, p_department text, p_daily_limit integer)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v public.profiles%rowtype;
begin
  if not public.company_is_manager() then raise exception 'Acceso no autorizado'; end if;
  select * into v from public.profiles where user_id = p_user_id and role = 'company' and company_id = public.current_company_id();
  if v.user_id is null then raise exception 'Usuario no encontrado'; end if;
  if v.company_role = 'owner' then raise exception 'No se puede cambiar al dueño de la cuenta'; end if;
  if p_role not in ('admin','member') then raise exception 'Tipo de usuario inválido'; end if;
  if p_role = 'member' and nullif(trim(p_department), '') is null then raise exception 'Elige el departamento'; end if;
  if p_daily_limit is not null and (p_daily_limit < 0 or p_daily_limit > 10000) then raise exception 'El límite diario no es válido'; end if;
  update public.profiles set company_role = p_role, department = nullif(trim(p_department), ''),
    daily_limit = case when p_role = 'member' then p_daily_limit end
    where user_id = p_user_id;
  if nullif(trim(p_department), '') is not null then
    update public.companies set departments = array_append(departments, trim(p_department))
      where id = public.current_company_id() and not (trim(p_department) = any(departments));
  end if;
  insert into public.audit_events (actor_user_id, company_id, event_type, details)
    values (auth.uid(), public.current_company_id(), 'company_team_member_updated',
      jsonb_build_object('user_id', p_user_id, 'role', p_role, 'department', p_department, 'daily_limit', p_daily_limit));
end; $$;

create or replace function public.company_team_set_status(p_user_id uuid, p_status text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v public.profiles%rowtype;
begin
  if not public.company_is_manager() then raise exception 'Acceso no autorizado'; end if;
  if p_status not in ('active','paused') then raise exception 'Estado inválido'; end if;
  select * into v from public.profiles where user_id = p_user_id and role = 'company' and company_id = public.current_company_id();
  if v.user_id is null then raise exception 'Usuario no encontrado'; end if;
  if v.company_role = 'owner' then raise exception 'No se puede pausar al dueño de la cuenta'; end if;
  if p_user_id = auth.uid() then raise exception 'No puedes pausarte a ti mismo'; end if;
  update public.profiles set member_status = p_status where user_id = p_user_id;
  insert into public.audit_events (actor_user_id, company_id, event_type, details)
    values (auth.uid(), public.current_company_id(), 'company_team_member_status', jsonb_build_object('user_id', p_user_id, 'status', p_status));
end; $$;

-- Cupos extra solo por hoy (reemplaza la cantidad extra de hoy)
create or replace function public.company_team_grant_extra(p_user_id uuid, p_extra integer)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v public.profiles%rowtype;
begin
  if not public.company_is_manager() then raise exception 'Acceso no autorizado'; end if;
  if p_extra is null or p_extra < 1 or p_extra > 1000 then raise exception 'Indica cuántos cupos extra (de 1 a 1000)'; end if;
  select * into v from public.profiles where user_id = p_user_id and role = 'company' and company_id = public.current_company_id();
  if v.user_id is null or v.company_role <> 'member' then raise exception 'Usuario no encontrado'; end if;
  if v.daily_limit is null then raise exception 'Este usuario no tiene límite diario'; end if;
  insert into public.company_daily_extra (member_id, day, company_id, extra, granted_by)
    values (p_user_id, public.ec_today(), v.company_id, p_extra, auth.uid())
    on conflict (member_id, day) do update set extra = public.company_daily_extra.extra + excluded.extra, granted_by = excluded.granted_by, updated_at = now();
  insert into public.audit_events (actor_user_id, company_id, event_type, details)
    values (auth.uid(), v.company_id, 'company_team_extra_today', jsonb_build_object('user_id', p_user_id, 'extra', p_extra));
end; $$;

-- Para reenviar la invitación a un usuario del equipo que aún no activa su cuenta
create or replace function public.company_team_member_email(p_user_id uuid)
returns text language plpgsql stable security definer set search_path to 'public' as $$
declare v_email text;
begin
  if not public.company_is_manager() then raise exception 'Acceso no autorizado'; end if;
  select email into v_email from public.profiles
    where user_id = p_user_id and role = 'company' and company_id = public.current_company_id() and company_role <> 'owner';
  if v_email is null then raise exception 'Usuario no encontrado'; end if;
  return v_email;
end; $$;

-- Reporte por departamento y persona
create or replace function public.company_team_report(p_from date, p_to date)
returns table(member_id uuid, member_name text, department text, created integer, activated integer)
language plpgsql stable security definer set search_path to 'public', 'auth' as $$
begin
  if not public.company_is_manager() then raise exception 'Acceso no autorizado'; end if;
  return query
    select m.user_id, m.full_name, coalesce(m.department, case m.company_role when 'owner' then 'Dueño' else 'Administración' end),
      count(l.id)::int,
      count(l.id) filter (where u.encrypted_password is not null and u.encrypted_password <> '')::int
    from public.quota_ledger l
    join public.profiles m on m.user_id = l.created_by
    left join auth.users u on u.id = l.user_id
    where l.company_id = public.current_company_id() and l.reason = 'user_created'
      and (l.created_at at time zone 'America/Guayaquil')::date between p_from and p_to
    group by m.user_id, m.full_name, m.department, m.company_role
    order by 3, 4 desc;
end; $$;

create or replace function public.company_set_departments(p_departments text[])
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.company_is_manager() then raise exception 'Acceso no autorizado'; end if;
  update public.companies set departments = (
    select coalesce(array_agg(distinct trim(d)), '{}') from unnest(p_departments) d where nullif(trim(d), '') is not null)
  where id = public.current_company_id();
end; $$;

-- Solo el dueño compra cupos; dueño y administradores cambian el logo
create or replace function public.request_quota_purchase(p_plan_key text, p_payment_reference text default null)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_plan public.company_plans%rowtype; v_id uuid;
begin
  if public.current_app_role() <> 'company' or public.current_company_role() <> 'owner' then raise exception 'Solo el dueño de la cuenta puede comprar cupos'; end if;
  select * into v_plan from public.company_plans where key = p_plan_key;
  if not found then raise exception 'Plan no encontrado'; end if;
  insert into public.quota_purchases (company_id, plan_key, quantity, total_price, payment_reference, requested_by)
    values (public.current_company_id(), v_plan.key, v_plan.quantity, v_plan.total_price,
            nullif(trim(p_payment_reference), ''), auth.uid())
    returning id into v_id;
  return v_id;
end; $$;

create or replace function public.update_company_logo(p_logo_url text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.company_is_manager() then raise exception 'Acceso no autorizado'; end if;
  update public.companies set logo_url = nullif(trim(p_logo_url), '') where id = public.current_company_id();
end; $$;

grant execute on function public.company_me(), public.company_users_detail(), public.company_team(),
  public.company_team_check(text, text, text, text, integer), public.company_team_update(uuid, text, text, integer),
  public.company_team_set_status(uuid, text), public.company_team_grant_extra(uuid, integer),
  public.company_team_member_email(uuid), public.company_team_report(date, date), public.company_set_departments(text[]),
  public.current_company_role(), public.company_is_manager() to authenticated;
revoke execute on function public.company_team_finalize(uuid, uuid, text, text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.company_actor_can_create(uuid, uuid) from public, anon, authenticated;

-- Toda cuenta de empresa nueva (registro de empresa) es la del dueño, salvo que se indique otro rol
create or replace function public.trg_profiles_company_role() returns trigger
language plpgsql as $$
begin
  if new.role = 'company' and new.company_role is null then new.company_role := 'owner'; end if;
  return new;
end; $$;
create trigger profiles_company_role before insert on public.profiles
  for each row execute function public.trg_profiles_company_role();

revoke execute on function public.company_member_today(uuid), public.company_member_remaining(uuid) from public, anon, authenticated;
