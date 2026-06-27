-- Migration: workout_sets_tracking
-- Run in Supabase SQL Editor (hunterfit schema)

-- Add unique constraint to foods for upserts
alter table hunterfit.foods
  add column if not exists sodium_mg numeric(8,2),
  add column if not exists sugar_g   numeric(6,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'foods_name_es_key'
      and conrelid = 'hunterfit.foods'::regclass
  ) then
    alter table hunterfit.foods add constraint foods_name_es_key unique (name_es);
  end if;
end $$;

-- workout_sets: per-set tracking per session
create table if not exists hunterfit.workout_sets (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_id   text not null,
  routine_id   text not null,
  exercise_id  integer not null,
  set_number   integer not null,
  reps_done    integer,
  weight_kg    numeric(6,2),
  seconds_done integer,
  completed    boolean not null default true,
  logged_at    timestamptz not null default now()
);

create index if not exists workout_sets_user_idx     on hunterfit.workout_sets(user_id, logged_at desc);
create index if not exists workout_sets_exercise_idx on hunterfit.workout_sets(user_id, exercise_id, logged_at desc);

alter table hunterfit.workout_sets enable row level security;

drop policy if exists "user_own_sets" on hunterfit.workout_sets;
create policy "user_own_sets" on hunterfit.workout_sets
  for all using (auth.uid() = user_id);

-- Add session_id + duration to workout_sessions
alter table hunterfit.workout_sessions
  add column if not exists session_id       text,
  add column if not exists duration_seconds integer;
