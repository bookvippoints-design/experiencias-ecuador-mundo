-- Planes fijos de empresa (mismos precios que Escape Ecuador y el Mundo)
insert into public.company_plans (key, name, quantity, total_price, badge, sort) values
  ('inicial', 'Plan Inicial', 25, 100.00, null, 1),
  ('comercial', 'Plan Comercial', 100, 350.00, 'Más elegido', 2),
  ('crecimiento', 'Plan Crecimiento', 250, 750.00, null, 3),
  ('corporativo', 'Plan Corporativo', 500, 995.00, 'Mejor relación precio-beneficio', 4);

-- Catálogo inicial (editable desde administración)
insert into public.products (slug, category, name, tagline, description, price, purchasable, validity_months,
  national_count, national_days, national_nights, national_people, breakfast_included, international_count, points,
  image_url, highlight, sort, conditions) values
('escape-esencial', 'escape', 'Escape Esencial', 'Una escapada para dos dentro de Ecuador',
 'Una escapada nacional de 2 días y 1 noche para 2 personas con desayuno, más 250 puntos para ahorrar en hoteles.',
 99.00, true, 12, 1, 2, 1, 2, true, 0, 250, '/media/experiencia-nacional.jpg', null, 1,
 'Vigencia de 12 meses desde el pago aprobado para solicitar y usar la escapada nacional.
Destinos nacionales: Quito, Guayaquil, Manta, Cuenca y Loja, en los hoteles del catálogo vigente.
La escapada es para 2 personas, con desayuno incluido. No incluye transporte, otras comidas ni consumos adicionales.
Los puntos permiten un ahorro parcial en hospedajes; no son efectivo ni saldo para pagar una reserva completa. Los puntos no caducan.'),
('escape-plus', 'escape', 'Escape Plus', 'Ecuador y el mundo en un solo paquete',
 'Una escapada nacional de 3 días y 2 noches para 2 personas con desayuno, una invitación hotelera internacional y 500 puntos.',
 199.00, true, 18, 1, 3, 2, 2, true, 1, 500, '/media/hero-dos-experiencias.jpg', 'Más elegido', 2,
 'Vigencia de 18 meses desde el pago aprobado para solicitar la escapada nacional y la invitación hotelera internacional.
Destinos nacionales: Quito, Guayaquil, Manta, Cuenca y Loja, en los hoteles del catálogo vigente, con desayuno.
Invitación hotelera internacional: más de 130 destinos, desde 4 días y 3 noches hasta 8 días y 7 noches según destino. Fee de emisión US$0 en este paquete. El viajero paga los impuestos gubernamentales y las tasas del hotel o resort, que varían por destino y temporada.
Una vez emitida, la invitación debe registrarse en 30 días; los impuestos y tasas se pagan dentro de 7 días tras el registro; desde la activación hay 18 meses para viajar.
Solo se puede usar una invitación internacional por año y no se puede repetir destino.
Los puntos permiten un ahorro parcial en hospedajes; no son efectivo y no caducan.'),
('escape-premium', 'escape', 'Escape Premium', 'El doble de experiencias para disfrutar y regalar',
 'Dos escapadas nacionales de 3 días y 2 noches para 2 personas con desayuno, dos invitaciones hoteleras internacionales y 1.000 puntos.',
 398.00, true, 24, 2, 3, 2, 2, true, 2, 1000, '/media/experiencia-internacional.jpg', 'Más experiencias', 3,
 'Vigencia de 24 meses desde el pago aprobado para solicitar las escapadas nacionales y las invitaciones hoteleras internacionales.
Destinos nacionales: Quito, Guayaquil, Manta, Cuenca y Loja, en los hoteles del catálogo vigente, con desayuno.
Invitaciones hoteleras internacionales: más de 130 destinos, desde 4 días y 3 noches hasta 8 días y 7 noches según destino. Fee de emisión US$0 en este paquete. El viajero paga los impuestos gubernamentales y las tasas del hotel o resort.
Una invitación por año, sin repetir destino. Las dos invitaciones no pueden usarse en el mismo destino (no pueden viajar 4 personas al mismo destino). El incumplimiento de esta regla puede anular todos los certificados.
Desde la activación de cada invitación hay 18 meses para viajar.
Cada experiencia se puede regalar por separado; los puntos se regalan completos.
Los puntos permiten un ahorro parcial en hospedajes; no son efectivo y no caducan.'),
('puntos-250', 'points', 'Tu Próximo Viaje', '250 puntos para ahorrar en hoteles',
 'Una tarjeta de 250 puntos para obtener un ahorro parcial en tus próximas reservas de hotel.',
 25.00, true, null, 0, null, null, null, false, 0, 250, '/media/activacion-playa.jpg', null, 10,
 'Los puntos permiten un ahorro parcial en hospedajes; no son efectivo ni saldo para pagar una reserva completa.
Los puntos no caducan. La acreditación en BookVipPoints se realiza manualmente tras confirmar el pago.'),
('puntos-500', 'points', 'Viaja Más', '500 puntos para ahorrar en hoteles',
 'Una tarjeta de 500 puntos para obtener un ahorro parcial en tus próximas reservas de hotel.',
 50.00, true, null, 0, null, null, null, false, 0, 500, '/media/experiencia-nacional.jpg', null, 11,
 'Los puntos permiten un ahorro parcial en hospedajes; no son efectivo ni saldo para pagar una reserva completa.
Los puntos no caducan. La acreditación en BookVipPoints se realiza manualmente tras confirmar el pago.'),
('puntos-1000', 'points', 'Explora el Mundo', '1.000 puntos para ahorrar en hoteles',
 'Una tarjeta de 1.000 puntos para obtener un ahorro parcial en tus próximas reservas de hotel.',
 100.00, true, null, 0, null, null, null, false, 0, 1000, '/media/experiencia-internacional.jpg', null, 12,
 'Los puntos permiten un ahorro parcial en hospedajes; no son efectivo ni saldo para pagar una reserva completa.
Los puntos no caducan. La acreditación en BookVipPoints se realiza manualmente tras confirmar el pago.');
