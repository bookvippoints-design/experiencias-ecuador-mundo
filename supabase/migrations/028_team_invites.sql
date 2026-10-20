-- Invitaciones al equipo de la empresa: enlace propio que vence en 7 días. Solo el servidor las lee y escribe.
create table if not exists public.team_invites (
  token text primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists team_invites_user_idx on public.team_invites(user_id);
alter table public.team_invites enable row level security;
revoke all on table public.team_invites from anon, authenticated;
