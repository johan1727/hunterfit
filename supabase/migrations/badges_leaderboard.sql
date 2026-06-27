-- Migration: badges + leaderboard
-- Ejecutar en Supabase SQL Editor

-- ── BADGES (definiciones globales) ───────────────────────────────────────────
create table if not exists hunterfit.badges (
  id          serial primary key,
  slug        text not null unique,
  name_es     text not null,
  description_es text not null,
  icon        text not null,           -- emoji
  category    text not null default 'general', -- 'workout'|'nutrition'|'streak'|'level'|'social'
  xp_reward   integer not null default 0,
  rarity      text not null default 'common' -- 'common'|'rare'|'epic'|'legendary'
);

-- ── USER_BADGES (logros ganados) ──────────────────────────────────────────────
create table if not exists hunterfit.user_badges (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  badge_id   integer not null references hunterfit.badges(id),
  earned_at  timestamptz not null default now(),
  unique(user_id, badge_id)
);

create index if not exists user_badges_user_idx on hunterfit.user_badges(user_id, earned_at desc);

alter table hunterfit.badges enable row level security;
alter table hunterfit.user_badges enable row level security;

create policy "read_badges" on hunterfit.badges for select using (true);
create policy "read_user_badges" on hunterfit.user_badges for select using (true);
create policy "insert_user_badges" on hunterfit.user_badges for insert with check (auth.uid() = user_id);

-- ── LEADERBOARD FUNCTION ──────────────────────────────────────────────────────
create or replace function hunterfit.get_leaderboard(limit_n integer default 50)
returns table (
  user_id uuid, username text, rank text, level integer, xp integer,
  streak_days integer, badge_count bigint
)
language sql security definer
as $$
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

grant execute on function hunterfit.get_leaderboard to anon, authenticated, service_role;

-- ── SEED: badge definitions ───────────────────────────────────────────────────
insert into hunterfit.badges (slug, name_es, description_es, icon, category, xp_reward, rarity) values
-- Workout
('first_workout',    'Primer combate',        'Completa tu primer entrenamiento',              '⚔️',  'workout',   50,  'common'),
('workouts_10',      'Guerrero en formación', 'Completa 10 entrenamientos',                    '🏋️',  'workout',  100, 'common'),
('workouts_50',      'Veterano del gym',      'Completa 50 entrenamientos',                    '💪',  'workout',  250, 'rare'),
('workouts_100',     'Leyenda del hierro',    'Completa 100 entrenamientos',                   '🦾',  'workout',  500, 'epic'),
('sets_100',         'Centurión',             'Registra 100 series en total',                  '🔢',  'workout',  100, 'common'),
('volume_10k',       'Tonelada de fuerza',    'Mueve 10,000 kg de volumen total',              '🏔️',  'workout',  200, 'rare'),
-- Streak
('streak_3',         'En racha',              'Mantén una racha de 3 días',                    '🔥',  'streak',    30, 'common'),
('streak_7',         'Semana perfecta',       'Mantén una racha de 7 días',                    '🔥🔥','streak',   100, 'common'),
('streak_30',        'Imparable',             'Mantén una racha de 30 días',                   '⚡',  'streak',   400, 'rare'),
('streak_100',       'Cazador legendario',    'Mantén una racha de 100 días',                  '👑',  'streak',  1000, 'legendary'),
-- Nutrition
('first_meal',       'Primer registro',       'Registra tu primera comida',                    '🍎',  'nutrition', 20, 'common'),
('meals_7days',      'Disciplina nutricional','Registra comidas 7 días seguidos',               '📊',  'nutrition',100, 'common'),
('meals_30days',     'Maestro nutricionista', 'Registra comidas 30 días seguidos',              '🥗',  'nutrition',300, 'rare'),
('recipes_5',        'Chef fit',              'Registra 5 recetas en tu diario',               '🍳',  'nutrition',100, 'common'),
-- Level / Rank
('level_5',          'Cazador en ascenso',    'Alcanza el nivel 5',                            '⭐',  'level',    100, 'common'),
('level_10',         'Cazador de élite',      'Alcanza el nivel 10',                           '🌟',  'level',    200, 'rare'),
('level_25',         'Maestro cazador',       'Alcanza el nivel 25',                           '💫',  'level',    500, 'epic'),
('rank_d',           'Rango D desbloqueado',  'Asciende al rango D',                           '🔷',  'level',    150, 'common'),
('rank_c',           'Rango C desbloqueado',  'Asciende al rango C',                           '🔶',  'level',    300, 'rare'),
('rank_b',           'Rango B desbloqueado',  'Asciende al rango B',                           '🟣',  'level',    600, 'epic'),
('rank_a',           'Rango A desbloqueado',  'Asciende al rango A',                           '🔴',  'level',   1000, 'epic'),
('rank_s',           'Cazador S — Élite total','Alcanza el mítico rango S',                    '👑',  'level',   2000, 'legendary'),
-- Steps
('steps_10k',        'Caminante',             'Camina 10,000 pasos en un día',                 '👟',  'workout',   50, 'common'),
('steps_50k',        'Explorador',            'Acumula 50,000 pasos en total',                 '🗺️',  'workout',  150, 'rare'),
-- Social
('top_10',           'Top 10 global',         'Aparece en el top 10 del leaderboard',          '🏆',  'social',   200, 'rare'),
('top_1',            'El más fuerte',         'Ocupa el #1 del leaderboard',                   '🥇',  'social',   500, 'legendary')
on conflict (slug) do nothing;

-- Grants para REST API
grant all on hunterfit.badges to service_role;
grant all on hunterfit.user_badges to service_role;
grant usage, select on sequence hunterfit.user_badges_id_seq to service_role;
