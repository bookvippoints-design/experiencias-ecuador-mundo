-- Puntos de regalo por compra PAUSADOS (2026-10-20). Para reactivarlos:
--   alter table public.orders enable trigger orders_bonus_points;
-- y volver a poner los textos (ver migración 021) y BONUS_POINTS_ENABLED = true.
alter table public.orders disable trigger orders_bonus_points;
-- Los mensajes de ensure_purchase_window, access_reactivate y admin_extend_purchase_window
-- se actualizaron para no mencionar los puntos de regalo.
