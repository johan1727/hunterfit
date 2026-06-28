-- Migration: 0014_harden_leaderboard
-- Cierra los 2 únicos advisors de seguridad accionables que quedaban en hunterfit:
--   1. get_leaderboard tenía search_path mutable (riesgo en SECURITY DEFINER).
--   2. get_leaderboard era ejecutable por el rol `anon` (las demás RPC ya no).
-- El resto de funciones ya estaban con `set search_path = hunterfit` y solo
-- `authenticated`. Aplicada vía MCP el 2026-06-28.

create or replace function hunterfit.get_leaderboard(limit_n integer default 50)
returns table(user_id uuid, username text, rank text, level integer, xp integer, streak_days integer, badge_count bigint)
language sql security definer set search_path = hunterfit as $$
  select
    p.id as user_id,
    coalesce(p.username, 'Cazador #' || substr(p.id::text, 1, 6)) as username,
    p.rank, p.level, p.xp, p.streak_days,
    count(ub.id) as badge_count
  from hunterfit.profiles p
  left join hunterfit.user_badges ub on ub.user_id = p.id
  where p.onboarding_complete = true
  group by p.id, p.username, p.rank, p.level, p.xp, p.streak_days
  order by p.xp desc
  limit limit_n;
$$;

-- Solo usuarios autenticados ven el leaderboard (igual que el resto de RPC).
revoke execute on function hunterfit.get_leaderboard(integer) from anon;
grant execute on function hunterfit.get_leaderboard(integer) to authenticated;
