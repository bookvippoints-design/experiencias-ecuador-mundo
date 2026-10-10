-- Etapa 4: recordatorios de vencimiento (los envía /api/cron/recordatorios una vez al día).
alter table public.entitlements
  add column if not exists reminder_first_sent_at timestamptz,
  add column if not exists reminder_last_sent_at timestamptz;
