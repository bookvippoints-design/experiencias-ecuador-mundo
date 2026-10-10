-- Los paquetes Escape ya no incluyen puntos (mismos precios). Los puntos se venden
-- solo en tarjetas y el bono de bienvenida de BookVipPoints es externo.
-- Las compras existentes no cambian: cada pedido guarda su product_snapshot.

update public.products set
  points = 0,
  description = 'Una escapada nacional de 2 días y 1 noche para 2 personas con desayuno, en Quito, Guayaquil, Manta, Cuenca o Loja.',
  conditions = 'Vigencia de 12 meses desde el pago aprobado para solicitar y usar la escapada nacional.
Las escapadas nacionales NO se pueden usar en temporada alta, vacaciones ni feriados.
Se solicitan con un mínimo de 30 días de anticipación; respondemos en 24 a 48 horas hábiles.
Una vez confirmado el hospedaje, no se puede anular ni se reintegra el paquete.
Destinos nacionales: Quito, Guayaquil, Manta, Cuenca y Loja, en los hoteles del catálogo vigente.
La escapada es para 2 personas, con desayuno incluido. No incluye transporte, otras comidas ni consumos adicionales.'
where slug = 'escape-esencial';

update public.products set
  points = 0,
  description = 'Una escapada nacional de 3 días y 2 noches para 2 personas con desayuno y una invitación hotelera internacional con fee de emisión US$0.',
  conditions = 'Vigencia de 18 meses desde el pago aprobado para solicitar la escapada nacional y la invitación hotelera internacional.
Las escapadas nacionales NO se pueden usar en temporada alta, vacaciones ni feriados.
Se solicitan con un mínimo de 30 días de anticipación; respondemos en 24 a 48 horas hábiles.
Una vez confirmado el hospedaje, no se puede anular ni se reintegra el paquete.
Destinos nacionales: Quito, Guayaquil, Manta, Cuenca y Loja, en los hoteles del catálogo vigente, con desayuno.
Invitación hotelera internacional: más de 130 destinos, desde 4 días y 3 noches hasta 8 días y 7 noches según destino. Fee de emisión US$0 en este paquete. El viajero paga los impuestos gubernamentales y las tasas del hotel o resort, que varían por destino y temporada.
Una vez emitida, la invitación debe registrarse en 30 días; los impuestos y tasas se pagan dentro de 7 días tras el registro; desde la activación hay 18 meses para viajar.
Solo se puede usar una invitación internacional por año y no se puede repetir destino.'
where slug = 'escape-plus';

update public.products set
  points = 0,
  description = 'Dos escapadas nacionales de 3 días y 2 noches para 2 personas con desayuno y dos invitaciones hoteleras internacionales con fee de emisión US$0.',
  conditions = 'Vigencia de 24 meses desde el pago aprobado para solicitar las escapadas nacionales y las invitaciones hoteleras internacionales.
Las escapadas nacionales NO se pueden usar en temporada alta, vacaciones ni feriados.
Se solicitan con un mínimo de 30 días de anticipación; respondemos en 24 a 48 horas hábiles.
Una vez confirmado el hospedaje, no se puede anular ni se reintegra el paquete.
Destinos nacionales: Quito, Guayaquil, Manta, Cuenca y Loja, en los hoteles del catálogo vigente, con desayuno.
Invitaciones hoteleras internacionales: más de 130 destinos, desde 4 días y 3 noches hasta 8 días y 7 noches según destino. Fee de emisión US$0 en este paquete. El viajero paga los impuestos gubernamentales y las tasas del hotel o resort.
Una invitación por año, sin repetir destino. Las dos invitaciones no pueden usarse en el mismo destino (no pueden viajar 4 personas al mismo destino). El incumplimiento de esta regla puede anular todos los certificados.
Desde la activación de cada invitación hay 18 meses para viajar.
Cada experiencia se puede regalar por separado.'
where slug = 'escape-premium';

-- Tarjetas de puntos: equivalencia de ahorro explícita.
update public.products set
  tagline = '250 puntos = hasta US$250 de ahorro en hoteles',
  description = 'Una tarjeta de 250 puntos. Cada punto equivale a hasta US$1 de ahorro como pago parcial en reservas de hotel nacionales o internacionales.'
where slug = 'puntos-250';
update public.products set
  tagline = '500 puntos = hasta US$500 de ahorro en hoteles',
  description = 'Una tarjeta de 500 puntos. Cada punto equivale a hasta US$1 de ahorro como pago parcial en reservas de hotel nacionales o internacionales.'
where slug = 'puntos-500';
update public.products set
  tagline = '1.000 puntos = hasta US$1.000 de ahorro en hoteles',
  description = 'Una tarjeta de 1.000 puntos. Cada punto equivale a hasta US$1 de ahorro como pago parcial en reservas de hotel nacionales o internacionales.'
where slug = 'puntos-1000';

update public.products set
  conditions = 'Cada punto equivale a hasta US$1 de ahorro como pago parcial en reservas de hotel nacionales o internacionales, sujeto a disponibilidad.
Los puntos no son efectivo ni saldo para pagar una reserva completa.
Los puntos no caducan. La acreditación en tu cuenta BookVipPoints se realiza manualmente tras confirmar el pago.
Las tarjetas de puntos se regalan completas.'
where category = 'points';
