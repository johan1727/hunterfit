-- Migration: 0009_fix_authenticated_grants
-- Fix del 403 "permission denied for sequence ..._id_seq" al insertar en
-- workout_sets y user_badges desde la app (rol `authenticated`).
--
-- Causa: esas tablas usan PK bigserial, pero el rol `authenticated` no tenía
-- USAGE sobre sus secuencias. `badges_leaderboard.sql` dio grants solo a
-- `service_role`; `workout_sets_tracking.sql` no dio grants. Las RLS policies
-- (INSERT con auth.uid() = user_id) ya son correctas — esto solo habilita que el
-- rol pueda generar el id y escribir; RLS sigue restringiendo a filas propias.
--
-- Ejecutar en Supabase SQL Editor (o vía migración) sobre el schema hunterfit.

-- Secuencias: USAGE para generar ids (bigserial)
grant usage, select on all sequences in schema hunterfit to authenticated;

-- Tablas: operaciones DML (RLS sigue protegiendo por fila)
grant select, insert, update, delete on all tables in schema hunterfit to authenticated;

-- Privilegios por defecto para tablas/secuencias futuras en el schema
alter default privileges in schema hunterfit
  grant usage, select on sequences to authenticated;
alter default privileges in schema hunterfit
  grant select, insert, update, delete on tables to authenticated;
