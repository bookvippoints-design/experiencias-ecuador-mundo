alter function public.normalize_email(text) set search_path = public;
alter function public.valid_email(text) set search_path = public;
alter function public.entitlement_giftable(public.entitlements) set search_path = public;
-- Funciones internas: no se exponen al navegador (evita consultar si un correo existe)
revoke execute on function public.email_in_use(text) from authenticated;
revoke execute on function public.company_balance(uuid) from authenticated;
