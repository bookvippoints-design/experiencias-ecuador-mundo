-- Prueba de flujos críticos. Se ejecuta dentro de un bloque que SIEMPRE
-- termina con una excepción, así que ningún dato de prueba queda guardado.
do $$
declare
  v_admin uuid := gen_random_uuid(); v_coacc uuid := gen_random_uuid();
  v_ana uuid := gen_random_uuid(); v_rosa uuid := gen_random_uuid(); v_luis uuid := gen_random_uuid();
  v_company uuid; v_purchase uuid; v_order jsonb; v_order2 jsonb; v_ok boolean; v_n int; v_bal int;
  v_n2 uuid; v_i1 uuid; v_i2 uuid; v_msg text; v_log text := '';
  procedure_as text;
begin
  insert into auth.users (id, email, aud, role) values
    (v_admin, 'admin.test@example.com', 'authenticated', 'authenticated'),
    (v_coacc, 'empresa.test@example.com', 'authenticated', 'authenticated'),
    (v_ana, 'ana.test@example.com', 'authenticated', 'authenticated'),
    (v_luis, 'luis.test@example.com', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, role, full_name, email) values (v_admin, 'admin', 'Admin', 'admin.test@example.com');

  -- Admin registra empresa
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  v_company := public.register_company('Empresa Test', 'empresa.nueva@example.com', null);
  insert into public.profiles (user_id, role, full_name, email, company_id, created_via)
    values (v_coacc, 'company', 'Empresa Test', 'empresa.test@example.com', v_company, 'admin');

  -- Empresa pide plan; admin aprueba una sola vez
  perform set_config('request.jwt.claims', json_build_object('sub', v_coacc, 'role', 'authenticated')::text, true);
  v_purchase := public.request_quota_purchase('inicial', 'REF-1');
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  perform public.review_quota_purchase(v_purchase, true, null);
  begin perform public.review_quota_purchase(v_purchase, true, null); v_log := v_log || 'FALLA doble aprobación; ';
  exception when others then v_log := v_log || 'OK doble aprobación bloqueada; '; end;
  if public.company_balance(v_company) <> 25 then v_log := v_log || 'FALLA saldo 25; '; else v_log := v_log || 'OK saldo 25; '; end if;

  -- Empresa crea usuario (Ana): un cupo, sin duplicar
  perform set_config('request.jwt.claims', json_build_object('sub', v_coacc, 'role', 'authenticated')::text, true);
  begin perform public.company_check_new_user('Ana', 'ana.test@example.com'); v_log := v_log || 'FALLA correo existente aceptado; ';
  exception when others then v_log := v_log || 'OK correo existente rechazado; '; end;
  perform public.company_finalize_user(v_company, v_ana, 'Ana', 'ana.test@example.com', null, v_coacc);
  begin perform public.company_finalize_user(v_company, v_ana, 'Ana', 'ana.test@example.com', null, v_coacc);
    v_log := v_log || 'FALLA doble descuento; ';
  exception when others then v_log := v_log || 'OK doble descuento bloqueado; '; end;
  if public.company_balance(v_company) <> 24 then v_log := v_log || 'FALLA saldo 24; '; else v_log := v_log || 'OK saldo 24; '; end if;
  -- Planes: precio sale del servidor
  select total_price = 100 into v_ok from public.quota_purchases where id = v_purchase;
  v_log := v_log || case when v_ok then 'OK precio de plan del servidor; ' else 'FALLA precio; ' end;

  -- Ana compra Premium para sí
  perform set_config('request.jwt.claims', json_build_object('sub', v_ana, 'role', 'authenticated')::text, true);
  begin perform public.create_order('escape-premium', 'self', null, null, null, null, false); v_log := v_log || 'FALLA sin aceptar condiciones; ';
  exception when others then v_log := v_log || 'OK exige condiciones; '; end;
  v_order := public.create_order('escape-premium', 'self', null, null, null, null, true);
  perform public.report_order_payment((v_order->>'id')::uuid, 'PP-123');
  begin perform public.create_order('escape-plus', 'gift', 'Rosa', 'rosa.test@example.com', 'rosa.test@exampel.com', 'Para ti', true);
    v_log := v_log || 'FALLA correos distintos aceptados; ';
  exception when others then v_log := v_log || 'OK correos distintos bloqueados; '; end;
  begin perform public.admin_approve_order((v_order->>'id')::uuid, null); v_log := v_log || 'FALLA usuario aprobó pago; ';
  exception when others then v_log := v_log || 'OK usuario no aprueba pagos; '; end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  perform public.admin_approve_order((v_order->>'id')::uuid, null);
  begin perform public.admin_approve_order((v_order->>'id')::uuid, null); v_log := v_log || 'FALLA doble beneficio; ';
  exception when others then v_log := v_log || 'OK pago no se aprueba dos veces; '; end;
  select count(*) into v_n from public.entitlements where order_id = (v_order->>'id')::uuid;
  v_log := v_log || case when v_n = 5 then 'OK 5 beneficios Premium; ' else 'FALLA beneficios=' || v_n || '; ' end;

  select id into v_n2 from public.entitlements where code = (v_order->>'code') || '-N2';
  select id into v_i1 from public.entitlements where code = (v_order->>'code') || '-I1';
  select id into v_i2 from public.entitlements where code = (v_order->>'code') || '-I2';

  -- Ana regala N2 e I2 a Rosa (cuenta nueva)
  insert into auth.users (id, email, aud, role) values (v_rosa, 'rosa.test@example.com', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claims', json_build_object('sub', v_ana, 'role', 'authenticated')::text, true);
  perform public.gift_entitlements(array[v_n2, v_i2], 'Rosa', 'rosa.test@example.com', 'ROSA.test@example.com ', 'Feliz cumpleaños');
  select count(*) into v_n from public.entitlements where owner_id = v_rosa;
  v_log := v_log || case when v_n = 2 then 'OK Rosa recibe 2; ' else 'FALLA Rosa=' || v_n || '; ' end;
  begin perform public.gift_entitlements(array[v_n2], 'Luis', 'luis.test@example.com', 'luis.test@example.com', null);
    v_log := v_log || 'FALLA Ana regaló algo que ya no es suyo; ';
  exception when others then v_log := v_log || 'OK regalo definitivo; '; end;
  begin perform public.request_booking(v_n2, 'Quito', null, null, null, false); v_log := v_log || 'FALLA Ana reservó lo regalado; ';
  exception when others then v_log := v_log || 'OK Ana no usa lo regalado; '; end;

  -- Reglas internacionales
  perform set_config('request.jwt.claims', json_build_object('sub', v_rosa, 'role', 'authenticated')::text, true);
  perform public.request_booking(v_i2, 'Cancún', 'Marzo', '2 adultos', null, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_ana, 'role', 'authenticated')::text, true);
  begin perform public.request_booking(v_i1, 'cancún', null, null, null, true); v_log := v_log || 'FALLA mismo destino; ';
  exception when others then v_log := v_log || 'OK mismo destino bloqueado; '; end;
  perform public.request_booking(v_i1, 'Madrid', null, null, null, true);
  v_log := v_log || 'OK destino distinto permitido; ';

  -- Permisos de lectura (RLS) para la empresa
  perform set_config('request.jwt.claims', json_build_object('sub', v_coacc, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into v_n from public.orders; v_log := v_log || case when v_n = 0 then 'OK empresa no ve pedidos; ' else 'FALLA empresa ve pedidos; ' end;
  select count(*) into v_n from public.entitlements; v_log := v_log || case when v_n = 0 then 'OK empresa no ve beneficios; ' else 'FALLA empresa ve beneficios; ' end;
  select count(*) into v_n from public.booking_requests; v_log := v_log || case when v_n = 0 then 'OK empresa no ve reservas; ' else 'FALLA empresa ve reservas; ' end;
  begin insert into public.quota_ledger (company_id, delta, reason, note) values (v_company, 100, 'admin_adjustment', 'x');
    v_log := v_log || 'FALLA empresa escribe cupos; ';
  exception when others then v_log := v_log || 'OK empresa no escribe cupos; '; end;
  begin perform public.email_in_use('ana.test@example.com'); v_log := v_log || 'FALLA consulta de correos expuesta; ';
  exception when others then v_log := v_log || 'OK consulta de correos protegida; '; end;
  -- Rosa no ve beneficios de Ana
  perform set_config('request.jwt.claims', json_build_object('sub', v_rosa, 'role', 'authenticated')::text, true);
  select count(*) into v_n from public.entitlements; v_log := v_log || case when v_n = 2 then 'OK Rosa solo ve los suyos; ' else 'FALLA Rosa ve ' || v_n || '; ' end;
  execute 'reset role';

  raise exception 'RESULTADOS: %', v_log;
end $$;
