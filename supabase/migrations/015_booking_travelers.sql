-- Canje con nombre y edad del titular y del acompañante (para saber si son adultos o niños).
-- La fecha alternativa deja de pedirse (la columna alt_check_in queda sin uso).

alter table public.booking_requests
  add column if not exists holder_name text,
  add column if not exists holder_age int check (holder_age between 0 and 120),
  add column if not exists companion_name text,
  add column if not exists companion_age int check (companion_age between 0 and 120);

create or replace function public.request_booking_v2(p_entitlement_id uuid, p_destination text,
  p_holder_name text default null, p_holder_age int default null,
  p_companion_name text default null, p_companion_age int default null,
  p_notes text default null, p_accept_rules boolean default false,
  p_check_in date default null, p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_kind text; v_id uuid; v_travelers text;
  v_holder text := nullif(trim(coalesce(p_holder_name, '')), '');
  v_comp text := nullif(trim(coalesce(p_companion_name, '')), '');
begin
  if public.current_app_role() <> 'user' then raise exception 'Acceso no autorizado'; end if;
  select kind into v_kind from public.entitlements where id = p_entitlement_id and owner_id = auth.uid();
  if v_kind is null then raise exception 'Experiencia no encontrada'; end if;

  if v_kind in ('national', 'international') then
    if v_holder is null or p_holder_age is null then raise exception 'Indica el nombre y la edad del titular'; end if;
    if p_holder_age not between 0 and 120 then raise exception 'Revisa la edad del titular'; end if;
    if v_kind = 'national' and (v_comp is null or p_companion_age is null) then
      raise exception 'Indica el nombre y la edad de tu acompañante';
    end if;
    if v_comp is not null and p_companion_age is null then raise exception 'Indica la edad de tu acompañante'; end if;
    if p_companion_age is not null and p_companion_age not between 0 and 120 then raise exception 'Revisa la edad del acompañante'; end if;
    v_travelers := v_holder || ' (' || p_holder_age || ' años)'
      || case when v_comp is not null then ' y ' || v_comp || ' (' || p_companion_age || ' años)' else '' end;
  end if;

  v_id := public.request_booking(p_entitlement_id, p_destination, null, v_travelers, p_notes, p_accept_rules,
    p_check_in, null, p_phone);
  update public.booking_requests set holder_name = v_holder, holder_age = p_holder_age,
    companion_name = v_comp, companion_age = p_companion_age where id = v_id;
  return v_id;
end; $$;
revoke all on function public.request_booking_v2(uuid, text, text, int, text, int, text, boolean, date, text) from public, anon;
grant execute on function public.request_booking_v2(uuid, text, text, int, text, int, text, boolean, date, text) to authenticated;

-- Desde ahora el canje entra solo por request_booking_v2 (que exige nombres y edades).
revoke execute on function public.request_booking(uuid, text, text, text, text, boolean, date, date, text) from authenticated;
