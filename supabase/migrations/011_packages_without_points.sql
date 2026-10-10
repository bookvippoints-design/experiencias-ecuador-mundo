-- Aplicado el 2026-10-10 (por partes, vía SQL).
-- Los paquetes Escape ya no incluyen puntos (mismos precios). Las compras existentes
-- no cambian: cada pedido guarda su product_snapshot.
-- Las reglas de la escapada nacional (temporada alta/vacaciones/feriados, 30 días,
-- 24-48 h hábiles, sin anulación tras confirmar) se agregan desde el código
-- (src/lib/products.ts → conditionLines), no se guardan en la base.

update public.products set points = 0 where slug in ('escape-esencial','escape-plus','escape-premium');

update public.products set description = 'Una escapada nacional de 2 días y 1 noche para 2 personas con desayuno, en Quito, Guayaquil, Manta, Cuenca o Loja.' where slug = 'escape-esencial';
update public.products set description = 'Una escapada nacional de 3 días y 2 noches para 2 personas con desayuno y una invitación hotelera internacional con fee de emisión US$0.' where slug = 'escape-plus';
update public.products set description = 'Dos escapadas nacionales de 3 días y 2 noches para 2 personas con desayuno y dos invitaciones hoteleras internacionales con fee de emisión US$0.' where slug = 'escape-premium';

-- Quitar de las condiciones de los paquetes las líneas que hablan de puntos.
update public.products set conditions = regexp_replace(conditions, E'\n[^\n]*[Pp]untos[^\n]*', '', 'g') where category = 'escape';

-- Tarjetas de puntos: equivalencia de ahorro explícita.
update public.products p set
  tagline = v.tagline,
  description = v.description,
  conditions = 'Cada punto equivale a hasta US$1 de ahorro como pago parcial en reservas de hotel nacionales o internacionales, sujeto a disponibilidad.
Los puntos no son efectivo ni saldo para pagar una reserva completa.
Los puntos no caducan. La acreditación en tu cuenta BookVipPoints se realiza manualmente tras confirmar el pago.
Las tarjetas de puntos se regalan completas.'
from (values
  ('puntos-250', '250 puntos = hasta US$250 de ahorro en hoteles', 'Una tarjeta de 250 puntos. Cada punto equivale a hasta US$1 de ahorro como pago parcial en reservas de hotel nacionales o internacionales.'),
  ('puntos-500', '500 puntos = hasta US$500 de ahorro en hoteles', 'Una tarjeta de 500 puntos. Cada punto equivale a hasta US$1 de ahorro como pago parcial en reservas de hotel nacionales o internacionales.'),
  ('puntos-1000', '1.000 puntos = hasta US$1.000 de ahorro en hoteles', 'Una tarjeta de 1.000 puntos. Cada punto equivale a hasta US$1 de ahorro como pago parcial en reservas de hotel nacionales o internacionales.')
) as v(slug, tagline, description)
where p.slug = v.slug;
