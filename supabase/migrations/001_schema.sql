-- Experiencias Ecuador y el Mundo — esquema base
-- Toda escritura de la aplicación pasa por funciones SECURITY DEFINER (ver 002).
-- Las tablas solo exponen lectura mediante RLS.

create extension if not exists pgcrypto;

-- ---------- Empresas ----------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contact_email text not null unique,
  logo_url text,
  status text not null default 'active' check (status in ('active','read_only','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Perfiles (uno por cuenta; el correo es único en toda la plataforma) ----------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','company','user')),
  full_name text not null,
  email text not null unique check (email = lower(email)),
  phone text,
  company_id uuid references public.companies(id),
  created_via text not null default 'admin' check (created_via in ('admin','company','gift')),
  created_at timestamptz not null default now(),
  check (role <> 'company' or company_id is not null)
);
create index on public.profiles(company_id);

-- ---------- Planes de empresa (fijos) ----------
create table public.company_plans (
  key text primary key,
  name text not null,
  quantity integer not null check (quantity > 0),
  total_price numeric(10,2) not null check (total_price > 0),
  badge text,
  sort integer not null default 0
);

-- ---------- Compras de cupos ----------
create table public.quota_purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  plan_key text not null references public.company_plans(key),
  quantity integer not null check (quantity > 0),
  total_price numeric(10,2) not null check (total_price > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  payment_reference text,
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  notes text
);
create index on public.quota_purchases(company_id);

-- Libro de cupos: saldo = suma de delta. Las restricciones únicas impiden
-- sumar dos veces una compra o descontar dos veces un usuario.
create table public.quota_ledger (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id),
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('purchase','user_created','admin_adjustment')),
  purchase_id uuid unique references public.quota_purchases(id),
  user_id uuid unique references auth.users(id),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (reason <> 'purchase' or purchase_id is not null),
  check (reason <> 'user_created' or user_id is not null)
);
create index on public.quota_ledger(company_id);

-- ---------- Catálogo ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null check (category in ('escape','points')),
  name text not null,
  tagline text,
  description text,
  price numeric(10,2) check (price is null or price > 0),
  purchasable boolean not null default false,
  validity_months integer check (validity_months is null or validity_months > 0),
  national_count integer not null default 0 check (national_count >= 0),
  national_days integer,
  national_nights integer,
  national_people integer,
  breakfast_included boolean not null default false,
  international_count integer not null default 0 check (international_count >= 0),
  points integer not null default 0 check (points >= 0),
  conditions text,
  image_url text,
  highlight text,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not purchasable or price is not null)
);

-- ---------- Pedidos ----------
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('P-' || nextval('public.order_number_seq')),
  buyer_id uuid not null references auth.users(id),
  product_id uuid not null references public.products(id),
  product_snapshot jsonb not null,
  price numeric(10,2) not null check (price > 0),
  mode text not null check (mode in ('self','gift')),
  recipient_name text,
  recipient_email text check (recipient_email is null or recipient_email = lower(recipient_email)),
  dedication text,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','payment_reported','approved','rejected','cancelled')),
  terms_accepted_at timestamptz not null,
  payment_reference text,
  payment_reported_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  check (mode = 'self' or (recipient_name is not null and recipient_email is not null))
);
create index on public.orders(buyer_id);
create index on public.orders(status);

-- ---------- Regalos ----------
create sequence public.gift_number_seq start 301;

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('R-' || nextval('public.gift_number_seq')),
  sender_id uuid not null references auth.users(id),
  recipient_id uuid not null references auth.users(id),
  recipient_name text not null,
  recipient_email text not null check (recipient_email = lower(recipient_email)),
  dedication text,
  order_id uuid unique references public.orders(id),
  delivered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.gifts(sender_id);
create index on public.gifts(recipient_id);

-- ---------- Beneficios ----------
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  order_id uuid not null references public.orders(id),
  kind text not null check (kind in ('national','international','points')),
  seq integer not null default 1,
  owner_id uuid not null references auth.users(id),
  purchaser_id uuid not null references auth.users(id),
  gift_id uuid references public.gifts(id),
  status text not null default 'available' check (status in ('available','requested','used')),
  valid_until timestamptz,                  -- null para puntos (no caducan)
  national_days integer,
  national_nights integer,
  points integer,
  points_credited_at timestamptz,           -- acreditación manual en BookVipPoints
  invitation_delivered_at timestamptz,      -- invitación internacional emitida
  invitation_registered_at timestamptz,     -- registrada en redeemvacations (ya no se transfiere)
  travel_deadline timestamptz,              -- 18 meses desde la activación
  destination text,
  product_name text,
  created_at timestamptz not null default now(),
  unique (order_id, kind, seq),
  check (kind = 'points' or valid_until is not null),
  check (kind <> 'points' or points is not null)
);
create index on public.entitlements(owner_id);

