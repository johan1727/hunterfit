-- Migration: 0013_body_fasting (+ cancel_family_plan)
-- Crea las tablas que la UI ya usaba pero faltaban (body-tracking + ayuno
-- crasheaban con 404) y la RPC para cancelar el plan Familiar.
-- Aplicada vía MCP el 2026-06-28. (Renumerada desde 0009 por colisión.)

create table if not exists hunterfit.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  taken_at date not null default current_date,
  weight_kg numeric(5,2), waist_cm numeric(5,1), hips_cm numeric(5,1),
  chest_cm numeric(5,1), arm_cm numeric(5,1), body_fat_pct numeric(4,1),
  notes text, created_at timestamptz default now()
);
alter table hunterfit.body_measurements enable row level security;
drop policy if exists "body_measurements_own" on hunterfit.body_measurements;
create policy "body_measurements_own" on hunterfit.body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists body_measurements_user_date on hunterfit.body_measurements(user_id, taken_at desc);

create table if not exists hunterfit.fasting_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz, target_hours integer not null default 16,
  completed boolean default false, created_at timestamptz default now()
);
alter table hunterfit.fasting_logs enable row level security;
drop policy if exists "fasting_logs_own" on hunterfit.fasting_logs;
create policy "fasting_logs_own" on hunterfit.fasting_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists fasting_logs_user_started on hunterfit.fasting_logs(user_id, started_at desc);

grant select, insert, update, delete on hunterfit.body_measurements, hunterfit.fasting_logs to authenticated;

-- Cancelar plan Familiar (dueño disuelve el grupo; invitados pierden premium)
create or replace function hunterfit.cancel_family_plan()
returns void language plpgsql security definer set search_path = hunterfit as $$
declare v_group_id bigint;
begin
  select id into v_group_id from family_groups where owner_id = auth.uid();
  if v_group_id is null then raise exception 'No eres dueño de un grupo Familiar'; end if;
  update profiles p set is_premium = false, is_family = false, plan_id = null, plan_source = null
    from family_members m
    where m.group_id = v_group_id and m.user_id = p.id
      and p.id <> auth.uid() and p.plan_source = 'family_invite';
  update profiles set is_family = false where id = auth.uid();
  delete from family_groups where id = v_group_id;
end;
$$;
grant execute on function hunterfit.cancel_family_plan() to authenticated;
