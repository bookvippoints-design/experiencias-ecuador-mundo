create or replace function public.admin_mark_points_credited(p_entitlement_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  update public.entitlements set points_credited_at = coalesce(points_credited_at, now()), status = 'used'
    where id = p_entitlement_id and kind = 'points';
  if not found then raise exception 'Puntos no encontrados'; end if;
  update public.booking_requests set status = 'confirmed'
    where entitlement_id = p_entitlement_id and status in ('requested','in_progress');
end; $$;
