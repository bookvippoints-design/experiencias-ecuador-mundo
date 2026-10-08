-- Canje de puntos: el cliente pide acreditarlos en su cuenta BookVipPoints;
-- administración los acredita manualmente y confirma la solicitud.
alter table public.booking_requests drop constraint booking_requests_kind_check;
alter table public.booking_requests add constraint booking_requests_kind_check check (kind in ('national','international','points'));

create or replace function public.request_booking(p_entitlement_id uuid, p_destination text,
  p_preferred_dates text default null, p_travelers text default null, p_notes text default null,
  p_accept_rules boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_e public.entitlements%rowtype; v_dest text := trim(coalesce(p_destination, '')); v_id uuid;
begin
  if public.current_app_role() <> 'user' then raise exception 'Acceso no autorizado'; end if;
  select * into v_e from public.entitlements where id = p_entitlement_id for update;
  if not found or v_e.owner_id <> auth.uid() then raise exception 'Experiencia no encontrada'; end if;
  if v_e.status <> 'available' then raise exception 'Esta experiencia ya tiene una solicitud o fue utilizada'; end if;
  if v_e.kind = 'points' then
    -- Canje de puntos: se acreditan en la cuenta BookVipPoints indicada (correo)
    v_dest := lower(v_dest);
    if not public.valid_email(v_dest) then raise exception 'Indica un correo válido para tu cuenta BookVipPoints'; end if;
    if v_e.points_credited_at is not null then raise exception 'Estos puntos ya fueron acreditados'; end if;
  else
    if v_e.valid_until <= now() then raise exception 'Esta experiencia está vencida'; end if;
    if v_dest = '' then raise exception 'Elige un destino'; end if;
    if v_e.kind = 'national' and v_dest not in ('Quito','Guayaquil','Manta','Cuenca','Loja') then
      raise exception 'Destino nacional no válido';
    end if;
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
  update public.entitlements set status = 'requested',
    destination = case when v_e.kind = 'points' then null else v_dest end
    where id = v_e.id;
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
  elsif p_status = 'confirmed' and v_b.kind = 'points' then
    update public.entitlements set status = 'used', points_credited_at = coalesce(points_credited_at, now())
      where id = v_b.entitlement_id;
  elsif p_status = 'cancelled' then
    update public.entitlements set status = 'available', destination = null
      where id = v_b.entitlement_id and invitation_registered_at is null and points_credited_at is null;
  end if;
end; $$;
