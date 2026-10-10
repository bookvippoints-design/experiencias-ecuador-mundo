-- Reglas de canje (etapa 2). Termina SIEMPRE con una excepción: no guarda datos.
do $$
declare
  v_admin uuid := gen_random_uuid(); v_ana uuid := gen_random_uuid();
  v_order jsonb; v_n1 uuid; v_n2 uuid; v_i1 uuid; v_i2 uuid; v_b uuid; v_log text := '';
  v_far date := (now() at time zone 'America/Guayaquil')::date + 45;
begin
  insert into auth.users (id, email, aud, role) values
    (v_admin, 'admin.t2@example.com', 'authenticated', 'authenticated'),
    (v_ana, 'ana.t2@example.com', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, role, full_name, email) values
    (v_admin, 'admin', 'Admin', 'admin.t2@example.com'), (v_ana, 'user', 'Ana', 'ana.t2@example.com');

  perform set_config('request.jwt.claims', json_build_object('sub', v_ana, 'role', 'authenticated')::text, true);
  v_order := public.create_order('escape-premium', 'self', null, null, null, null, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  perform public.admin_approve_order((v_order->>'id')::uuid, null);
  select id into v_n1 from public.entitlements where code = (v_order->>'code') || '-N1';
  select id into v_n2 from public.entitlements where code = (v_order->>'code') || '-N2';
  select id into v_i1 from public.entitlements where code = (v_order->>'code') || '-I1';
  select id into v_i2 from public.entitlements where code = (v_order->>'code') || '-I2';
  v_log := v_log || case when not exists (select 1 from public.entitlements where order_id = (v_order->>'id')::uuid and kind = 'points')
    then 'OK paquete sin puntos; ' else 'FALLA paquete con puntos; ' end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_ana, 'role', 'authenticated')::text, true);
  begin perform public.request_booking(v_n1, 'Quito', null, 'Luis', null, true, (now()::date + 10), null, '0991234567');
    v_log := v_log || 'FALLA menos de 30 días; ';
  exception when others then v_log := v_log || 'OK exige 30 días; '; end;
  begin perform public.request_booking(v_n1, 'Quito', null, 'Luis', null, false, v_far, null, '0991234567');
    v_log := v_log || 'FALLA sin aceptar reglas; ';
  exception when others then v_log := v_log || 'OK exige aceptar reglas; '; end;
  begin perform public.request_booking(v_n1, 'Quito', null, 'Luis', null, true, v_far, null, null);
    v_log := v_log || 'FALLA sin teléfono; ';
  exception when others then v_log := v_log || 'OK exige teléfono; '; end;
  v_b := public.request_booking(v_n1, 'Quito', null, 'Luis', null, true, v_far, v_far + 7, '0991234567');
  v_log := v_log || 'OK solicitud nacional válida; ';
  perform public.user_update_booking_dates(v_b, v_far + 3, null);
  v_log := v_log || 'OK cambia fechas mientras está pendiente; ';

  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  perform public.admin_update_booking(v_b, 'confirmed', 'Hotel X');
  perform set_config('request.jwt.claims', json_build_object('sub', v_ana, 'role', 'authenticated')::text, true);
  begin perform public.user_update_booking_dates(v_b, v_far + 5, null); v_log := v_log || 'FALLA cambio tras confirmar; ';
  exception when others then v_log := v_log || 'OK confirmada no se cambia; '; end;

  begin perform public.request_booking(v_i1, 'Atlántida, Mar', null, null, null, true); v_log := v_log || 'FALLA destino fuera de lista; ';
  exception when others then v_log := v_log || 'OK solo destinos de la lista; '; end;
  perform public.request_booking(v_i1, 'Cancún, México', null, null, null, true);
  v_log := v_log || 'OK invitación con destino de la lista; ';
  begin perform public.request_booking(v_i2, 'Madrid, España', null, null, null, true); v_log := v_log || 'FALLA dos en un año; ';
  exception when others then v_log := v_log || 'OK una por año; '; end;

  raise exception 'RESULTADO: %', v_log;
end $$;
