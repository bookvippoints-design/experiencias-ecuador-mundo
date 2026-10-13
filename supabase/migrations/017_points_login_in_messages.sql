-- El aviso de puntos acreditados incluye el enlace de ingreso a BookVipPoints.
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
      'Ya están en tu cuenta BookVipPoints. Úsalos como pago parcial al reservar tu hotel. Entra aquí: https://bvpoints.netlify.app/login',
      '/cuenta/puntos', null, true);
  end if;
  return new;
end; $$;
