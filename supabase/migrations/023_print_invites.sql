-- Invitaciones impresas: el QR lleva a /i/<token>, que no vence. Solo el servidor las lee y escribe.
create table if not exists public.print_invites (
  token text primary key,
  user_id uuid not null unique references public.profiles(user_id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now(),
  printed_count int not null default 0,
  failed_attempts int not null default 0,
  used_at timestamptz
);
alter table public.print_invites enable row level security;
revoke all on table public.print_invites from anon, authenticated;
