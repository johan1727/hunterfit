-- Migration: 0015_lockdown_profiles_badges_adhoc
-- (Aplicada al proyecto mrabsfuwprxisgxfqnuy vía MCP el 2026-07-02.)
-- Seguridad: (1) policy UPDATE de profiles con USING + WITH CHECK,
-- (2) lock de columnas sensibles de profiles a nivel de privilegios de columna,
-- (3) RPC apply_entitlement como unica via de escritura de entitlements,
-- (4) user_badges deja de ser legible por todos (get_leaderboard es SECURITY DEFINER
--     owner postgres, asi que el badge_count global sigue funcionando),
-- (5) guardas idempotentes para tablas creadas ad hoc (no-op en el DB vivo,
--     protegen entornos nuevos).

-- ============ 1) PROFILES: policies ============
drop policy if exists "own profile update" on hunterfit.profiles;
create policy "own profile update" on hunterfit.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

do $$ begin
  create policy "own profile insert" on hunterfit.profiles
    for insert to authenticated
    with check (id = (select auth.uid()));
exception when duplicate_object then null; end $$;

-- ============ 2) PROFILES: privilegios por columna ============
-- Sensibles (sin UPDATE/INSERT para authenticated): rank, xp, level,
-- streak_days, last_activity_date, last_active_date, is_premium, is_family,
-- plan_id, plan_expires_at, plan_source, created_at.
revoke insert, update on hunterfit.profiles from authenticated;

grant update (id, username, active_character_id, sex, age, height_cm, weight_kg,
              activity_level, goal, training_days_per_week, fitness_level,
              calorie_target, protein_g, carbs_g, fat_g, body_analysis,
              onboarding_complete)
  on hunterfit.profiles to authenticated;

grant insert (id, username, active_character_id, sex, age, height_cm, weight_kg,
              activity_level, goal, training_days_per_week, fitness_level,
              calorie_target, protein_g, carbs_g, fat_g, body_analysis,
              onboarding_complete)
  on hunterfit.profiles to authenticated;

-- Nota: grant_xp/update_streak/redeem_family_invite/leave_family/
-- remove_family_member/cancel_family_plan son SECURITY DEFINER con owner
-- postgres (verificado en vivo): no les afecta este revoke.

-- ============ 3) RPC apply_entitlement ============
create or replace function hunterfit.apply_entitlement(
  p_plan_id text,
  p_expires_at timestamptz,
  p_source text default 'mock'
) returns void
language plpgsql security definer set search_path = hunterfit as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_source not in ('mock', 'revenuecat') then
    raise exception 'Origen invalido: %', p_source;
  end if;

  if p_plan_id is not null then
    if p_plan_id not in ('normal_monthly','normal_annual','family_monthly','family_annual') then
      raise exception 'Plan desconocido: %', p_plan_id;
    end if;
    update profiles set
      is_premium      = true,
      is_family       = (p_plan_id like 'family_%'),
      plan_id         = p_plan_id,
      plan_source     = p_source,
      plan_expires_at = p_expires_at
    where id = v_uid;
    insert into subscriptions (user_id, plan_id, source, status, expires_at)
    values (v_uid, p_plan_id, p_source, 'active', p_expires_at);
  else
    -- Restore: reactivar premium sin conocer el plan exacto.
    update profiles set is_premium = true, plan_source = p_source
    where id = v_uid;
  end if;
end;
$$;

revoke execute on function hunterfit.apply_entitlement(text, timestamptz, text) from public;
revoke execute on function hunterfit.apply_entitlement(text, timestamptz, text) from anon;
grant execute on function hunterfit.apply_entitlement(text, timestamptz, text) to authenticated;

-- ============ 4) USER_BADGES: fuera el SELECT publico ============
drop policy if exists "read_user_badges" on hunterfit.user_badges;
drop policy if exists "own user_badges" on hunterfit.user_badges;
drop policy if exists "user_badges_select_own" on hunterfit.user_badges;
create policy "user_badges_select_own" on hunterfit.user_badges
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "insert_user_badges" on hunterfit.user_badges;
create policy "insert_user_badges" on hunterfit.user_badges
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ============ 5) Tablas ad hoc: RLS + policy dueno si faltaran ============
do $$
declare
  t text;
begin
  foreach t in array array['water_logs','weight_logs','favorite_meals','meal_plans'] loop
    if to_regclass('hunterfit.' || t) is not null then
      execute format('alter table hunterfit.%I enable row level security', t);
      if not exists (
        select 1 from pg_policies where schemaname = 'hunterfit' and tablename = t
      ) then
        execute format(
          'create policy %I on hunterfit.%I for all to authenticated '
          || 'using (user_id = (select auth.uid())) '
          || 'with check (user_id = (select auth.uid()))',
          'own_' || t, t);
      end if;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
