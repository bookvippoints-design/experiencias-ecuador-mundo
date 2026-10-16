-- Medición de Google Ads para la compra del acceso (/acceso).
-- * gclid / gbraid / wbraid: identificadores de clic guardados al iniciar el pago (respaldo de atribución).
-- * ads_conversion_sent_at: cuándo el navegador confirmó el envío de la conversión (evita repetirla).
alter table public.access_purchases
  add column if not exists gclid text,
  add column if not exists gbraid text,
  add column if not exists wbraid text,
  add column if not exists landing_url text,
  add column if not exists ads_conversion_sent_at timestamptz;
-- Último intento de envío y su resultado ('sent' confirmado, 'blocked' etiqueta bloqueada,
-- 'timeout' sin confirmación, 'offline' sin conexión). Solo 'sent' detiene los reintentos.
alter table public.access_purchases
  add column if not exists ads_conversion_last_attempt_at timestamptz,
  add column if not exists ads_conversion_last_outcome text;