create table public.entitlement_transfers (
  id bigint generated always as identity primary key,
  entitlement_id uuid not null references public.entitlements(id),
  from_user uuid not null references auth.users(id),
  to_user uuid not null references auth.users(id),
  gift_id uuid not null references public.gifts(id),
  created_at timestamptz not null default now()
);

-- ---------- Solicitudes de reserva ----------
create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.entitlements(id),
  user_id uuid not null references auth.users(id),
  kind text not null check (kind in ('national','international')),
  destination text not null,
  preferred_dates text,
  travelers text,
  notes text,
  status text not null default 'requested' check (status in ('requested','in_progress','confirmed','cancelled')),
  admin_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.booking_requests(user_id);
-- Una sola solicitud activa por beneficio
create unique index booking_one_active_per_entitlement
  on public.booking_requests(entitlement_id) where status <> 'cancelled';

-- ---------- Auditoría ----------
create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  company_id uuid references public.companies(id),
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- updated_at ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger companies_touch before update on public.companies
  for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger booking_touch before update on public.booking_requests
  for each row execute function public.touch_updated_at();

-- ---------- Ayudantes de identidad ----------
create or replace function public.current_app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create or replace function public.current_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where user_id = auth.uid() and role = 'company';
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where user_id = auth.uid()), false);
$$;

-- ---------- RLS: solo lectura; escrituras vía funciones ----------
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_plans enable row level security;
alter table public.quota_purchases enable row level security;
alter table public.quota_ledger enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.gifts enable row level security;
alter table public.entitlements enable row level security;
alter table public.entitlement_transfers enable row level security;
alter table public.booking_requests enable row level security;
alter table public.audit_events enable row level security;

create policy companies_read on public.companies for select
  using (public.is_admin() or id = public.current_company_id());

-- Cada quien ve su propio perfil; admin ve todos. La empresa ve a sus usuarios
-- solo mediante company_users() (nombre, correo y estado), nunca sus compras.
create policy profiles_read on public.profiles for select
  using (public.is_admin() or user_id = auth.uid());

create policy plans_read on public.company_plans for select using (auth.uid() is not null);

create policy quota_purchases_read on public.quota_purchases for select
  using (public.is_admin() or company_id = public.current_company_id());

create policy quota_ledger_read on public.quota_ledger for select
  using (public.is_admin() or company_id = public.current_company_id());

create policy products_read on public.products for select
  using (public.is_admin() or (active and auth.uid() is not null));

-- Pedidos, regalos, beneficios y reservas: solo la persona involucrada o admin.
-- Ninguna regla para el rol empresa.
create policy orders_read on public.orders for select
  using (public.is_admin() or buyer_id = auth.uid());

create policy gifts_read on public.gifts for select
  using (public.is_admin() or sender_id = auth.uid() or recipient_id = auth.uid());

create policy entitlements_read on public.entitlements for select
  using (public.is_admin() or owner_id = auth.uid());

create policy transfers_read on public.entitlement_transfers for select
  using (public.is_admin() or from_user = auth.uid() or to_user = auth.uid());

create policy booking_read on public.booking_requests for select
  using (public.is_admin() or user_id = auth.uid());

create policy audit_read on public.audit_events for select using (public.is_admin());

-- Sin permisos de escritura directa para clientes
revoke insert, update, delete on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;
grant select on all tables in schema public to authenticated;

-- ---------- Almacenamiento de logos ----------
insert into storage.buckets (id, name, public) values ('company-logos', 'company-logos', true)
  on conflict (id) do nothing;

create policy "logos públicos" on storage.objects for select using (bucket_id = 'company-logos');
create policy "empresa sube su logo" on storage.objects for insert to authenticated
  with check (bucket_id = 'company-logos' and (storage.foldername(name))[1] = public.current_company_id()::text);
create policy "empresa reemplaza su logo" on storage.objects for update to authenticated
  using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = public.current_company_id()::text);
create policy "empresa borra su logo" on storage.objects for delete to authenticated
  using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = public.current_company_id()::text);
