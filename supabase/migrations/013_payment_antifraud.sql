-- Etapa 3: pagos antifraude.
-- * "Ya pagué" solo después de 3 minutos de pulsar "Pagar con PayPhone" (hora guardada aquí, no en el navegador).
-- * El reporte exige el número de transacción de PayPhone.
-- * Con 2 reportes rechazados, la cuenta ya no puede reportar pagos hasta que administración la desbloquee.

alter table public.orders add column if not exists pay_clicked_at timestamptz;
alter table public.profiles add column if not exists payment_block_reset_at timestamptz;

create or replace function public.payment_report_rejections(p_user_id uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.orders o
  where o.buyer_id = p_user_id and o.status = 'rejected' and o.payment_reported_at is not null
    and o.reviewed_at > coalesce((select payment_block_reset_at from public.profiles where user_id = p_user_id), '-infinity');
$$;
revoke all on function public.payment_report_rejections(uuid) from public, anon, authenticated;

create or replace function public.mark_payment_started(p_order_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype;
begin
  select * into v_o from public.orders where id = p_order_id for update;
  if not found or v_o.buyer_id <> auth.uid() then raise exception 'Pedido no encontrado'; end if;
  if v_o.status not in ('pending_payment','payment_reported') then raise exception 'Este pedido ya fue revisado'; end if;
  update public.orders set pay_clicked_at = coalesce(pay_clicked_at, now()) where id = p_order_id
    returning pay_clicked_at into v_o.pay_clicked_at;
  return v_o.pay_clicked_at;
end; $$;
revoke all on function public.mark_payment_started(uuid) from public, anon;
grant execute on function public.mark_payment_started(uuid) to authenticated;

create or replace function public.report_order_payment(p_order_id uuid, p_reference text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype; v_ref text := trim(coalesce(p_reference, ''));
begin
  select * into v_o from public.orders where id = p_order_id for update;
  if not found or v_o.buyer_id <> auth.uid() then raise exception 'Pedido no encontrado'; end if;
  if v_o.status not in ('pending_payment','payment_reported') then raise exception 'Este pedido ya fue revisado'; end if;
  if public.payment_report_rejections(auth.uid()) >= 2 then
    raise exception 'Tu cuenta no puede reportar pagos porque hubo reportes rechazados. Escríbenos por WhatsApp para revisarlo.';
  end if;
  if v_o.pay_clicked_at is null or v_o.pay_clicked_at > now() - interval '3 minutes' then
    raise exception 'Primero completa tu pago en PayPhone. Podrás reportarlo unos minutos después de abrir el pago.';
  end if;
  if length(regexp_replace(v_ref, '\s', '', 'g')) < 4 then
    raise exception 'Escribe el número de transacción que aparece en tu comprobante de PayPhone.';
  end if;
  update public.orders set status = 'payment_reported', payment_reference = v_ref,
    payment_reported_at = now() where id = p_order_id;
end; $$;

create or replace function public.admin_payment_blocked_users()
returns table (user_id uuid, rejections int) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  return query
    select p.user_id, public.payment_report_rejections(p.user_id) from public.profiles p
    where p.role = 'user' and public.payment_report_rejections(p.user_id) >= 2;
end; $$;
revoke all on function public.admin_payment_blocked_users() from public, anon;
grant execute on function public.admin_payment_blocked_users() to authenticated;

create or replace function public.admin_unblock_payment_reports(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  update public.profiles set payment_block_reset_at = now() where user_id = p_user_id;
  if not found then raise exception 'Usuario no encontrado'; end if;
end; $$;
revoke all on function public.admin_unblock_payment_reports(uuid) from public, anon;
grant execute on function public.admin_unblock_payment_reports(uuid) to authenticated;
