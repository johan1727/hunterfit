-- 0008_missing_tables.sql
-- Agrega tablas, RPCs y bucket que el código espera pero no están en el schema

-- ============ BADGES (catálogo público) ============
create table if not exists badges (
  id serial primary key,
  slug text unique not null,
  name_es text not null,
  description_es text not null,
  icon text not null default '🏅',
  category text not null default 'general',
  xp_reward integer not null default 50,
  rarity text not null default 'common'
    check (rarity in ('common','rare','epic','legendary'))
);

create table if not exists user_badges (
  id serial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  badge_id integer not null references badges(id),
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

alter table badges enable row level security;
alter table user_badges enable row level security;
do $$ begin
  create policy "read badges" on badges for select to authenticated using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "own user_badges" on user_badges for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Seed: definiciones de badges (slugs que usa badges.ts)
insert into badges (slug, name_es, description_es, icon, category, xp_reward, rarity) values
  ('first_workout',  'Primera misión',        'Completa tu primer entrenamiento',      '⚔️',  'workout',  100, 'common'),
  ('workouts_10',    'Guerrero constante',     '10 entrenamientos completados',         '🔥',  'workout',  200, 'common'),
  ('workouts_50',    'Cazador dedicado',       '50 entrenamientos completados',         '💪',  'workout',  500, 'rare'),
  ('workouts_100',   'Leyenda del gimnasio',   '100 entrenamientos completados',        '🏆',  'workout', 1000, 'epic'),
  ('sets_100',       'Rey de las series',      '100 series completadas',                '💯',  'workout',  300, 'common'),
  ('volume_10k',     'Volumen máximo',         '10,000 kg de volumen total levantado',  '🦾',  'workout',  500, 'rare'),
  ('streak_3',       'Racha de fuego',         '3 días consecutivos activo',            '🔥',  'streak',   150, 'common'),
  ('streak_7',       'Semana perfecta',        '7 días consecutivos activo',            '⚡',  'streak',   300, 'rare'),
  ('streak_30',      'Mes imparable',          '30 días consecutivos activo',           '💥',  'streak',   800, 'epic'),
  ('streak_100',     'Centurión',              '100 días consecutivos activo',          '👑',  'streak',  2000, 'legendary'),
  ('first_meal',     'Primera comida',         'Registra tu primera comida',            '🍽️',  'nutrition', 50, 'common'),
  ('meals_7days',    'Nutrición constante',    '7 días registrando comidas',            '🥗',  'nutrition', 200, 'common'),
  ('meals_30days',   'Dieta maestra',          '30 días registrando comidas',           '🧬',  'nutrition', 600, 'rare'),
  ('recipes_5',      'Chef cazador',           '5 recetas generadas con IA',            '👨‍🍳', 'nutrition', 250, 'rare'),
  ('level_5',        'Nivel 5',               'Alcanza el nivel 5',                    '⭐',  'level',    200, 'common'),
  ('level_10',       'Nivel 10',              'Alcanza el nivel 10',                   '🌟',  'level',    400, 'rare'),
  ('level_25',       'Nivel 25',              'Alcanza el nivel 25',                   '💫',  'level',   1000, 'epic'),
  ('steps_10k',      '10K pasos',             '10,000 pasos en un día',                '🚶',  'steps',    150, 'common'),
  ('steps_50k',      'Maratonista',           '50,000 pasos acumulados',               '🏃',  'steps',    400, 'rare'),
  ('rank_d',         'Rango D',               'Alcanza el Rango D',                    '🔵',  'rank',     300, 'common'),
  ('rank_c',         'Rango C',               'Alcanza el Rango C',                    '🟣',  'rank',     600, 'rare'),
  ('rank_b',         'Rango B',               'Alcanza el Rango B',                    '🟠',  'rank',    1000, 'epic'),
  ('rank_a',         'Rango A',               'Alcanza el Rango A',                    '🔴',  'rank',    2000, 'epic'),
  ('rank_s',         'Rango S',               'Alcanza el Rango S — el máximo',        '✨',  'rank',    5000, 'legendary'),
  ('top_10',         'Top 10',                'Entra al top 10 del leaderboard',       '🏅',  'social',   500, 'rare'),
  ('top_1',          'El Mejor Cazador',      'Llega al #1 del leaderboard',           '🥇',  'social',  2000, 'legendary')
on conflict (slug) do nothing;

-- ============ SHOPPING ITEMS ============
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  qty_g numeric(7,1),
  category text not null default 'general',
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table shopping_items enable row level security;
do $$ begin
  create policy "own shopping_items" on shopping_items for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- ============ PROGRESS PHOTOS ============
create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null,
  note text,
  weight_kg numeric(5,1),
  taken_at timestamptz not null default now()
);

alter table progress_photos enable row level security;
do $$ begin
  create policy "own progress_photos" on progress_photos for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- ============ FOODS.ICON (columna para emojis) ============
alter table foods add column if not exists icon text;

-- ============ STORAGE BUCKET hunterfit-body-photos ============
insert into storage.buckets (id, name, public)
  values ('hunterfit-body-photos', 'hunterfit-body-photos', false)
on conflict (id) do nothing;

do $$ begin
  create policy "own hunterfit body photos" on storage.objects for all to authenticated
    using (
      bucket_id = 'hunterfit-body-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'hunterfit-body-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null;
end $$;

-- ============ RPC get_leaderboard ============
create or replace function get_leaderboard(limit_n integer default 50)
returns table (
  user_id uuid,
  username text,
  rank hunter_rank,
  level integer,
  xp integer,
  streak_days integer,
  badge_count bigint
)
language sql security definer set search_path = public as $$
  select
    p.id as user_id,
    p.username,
    p.rank,
    p.level,
    p.xp,
    p.streak_days,
    count(ub.id) as badge_count
  from profiles p
  left join user_badges ub on ub.user_id = p.id
  where p.username is not null
  group by p.id, p.username, p.rank, p.level, p.xp, p.streak_days
  order by p.xp desc
  limit limit_n;
$$;
