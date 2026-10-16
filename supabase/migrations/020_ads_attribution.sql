-- Medición de Google Ads para la compra del acceso (/acceso).
-- * gclid / gbraid / wbraid: identificadores de clic guardados al iniciar el pago (respaldo de atribución).
-- * ads_conversion_sent_at: cuándo el navegador confirmó el envío de la conversión (evita repetirla).
alter table public.access_purchases
  add column if not exists gclid text,
  add column if not exists gbraid text,
  add column if not exists wbraid text,
  add column if not exists landing_url text,
  add column if not exists ads_conversion_sent_at timestamptz;
