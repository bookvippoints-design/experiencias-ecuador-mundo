-- Cajita de Pagos PayPhone: cada intento de pago queda registrado aquí. El servidor
-- confirma el pago con PayPhone y, si fue aprobado, acredita el pedido o los cupos
-- sin intervención manual. La aprobación manual de administración sigue disponible.

create table if not exists public.payphone_payments (
  id uuid primary key default gen_random_uuid(),
  client_tx_id text not null unique check (length(client_tx_id) <= 50),
  kind text not null check (kind in ('order', 'quota')),
  order_id uuid references public.orders(id),
  company_id uuid references public.companies(id),
  plan_key text references public.company_plans(key),
  quota_purchase_id uuid references public.quota_purchases(id),
  user_id uuid not null references auth.users(id),
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'started' check (status in ('started', 'approved', 'canceled', 'failed')),
  payphone_id bigint,
  authorization_code text,
  card_brand text,
  last_digits text,
  message text,
  response jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  check ((kind = 'order' and order_id is not null) or (kind = 'quota' and company_id is not null and plan_key is not null))
);
create index if not exists payphone_payments_order_idx on public.payphone_payments(order_id);
create index if not exists payphone_payments_user_idx on public.payphone_payments(user_id, created_at desc);

alter table public.payphone_payments enable row level security;
create policy payphone_payments_read on public.payphone_payments for select using (public.is_admin() or user_id = auth.uid());
revoke insert, update, delete on public.payphone_payments from anon, authenticated;

-- Pedido pagado con PayPhone (solo el servidor, con la llave de servicio).
create or replace function public.payphone_approve_order(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare v_pay public.payphone_payments%rowtype; v_o public.orders%rowtype; v_now timestamptz := now();
  v_recipient uuid; v_gift uuid; v_gift_code text;
begin
  select * into v_pay from public.payphone_payments where id = p_payment_id for update;
  if not found or v_pay.kind <> 'order' then raise exception 'Pago no encontrado'; end if;
  if v_pay.status <> 'approved' then raise exception 'El pago no está aprobado'; end if;
  select * into v_o from public.orders where id = v_pay.order_id for update;
  if v_o.status = 'approved' then
    return jsonb_build_object('already', true, 'order_code', v_o.code, 'mode', v_o.mode);
  end if;
  if v_o.status not in ('pending_payment', 'payment_reported', 'cancelled') then
    raise exception 'El pedido % no se puede aprobar (estado %)', v_o.code, v_o.status;
  end if;
  if round(v_o.price * 100)::int <> v_pay.amount_cents then raise exception 'El monto pagado no coincide con el pedido'; end if;

  update public.orders set status = 'approved', reviewed_at = v_now,
    payment_reference = 'PayPhone ' || coalesce(v_pay.payphone_id::text, v_pay.client_tx_id),
    payment_reported_at = coalesce(payment_reported_at, v_now),
    review_notes = 'Pago con tarjeta confirmado automáticamente por PayPhone'
    where id = v_o.id;
  if v_o.mode = 'self' then
    perform public.create_entitlements(v_o, v_o.buyer_id, null, v_now);
  else
    select id into v_recipient from auth.users where lower(email) = v_o.recipient_email;
    if v_recipient is null then raise exception 'Primero debe crearse la cuenta del destinatario'; end if;
    perform public.ensure_user_profile(v_recipient, v_o.recipient_name, v_o.recipient_email);
    insert into public.gifts (sender_id, recipient_id, recipient_name, recipient_email, dedication, order_id, delivered_by)
      values (v_o.buyer_id, v_recipient, v_o.recipient_name, v_o.recipient_email, v_o.dedication, v_o.id, null)
      returning id, code into v_gift, v_gift_code;
    perform public.create_entitlements(v_o, v_recipient, v_gift, v_now);
  end if;
  insert into public.audit_events (actor_user_id, event_type, details)
    values (v_o.buyer_id, 'order_paid_payphone', jsonb_build_object('order', v_o.code, 'payphone_id', v_pay.payphone_id));
  return jsonb_build_object('already', false, 'order_code', v_o.code, 'mode', v_o.mode, 'gift_id', v_gift,
    'gift_code', v_gift_code, 'buyer_id', v_o.buyer_id, 'recipient_id', v_recipient);
end; $$;
revoke all on function public.payphone_approve_order(uuid) from public, anon, authenticated;

-- Compra de cupos pagada con PayPhone: se registra ya aprobada y suma los cupos.
create or replace function public.payphone_approve_quota(p_payment_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_pay public.payphone_payments%rowtype; v_plan public.company_plans%rowtype; v_id uuid;
begin
  select * into v_pay from public.payphone_payments where id = p_payment_id for update;
  if not found or v_pay.kind <> 'quota' then raise exception 'Pago no encontrado'; end if;
  if v_pay.status <> 'approved' then raise exception 'El pago no está aprobado'; end if;
  if v_pay.quota_purchase_id is not null then return v_pay.quota_purchase_id; end if;
  select * into v_plan from public.company_plans where key = v_pay.plan_key;
  if round(v_plan.total_price * 100)::int <> v_pay.amount_cents then raise exception 'El monto pagado no coincide con el plan'; end if;
  insert into public.quota_purchases (company_id, plan_key, quantity, total_price, status, payment_reference,
      requested_by, requested_at, reviewed_at, notes)
    values (v_pay.company_id, v_plan.key, v_plan.quantity, v_plan.total_price, 'approved',
      'PayPhone ' || coalesce(v_pay.payphone_id::text, v_pay.client_tx_id), v_pay.user_id, v_pay.created_at, now(),
      'Pago con tarjeta confirmado automáticamente por PayPhone')
    returning id into v_id;
  insert into public.quota_ledger (company_id, delta, reason, purchase_id, created_by)
    values (v_pay.company_id, v_plan.quantity, 'purchase', v_id, v_pay.user_id);
  update public.payphone_payments set quota_purchase_id = v_id where id = v_pay.id;
  insert into public.audit_events (actor_user_id, company_id, event_type, details)
    values (v_pay.user_id, v_pay.company_id, 'quota_paid_payphone', jsonb_build_object('purchase_id', v_id, 'payphone_id', v_pay.payphone_id));
  return v_id;
end; $$;
revoke all on function public.payphone_approve_quota(uuid) from public, anon, authenticated;
