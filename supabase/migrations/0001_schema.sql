-- HunterFit — Schema principal
-- Ejecutar en Supabase: SQL Editor → pegar y correr, o `supabase db push`

-- ============ ENUMS ============
create type hunter_rank as enum ('E','D','C','B','A','S');
create type exercise_category as enum ('strength','cardio','flexibility');
create type meal_type as enum ('desayuno','comida','cena','snack');
create type fitness_level as enum ('principiante','intermedio','avanzado');
create type user_goal as enum ('definicion','masa','agilidad','movilidad','fuerza','general');
create type log_source as enum ('manual','ai_photo');

-- ============ CHARACTERS (catálogo público) ============
create table characters (
  id serial primary key,
  slug text unique not null,
  name text not null,
  title text not null,
  archetype user_goal not null,
  description_es text not null,
  attributes jsonb not null default '{}',          -- {str, agi, vit, sta} 1-10 para mostrar
  routine_bias jsonb not null,                      -- {strength: 0.7, cardio: 0.2, flexibility: 0.1}
  unlock_rank hunter_rank not null default 'E'
);

-- ============ PROFILES ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  rank hunter_rank not null default 'E',
  xp integer not null default 0,
  level integer not null default 1,
  streak_days integer not null default 0,
  last_activity_date date,
  active_character_id integer references characters(id),
  is_premium boolean not null default false,
  sex text check (sex in ('m','f','otro')),
  age integer check (age between 13 and 100),
  height_cm numeric(5,1),
  weight_kg numeric(5,1),
  activity_level text check (activity_level in ('sedentario','ligero','moderado','activo','muy_activo')),
  goal user_goal default 'general',
  training_days_per_week integer default 3 check (training_days_per_week between 1 and 7),
  fitness_level fitness_level default 'principiante',
  calorie_target integer,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  body_analysis jsonb,                              -- resultado de analyze-body
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- Crear perfil automáticamente al registrarse
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============ EXERCISES (catálogo público) ============
create table exercises (
  id serial primary key,
  slug text unique not null,
  name_es text not null,
  category exercise_category not null,
  muscle_groups text[] not null default '{}',       -- pecho, espalda, piernas, gluteos, hombros, brazos, core, full_body
  equipment text not null default 'ninguno',        -- ninguno, mancuernas, barra, banda, maquina
  difficulty integer not null check (difficulty between 1 and 4),
  instructions_es text not null,
  default_sets integer,
  default_reps integer,
  default_seconds integer,                          -- para cardio/isométricos
  rest_seconds integer not null default 60,
  met_value numeric(3,1) not null default 4.0       -- para estimar calorías quemadas
);

-- ============ ROUTINES ============
create table routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  character_id integer not null references characters(id),
  level integer not null default 1,
  day_index integer not null,                       -- 0..n-1 dentro del plan semanal
  name text not null,
  focus text not null,                              -- ej. "Fuerza — Empuje", "HIIT", "Movilidad"
  created_at timestamptz not null default now()
);

create table routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines(id) on delete cascade,
  exercise_id integer not null references exercises(id),
  position integer not null,
  sets integer not null,
  reps integer,
  seconds integer,
  rest_seconds integer not null default 60
);

-- ============ WORKOUT SESSIONS ============
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  routine_id uuid references routines(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  xp_earned integer not null default 0,
  exercises_completed jsonb not null default '[]'   -- [{exercise_id, sets_done, reps_done[]}]
);

-- ============ QUESTS (misiones diarias) ============
create table quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null default current_date,
  description_es text not null,
  type text not null,                               -- workout, exercise_count, log_meals, steps
  target integer not null,
  progress integer not null default 0,
  completed boolean not null default false,
  xp_reward integer not null default 50,
  unique (user_id, date, description_es)
);

-- ============ FOODS (catálogo público) ============
create table foods (
  id serial primary key,
  name_es text not null,
  brand text,
  category text not null,                           -- fruta, verdura, cereal, proteina, lacteo, leguminosa, grasa, bebida, platillo, snack
  serving_g numeric(7,1) not null default 100,
  kcal numeric(7,1) not null,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  fiber_g numeric(6,1) not null default 0
);
create index foods_name_idx on foods using gin (to_tsvector('spanish', name_es));

-- ============ MEAL LOGS ============
create table meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null default current_date,
  meal_type meal_type not null,
  food_id integer references foods(id),
  custom_name text,                                 -- cuando viene de IA o entrada libre
  quantity_g numeric(7,1) not null,
  kcal numeric(7,1) not null,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  source log_source not null default 'manual',
  created_at timestamptz not null default now()
);
create index meal_logs_user_date_idx on meal_logs (user_id, date);

-- ============ RLS ============
alter table profiles enable row level security;
alter table routines enable row level security;
alter table routine_exercises enable row level security;
alter table workout_sessions enable row level security;
alter table quests enable row level security;
alter table meal_logs enable row level security;
alter table characters enable row level security;
alter table exercises enable row level security;
alter table foods enable row level security;

-- Catálogos: lectura pública (usuarios autenticados)
create policy "read characters" on characters for select to authenticated using (true);
create policy "read exercises" on exercises for select to authenticated using (true);
create policy "read foods" on foods for select to authenticated using (true);

-- Datos propios: CRUD solo del dueño
create policy "own profile select" on profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on profiles for update to authenticated using (id = auth.uid());

create policy "own routines" on routines for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own routine_exercises" on routine_exercises for all to authenticated
  using (exists (select 1 from routines r where r.id = routine_id and r.user_id = auth.uid()))
  with check (exists (select 1 from routines r where r.id = routine_id and r.user_id = auth.uid()));
create policy "own sessions" on workout_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own quests" on quests for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own meals" on meal_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ STORAGE BUCKETS ============
insert into storage.buckets (id, name, public) values
  ('body-photos', 'body-photos', false),
  ('food-photos', 'food-photos', false);

create policy "own body photos" on storage.objects for all to authenticated
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own food photos" on storage.objects for all to authenticated
  using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============ XP / RANGOS ============
create function rank_for_xp(xp integer) returns hunter_rank
language sql immutable as $$
  select case
    when xp >= 15000 then 'S'::hunter_rank
    when xp >= 7000  then 'A'::hunter_rank
    when xp >= 3500  then 'B'::hunter_rank
    when xp >= 1500  then 'C'::hunter_rank
    when xp >= 500   then 'D'::hunter_rank
    else 'E'::hunter_rank
  end;
$$;

-- RPC atómico para otorgar XP y recalcular rango/nivel/racha
create function grant_xp(amount integer) returns profiles
language plpgsql security definer set search_path = public as $$
declare p profiles;
begin
  update profiles set
    xp = xp + amount,
    level = 1 + (xp + amount) / 250,
    rank = rank_for_xp(xp + amount),
    streak_days = case
      when last_activity_date = current_date then streak_days
      when last_activity_date = current_date - 1 then streak_days + 1
      else 1
    end,
    last_activity_date = current_date
  where id = auth.uid()
  returning * into p;
  return p;
end; $$;
