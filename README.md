# Experiencias Ecuador y el Mundo

*Para disfrutar y regalar.* Catálogo privado de experiencias de viaje y regalos al que las empresas dan acceso a sus clientes o colaboradores.

Proyecto independiente, construido a partir de la estructura de Escape Ecuador y el Mundo, con base de datos, repositorio y publicación propios.

## Portales
- **Administración** (`/admin`): empresas y cupos, compras de cupos, pedidos y pagos (entrega de regalos), regalos, beneficios, reservas, catálogo editable y usuarios.
- **Empresas** (`/empresa`): cupos comprados/utilizados/disponibles, crear usuarios e invitarlos, reenviar invitaciones, comprar planes, logo. No ve compras ni reservas de sus usuarios.
- **Usuarios** (`/cuenta`): catálogo, comparación, detalle, compra para sí o para regalar, mis experiencias con cuenta regresiva, regalos, puntos, reservas y pedidos.

## Stack
Next.js 15 · Supabase (Auth + Postgres con RLS) · @react-pdf (tarjeta de regalo) · nodemailer (SMTP propio) · PayPhone (enlaces de pago + reporte manual).

## Base de datos
Migraciones en `supabase/migrations`. Toda escritura pasa por funciones `SECURITY DEFINER` que validan rol y bloquean filas; las tablas solo permiten lectura vía RLS. `supabase/tests/db_flows_test.sql` prueba cupos, pagos, regalos, reglas internacionales y permisos (se ejecuta y revierte todo).

## Variables de entorno
Ver `.env.example`.
