-- Cada empresa nueva recibe 5 cupos de cortesía al crearse.
create or replace function public.trg_company_welcome_quota() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.quota_ledger (company_id, delta, reason, note, created_by)
    values (new.id, 5, 'admin_adjustment', 'Cortesía de bienvenida: 5 cupos', auth.uid());
  return new;
end; $$;
revoke all on function public.trg_company_welcome_quota() from public, anon, authenticated;

create trigger company_welcome_quota after insert on public.companies
  for each row execute function public.trg_company_welcome_quota();
