-- Etapa 2: canjes.
-- 1) Lista de destinos de la invitación internacional (del mapa de destinos), editable por administración.
-- 2) Escapada nacional: fecha de entrada (mín. 30 días), fecha alternativa, acompañante, teléfono y aceptación de reglas.
-- 3) El cliente puede cambiar las fechas mientras la solicitud está pendiente.

create table if not exists public.international_destinations (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  country text not null,
  region text not null,
  days int not null check (days between 1 and 30),
  nights int not null check (nights between 1 and 30),
  tax_per_night numeric(10,2) not null check (tax_per_night >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (city, country)
);
alter table public.international_destinations enable row level security;
create policy "destinos visibles para usuarios" on public.international_destinations
  for select to authenticated using (true);
revoke insert, update, delete on public.international_destinations from anon, authenticated;

-- Destinos de la invitación (fuente: repo bookvippoints-design/destinos_certificados, mapadestinos.html).
insert into public.international_destinations (city, country, region, days, nights, tax_per_night) values
('Edimburgo', 'Reino Unido', 'Europa', 4, 3, 67.15),
('Glasgow', 'Reino Unido', 'Europa', 4, 3, 32.65),
('Londres', 'Reino Unido', 'Europa', 4, 3, 65.45),
('Vanuatu', 'Vanuatu', 'Asia y Oceanía', 5, 4, 36.60),
('Dubái', 'Emiratos Árabes Unidos', 'Medio Oriente y África', 5, 4, 47.15),
('Antalya', 'Turquía', 'Europa', 4, 3, 35.84),
('Bodrum', 'Turquía', 'Europa', 5, 4, 35.24),
('Estambul', 'Turquía', 'Europa', 5, 4, 42.64),
('Bangkok', 'Tailandia', 'Asia y Oceanía', 5, 4, 29.94),
('Koh Samui', 'Tailandia', 'Asia y Oceanía', 8, 7, 29.96),
('Pattaya', 'Tailandia', 'Asia y Oceanía', 6, 5, 32.65),
('Phuket', 'Tailandia', 'Asia y Oceanía', 8, 7, 29.49),
('Zanzíbar', 'Tanzania', 'Medio Oriente y África', 5, 4, 62.14),
('Estocolmo', 'Suecia', 'Europa', 5, 4, 42.05),
('Barcelona', 'España', 'Europa', 5, 4, 52.16),
('Benidorm', 'España', 'Europa', 5, 4, 59.34),
('Madrid', 'España', 'Europa', 5, 4, 62.21),
('Mallorca', 'España', 'Europa', 5, 4, 37.72),
('Tenerife', 'España', 'Europa', 5, 4, 38.15),
('Ciudad del Cabo', 'Sudáfrica', 'Medio Oriente y África', 5, 4, 37.72),
('Singapur', 'Singapur', 'Asia y Oceanía', 6, 5, 43.18),
('La Meca', 'Arabia Saudita', 'Medio Oriente y África', 4, 3, 69.18),
('Lisboa', 'Portugal', 'Europa', 5, 4, 49.93),
('Bohol', 'Filipinas', 'Asia y Oceanía', 6, 5, 24.16),
('Boracay', 'Filipinas', 'Asia y Oceanía', 5, 4, 43.18),
('Auckland', 'Nueva Zelanda', 'Asia y Oceanía', 5, 4, 47.18),
('Bay of Plenty y Rotorua', 'Nueva Zelanda', 'Asia y Oceanía', 5, 4, 47.18),
('Christchurch', 'Nueva Zelanda', 'Asia y Oceanía', 5, 4, 45.22),
('Dunedin', 'Nueva Zelanda', 'Asia y Oceanía', 5, 4, 39.32),
('Marlborough', 'Nueva Zelanda', 'Asia y Oceanía', 5, 4, 47.18),
('Wellington', 'Nueva Zelanda', 'Asia y Oceanía', 5, 4, 47.18),
('Ámsterdam', 'Países Bajos', 'Europa', 4, 3, 48.33),
('Maldivas', 'Maldivas', 'Asia y Oceanía', 6, 5, 69.63),
('Kuala Lumpur', 'Malasia', 'Asia y Oceanía', 6, 5, 37.55),
('Macao', 'Macao', 'Asia y Oceanía', 6, 5, 32.65),
('Seúl', 'Corea del Sur', 'Asia y Oceanía', 6, 5, 37.55),
('Kioto', 'Japón', 'Asia y Oceanía', 6, 5, 38.17),
('Florencia', 'Italia', 'Europa', 5, 4, 62.29),
('Milán', 'Italia', 'Europa', 4, 3, 50.20),
('Nápoles', 'Italia', 'Europa', 5, 4, 62.29),
('Roma', 'Italia', 'Europa', 5, 4, 41.26),
('Venecia', 'Italia', 'Europa', 5, 4, 42.41),
('Dublín', 'Irlanda', 'Europa', 4, 3, 55.20),
('Jerusalén', 'Israel', 'Medio Oriente y África', 5, 4, 43.35),
('Bali', 'Indonesia', 'Asia y Oceanía', 8, 7, 29.95),
('Goa', 'India', 'Asia y Oceanía', 5, 4, 26.07),
('Reikiavik', 'Islandia', 'Europa', 5, 4, 62.14),
('Budapest', 'Hungría', 'Europa', 5, 4, 37.57),
('Atenas', 'Grecia', 'Europa', 5, 4, 39.84),
('Creta', 'Grecia', 'Europa', 6, 5, 34.96),
('Santorini', 'Grecia', 'Europa', 6, 5, 37.55),
('Berlín', 'Alemania', 'Europa', 4, 3, 41.87),
('Múnich', 'Alemania', 'Europa', 5, 4, 62.29),
('Cannes', 'Francia', 'Europa', 4, 3, 49.46),
('París', 'Francia', 'Europa', 5, 4, 49.96),
('Fiji', 'Fiji', 'Asia y Oceanía', 5, 4, 48.22),
('Copenhague', 'Dinamarca', 'Europa', 5, 4, 62.23),
('Dubrovnik', 'Croacia', 'Europa', 5, 4, 62.25),
('Cartagena', 'Colombia', 'América', 5, 4, 41.77),
('Medellín', 'Colombia', 'América', 5, 4, 49.24),
('Pekín', 'China', 'Asia y Oceanía', 5, 4, 62.14),
('Calgary', 'Canadá', 'América', 4, 3, 42.04),
('Edmonton', 'Canadá', 'América', 4, 3, 52.55),
('Halifax', 'Canadá', 'América', 4, 3, 36.60),
('Montreal', 'Canadá', 'América', 4, 3, 50.20),
('Cataratas del Niágara', 'Canadá', 'América', 4, 3, 48.42),
('Ottawa', 'Canadá', 'América', 4, 3, 43.97),
('Quebec', 'Canadá', 'América', 4, 3, 42.09),
('Revelstoke', 'Canadá', 'América', 4, 3, 39.18),
('Toronto', 'Canadá', 'América', 4, 3, 51.12),
('Vancouver', 'Canadá', 'América', 4, 3, 55.25),
('Victoria', 'Canadá', 'América', 4, 3, 49.20),
('Winnipeg', 'Canadá', 'América', 4, 3, 32.65),
('Río de Janeiro', 'Brasil', 'América', 5, 4, 41.88),
('Bruselas', 'Bélgica', 'Europa', 4, 3, 41.88),
('Viena', 'Austria', 'Europa', 5, 4, 42.84),
('Brisbane', 'Australia', 'Asia y Oceanía', 4, 3, 50.51),
('Cairns', 'Australia', 'Asia y Oceanía', 4, 3, 44.93),
('Darwin', 'Australia', 'Asia y Oceanía', 4, 3, 48.40),
('Gold Coast', 'Australia', 'Asia y Oceanía', 4, 3, 63.56),
('Mackay', 'Australia', 'Asia y Oceanía', 4, 3, 43.06),
('Melbourne', 'Australia', 'Asia y Oceanía', 4, 3, 50.51),
('Perth', 'Australia', 'Asia y Oceanía', 4, 3, 59.30),
('Rockhampton', 'Australia', 'Asia y Oceanía', 4, 3, 49.42),
('Sídney', 'Australia', 'Asia y Oceanía', 4, 3, 44.92),
('Townsville', 'Australia', 'Asia y Oceanía', 4, 3, 44.92),
('Buenos Aires', 'Argentina', 'América', 5, 4, 34.90),
('Cabo San Lucas', 'México', 'América', 5, 4, 38.95),
('Cancún', 'México', 'América', 6, 5, 38.95),
('Cancún Riviera Maya', 'México', 'América', 6, 5, 38.95),
('Puerto Vallarta', 'México', 'América', 6, 5, 29.74),
('Puerto Plata', 'República Dominicana', 'América', 6, 5, 38.95),
('Punta Cana', 'República Dominicana', 'América', 5, 4, 55.83),
('Albuquerque', 'Estados Unidos', 'América', 4, 3, 37.06),
('Atlanta', 'Estados Unidos', 'América', 4, 3, 49.95),
('Atlantic City', 'Estados Unidos', 'América', 4, 3, 48.43),
('Boston', 'Estados Unidos', 'América', 4, 3, 55.65),
('Branson', 'Estados Unidos', 'América', 4, 3, 46.63),
('Cape Cod', 'Estados Unidos', 'América', 4, 3, 49.98),
('Charleston', 'Estados Unidos', 'América', 4, 3, 66.33),
('Chicago', 'Estados Unidos', 'América', 4, 3, 55.38),
('Colorado Springs', 'Estados Unidos', 'América', 4, 3, 48.43),
('Daytona Beach', 'Estados Unidos', 'América', 4, 3, 54.53),
('Denver', 'Estados Unidos', 'América', 4, 3, 48.94),
('Estes Park', 'Estados Unidos', 'América', 4, 3, 49.98),
('Fort Lauderdale', 'Estados Unidos', 'América', 4, 3, 49.78),
('Galveston', 'Estados Unidos', 'América', 4, 3, 49.98),
('Gatlinburg', 'Estados Unidos', 'América', 4, 3, 74.94),
('Gran Cañón', 'Estados Unidos', 'América', 4, 3, 58.99),
('Gulf Shores', 'Estados Unidos', 'América', 4, 3, 69.50),
('Hawái', 'Estados Unidos', 'América', 6, 5, 88.49),
('Hot Springs', 'Estados Unidos', 'América', 4, 3, 52.19),
('Lake Tahoe', 'Estados Unidos', 'América', 4, 3, 64.72),
('Las Vegas', 'Estados Unidos', 'América', 4, 3, 33.24),
('Los Ángeles', 'Estados Unidos', 'América', 4, 3, 64.85),
('Miami', 'Estados Unidos', 'América', 4, 3, 49.76),
('Myrtle Beach', 'Estados Unidos', 'América', 4, 3, 65.71),
('Napa Valley', 'Estados Unidos', 'América', 4, 3, 82.12),
('Nashville', 'Estados Unidos', 'América', 4, 3, 65.59),
('Nueva Orleans', 'Estados Unidos', 'América', 4, 3, 62.62),
('Nueva York', 'Estados Unidos', 'América', 4, 3, 89.76),
('Ocean City', 'Estados Unidos', 'América', 4, 3, 48.39),
('Orlando', 'Estados Unidos', 'América', 4, 3, 56.70),
('Palm Springs', 'Estados Unidos', 'América', 4, 3, 57.18),
('Panama City', 'Estados Unidos', 'América', 4, 3, 74.32),
('Phoenix', 'Estados Unidos', 'América', 4, 3, 54.54),
('San Antonio', 'Estados Unidos', 'América', 4, 3, 54.22),
('San Diego', 'Estados Unidos', 'América', 4, 3, 78.85),
('San Francisco', 'Estados Unidos', 'América', 4, 3, 74.38),
('San Juan', 'Estados Unidos', 'América', 5, 4, 49.61),
('Savannah', 'Estados Unidos', 'América', 4, 3, 66.33),
('Sedona', 'Estados Unidos', 'América', 4, 3, 66.33),
('St. Petersburg', 'Estados Unidos', 'América', 4, 3, 73.12),
('Virginia Beach', 'Estados Unidos', 'América', 4, 3, 58.42)
on conflict (city, country) do nothing;

alter table public.booking_requests
  add column if not exists check_in date,
  add column if not exists alt_check_in date,
  add column if not exists contact_phone text,
  add column if not exists rules_accepted_at timestamptz;

-- La versión anterior (6 parámetros) se retira renombrándola, para evitar ambigüedad en las llamadas.
alter function public.request_booking(uuid, text, text, text, text, boolean) rename to request_booking_v1_retired;
revoke all on function public.request_booking_v1_retired(uuid, text, text, text, text, boolean) from public, anon, authenticated;

create or replace function public.request_booking(p_entitlement_id uuid, p_destination text,
  p_preferred_dates text default null, p_travelers text default null, p_notes text default null,
  p_accept_rules boolean default false, p_check_in date default null, p_alt_check_in date default null,
  p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_e public.entitlements%rowtype; v_dest text := trim(coalesce(p_destination, '')); v_id uuid;
  v_min date := (now() at time zone 'America/Guayaquil')::date + 30;
begin
  if public.current_app_role() <> 'user' then raise exception 'Acceso no autorizado'; end if;
  select * into v_e from public.entitlements where id = p_entitlement_id for update;
  if not found or v_e.owner_id <> auth.uid() then raise exception 'Experiencia no encontrada'; end if;
  if v_e.status <> 'available' then raise exception 'Esta experiencia ya tiene una solicitud o fue utilizada'; end if;
  if v_e.kind = 'points' then
    v_dest := lower(v_dest);
    if not public.valid_email(v_dest) then raise exception 'Indica un correo válido para tu cuenta BookVipPoints'; end if;
    if v_e.points_credited_at is not null then raise exception 'Estos puntos ya fueron acreditados'; end if;
  else
    if v_e.valid_until <= now() then raise exception 'Esta experiencia está vencida'; end if;
    if v_dest = '' then raise exception 'Elige un destino'; end if;
    if not coalesce(p_accept_rules, false) then raise exception 'Debes aceptar las condiciones de uso'; end if;
  end if;

  if v_e.kind = 'national' then
    if v_dest not in ('Quito','Guayaquil','Manta','Cuenca','Loja') then raise exception 'Destino nacional no válido'; end if;
    if p_check_in is null then raise exception 'Elige tu fecha de entrada'; end if;
    if p_check_in < v_min or (p_alt_check_in is not null and p_alt_check_in < v_min) then
      raise exception 'Las fechas deben ser con al menos 30 días de anticipación (desde el %).', to_char(v_min, 'DD/MM/YYYY');
    end if;
    if p_check_in > v_e.valid_until::date or (p_alt_check_in is not null and p_alt_check_in > v_e.valid_until::date) then
      raise exception 'Las fechas deben estar dentro de la vigencia de tu experiencia (hasta el %).', to_char(v_e.valid_until, 'DD/MM/YYYY');
    end if;
    if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 7 then raise exception 'Indica un teléfono de contacto'; end if;
    if trim(coalesce(p_travelers, '')) = '' then raise exception 'Indica el nombre de tu acompañante'; end if;
  end if;

  if v_e.kind = 'international' then
    if not exists (select 1 from public.international_destinations d
                   where d.active and lower(d.city || ', ' || d.country) = lower(v_dest)) then
      raise exception 'Elige un destino de la lista';
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

  insert into public.booking_requests (entitlement_id, user_id, kind, destination, preferred_dates, travelers, notes,
      check_in, alt_check_in, contact_phone, rules_accepted_at)
    values (v_e.id, auth.uid(), v_e.kind, v_dest, nullif(trim(p_preferred_dates), ''),
            nullif(trim(p_travelers), ''), nullif(trim(p_notes), ''),
            case when v_e.kind = 'national' then p_check_in end,
            case when v_e.kind = 'national' then p_alt_check_in end,
            nullif(trim(p_phone), ''),
            case when coalesce(p_accept_rules, false) then now() end)
    returning id into v_id;
  update public.entitlements set status = 'requested',
    destination = case when v_e.kind = 'points' then null else v_dest end
    where id = v_e.id;
  return v_id;
end; $$;
revoke all on function public.request_booking(uuid, text, text, text, text, boolean, date, date, text) from public, anon;
grant execute on function public.request_booking(uuid, text, text, text, text, boolean, date, date, text) to authenticated;

-- Cambio de fechas de una escapada nacional mientras no esté confirmada.
create or replace function public.user_update_booking_dates(p_booking_id uuid, p_check_in date, p_alt_check_in date default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_b public.booking_requests%rowtype; v_until timestamptz;
  v_min date := (now() at time zone 'America/Guayaquil')::date + 30;
begin
  if public.current_app_role() <> 'user' then raise exception 'Acceso no autorizado'; end if;
  select * into v_b from public.booking_requests where id = p_booking_id for update;
  if not found or v_b.user_id <> auth.uid() then raise exception 'Solicitud no encontrada'; end if;
  if v_b.kind <> 'national' then raise exception 'Solo las escapadas nacionales tienen fechas'; end if;
  if v_b.status not in ('requested', 'in_progress') then
    raise exception 'Esta reserva ya fue confirmada: y no admite cambios.';
  end if;
  select valid_until into v_until from public.entitlements where id = v_b.entitlement_id;
  if p_check_in is null then raise exception 'Elige tu fecha de entrada'; end if;
  if p_check_in < v_min or (p_alt_check_in is not null and p_alt_check_in < v_min) then
    raise exception 'Las fechas deben ser con al menos 30 días de anticipación (desde el %).', to_char(v_min, 'DD/MM/YYYY');
  end if;
  if p_check_in > v_until::date or (p_alt_check_in is not null and p_alt_check_in > v_until::date) then
    raise exception 'Las fechas deben estar dentro de la vigencia de tu experiencia (hasta el %).', to_char(v_until, 'DD/MM/YYYY');
  end if;
  update public.booking_requests set check_in = p_check_in, alt_check_in = p_alt_check_in, status = 'requested',
    updated_at = now() where id = p_booking_id;
end; $$;
revoke all on function public.user_update_booking_dates(uuid, date, date) from public, anon;
grant execute on function public.user_update_booking_dates(uuid, date, date) to authenticated;

-- Administración: crear o editar un destino.
create or replace function public.admin_save_destination(p_id uuid, p_city text, p_country text, p_region text,
  p_days int, p_nights int, p_tax numeric, p_active boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  if trim(coalesce(p_city, '')) = '' or trim(coalesce(p_country, '')) = '' then raise exception 'Indica ciudad y país'; end if;
  if p_id is null then
    insert into public.international_destinations (city, country, region, days, nights, tax_per_night, active)
      values (trim(p_city), trim(p_country), trim(p_region), p_days, p_nights, p_tax, coalesce(p_active, true))
      returning id into v_id;
  else
    update public.international_destinations set city = trim(p_city), country = trim(p_country), region = trim(p_region),
      days = p_days, nights = p_nights, tax_per_night = p_tax, active = coalesce(p_active, true), updated_at = now()
      where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Destino no encontrado'; end if;
  end if;
  return v_id;
end; $$;
revoke all on function public.admin_save_destination(uuid, text, text, text, int, int, numeric, boolean) from public, anon;
grant execute on function public.admin_save_destination(uuid, text, text, text, int, int, numeric, boolean) to authenticated;
