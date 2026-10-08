-- Registro de cada correo enviado (respuesta del servidor SMTP) para diagnosticar entregas.
create table public.email_log (
  id bigint generated always as identity primary key,
  to_email text not null,
  subject text not null,
  status text not null check (status in ('sent','failed')),
  smtp_response text,
  error text,
  created_at timestamptz not null default now()
);
alter table public.email_log enable row level security;
create policy email_log_read on public.email_log for select using (public.is_admin());
grant select on public.email_log to authenticated;
revoke insert, update, delete on public.email_log from anon, authenticated;
