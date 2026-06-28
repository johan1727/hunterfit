-- Migration: 0010_premium_entitlements_and_family
-- Entitlements de suscripción + plan Familiar con invitaciones por código.
-- Scaffolding para enchufar RevenueCat después (sin SDK).
-- Aplicada vía MCP el 2026-06-27.

-- 1) Columnas de entitlement en profiles
alter table hunterfit.profiles
  add column if not exists is_family       boolean      not null default false,
  add column if not exists plan_id         text,
  add column if not exists plan_expires_at timestamptz,
  add column if not exists plan_source     text;  -- 'mock' | 'revenuecat' | 'family_invite'

-- 2) Historial de suscripciones
create table if not exists hunterfit.subscriptions (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  plan_id     text not null,
  source      text not null default 'mock',
  status      text not null default 'active',
  started_at  timestamptz not null default now(),
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on hunterfit.subscriptions(user_id, created_at desc);
alter table hunterfit.subscriptions enable row level security;

-- 3) Tablas de familia
create table if not exists hunterfit.family_groups (
  id          bigserial primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  plan_id     text not null,
  max_members integer not null default 6,
  created_at  timestamptz not null default now(),
  unique (owner_id)
);
alter table hunterfit.family_groups enable row level security;

create table if not exists hunterfit.family_members (
  id        bigserial primary key,
  group_id  bigint not null references hunterfit.family_groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (user_id)
);
create index if not exists family_members_group_idx on hunterfit.family_members(group_id);
alter table hunterfit.family_members enable row level security;

create table if not exists hunterfit.family_invites (
  id         bigserial primary key,
  group_id   bigint not null references hunterfit.family_groups(id) on delete cascade,
  code       text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  used_by    uuid references auth.users(id) on delete set null,
  used_at    timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
create index if not exists family_invites_code_idx on hunterfit.family_invites(code);
alter table hunterfit.family_invites enable row level security;

-- 4) Policies (todas las tablas ya existen)
drop policy if exists "own_subscriptions" on hunterfit.subscriptions;
create policy "own_subscriptions" on hunterfit.subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "read_family_groups" on hunterfit.family_groups;
create policy "read_family_groups" on hunterfit.family_groups for select
  using (auth.uid() = owner_id or exists (
    select 1 from hunterfit.family_members m where m.group_id = id and m.user_id = auth.uid()
  ));

drop policy if exists "read_family_members" on hunterfit.family_members;
create policy "read_family_members" on hunterfit.family_members for select
  using (exists (
    select 1 from hunterfit.family_groups g where g.id = group_id and g.owner_id = auth.uid()
  ) or user_id = auth.uid());

drop policy if exists "owner_read_invites" on hunterfit.family_invites;
create policy "owner_read_invites" on hunterfit.family_invites for select
  using (auth.uid() = created_by);

-- 5) RPC: crear/asegurar grupo familiar + emitir código de invitación
create or replace function hunterfit.create_family_invite()
returns text
language plpgsql security definer set search_path = hunterfit as $$
declare
  v_group_id bigint;
  v_plan text;
  v_code text;
  v_count int;
begin
  select plan_id into v_plan from profiles where id = auth.uid();
  if v_plan is null or v_plan not like 'family_%' then
    raise exception 'Necesitas un plan Familiar activo';
  end if;
  select id into v_group_id from family_groups where owner_id = auth.uid();
  if v_group_id is null then
    insert into family_groups (owner_id, plan_id) values (auth.uid(), v_plan)
    returning id into v_group_id;
    insert into family_members (group_id, user_id) values (v_group_id, auth.uid())
    on conflict (user_id) do nothing;
  end if;
  select count(*) into v_count from family_members where group_id = v_group_id;
  if v_count >= (select max_members from family_groups where id = v_group_id) then
    raise exception 'El grupo familiar ya está lleno';
  end if;
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  insert into family_invites (group_id, code, created_by) values (v_group_id, v_code, auth.uid());
  return v_code;
end;
$$;

-- 6) RPC: canjear código → unirse al grupo + obtener premium
create or replace function hunterfit.redeem_family_invite(invite_code text)
returns jsonb
language plpgsql security definer set search_path = hunterfit as $$
declare
  v_inv family_invites%rowtype;
  v_group family_groups%rowtype;
  v_count int;
begin
  select * into v_inv from family_invites where code = upper(invite_code);
  if not found then raise exception 'Código inválido'; end if;
  if v_inv.used_by is not null then raise exception 'Código ya usado'; end if;
  if v_inv.expires_at < now() then raise exception 'Código expirado'; end if;
  select * into v_group from family_groups where id = v_inv.group_id;
  select count(*) into v_count from family_members where group_id = v_group.id;
  if v_count >= v_group.max_members then raise exception 'El grupo familiar está lleno'; end if;
  insert into family_members (group_id, user_id) values (v_group.id, auth.uid())
  on conflict (user_id) do nothing;
  update profiles set is_premium = true, is_family = true, plan_id = v_group.plan_id, plan_source = 'family_invite'
  where id = auth.uid();
  update family_invites set used_by = auth.uid(), used_at = now() where id = v_inv.id;
  return jsonb_build_object('success', true, 'plan_id', v_group.plan_id);
end;
$$;

-- 7) Grants
grant usage, select on all sequences in schema hunterfit to authenticated;
grant select, insert, update, delete on all tables in schema hunterfit to authenticated;
grant execute on function hunterfit.create_family_invite() to authenticated;
grant execute on function hunterfit.redeem_family_invite(text) to authenticated;
