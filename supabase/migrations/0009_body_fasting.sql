-- HunterFit — Migration 0009: body_measurements + fasting_logs

-- Body measurements (waist, hips, chest, arm, body fat %)
create table if not exists hunterfit.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  taken_at date not null default current_date,
  weight_kg numeric(5,2),
  waist_cm numeric(5,1),
  hips_cm numeric(5,1),
  chest_cm numeric(5,1),
  arm_cm numeric(5,1),
  body_fat_pct numeric(4,1),
  notes text,
  created_at timestamptz default now()
);

alter table hunterfit.body_measurements enable row level security;

do $$ begin
  create policy "body_measurements_own" on hunterfit.body_measurements
    for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists body_measurements_user_date
  on hunterfit.body_measurements(user_id, taken_at desc);

-- Fasting logs
create table if not exists hunterfit.fasting_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  target_hours integer not null default 16,
  completed boolean default false,
  created_at timestamptz default now()
);

alter table hunterfit.fasting_logs enable row level security;

do $$ begin
  create policy "fasting_logs_own" on hunterfit.fasting_logs
    for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists fasting_logs_user_started
  on hunterfit.fasting_logs(user_id, started_at desc);
