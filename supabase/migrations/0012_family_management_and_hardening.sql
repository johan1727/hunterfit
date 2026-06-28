-- Migration: 0012_family_management_and_hardening
-- (c) Hardening: fijar search_path en update_streak (grant_xp ya lo tenía).
-- (b) Gestión avanzada del plan Familiar: salir del grupo, quitar miembro, y
--     personaje activo en get_family_members (para mostrar el avatar del cazador).
-- Aplicada vía MCP el 2026-06-27.

-- (c) hardening
alter function hunterfit.update_streak() set search_path = hunterfit;

-- (b) get_family_members con personaje activo
drop function if exists hunterfit.get_family_members();
create function hunterfit.get_family_members()
returns table (user_id uuid, username text, joined_at timestamptz, is_owner boolean, character_slug text)
language plpgsql security definer set search_path = hunterfit as $$
declare
  v_group_id bigint;
  v_owner uuid;
begin
  select group_id into v_group_id from family_members where family_members.user_id = auth.uid() limit 1;
  if v_group_id is null then return; end if;
  select owner_id into v_owner from family_groups where id = v_group_id;
  return query
    select m.user_id, p.username, m.joined_at, (m.user_id = v_owner), c.slug
    from family_members m
    left join profiles p on p.id = m.user_id
    left join characters c on c.id = p.active_character_id
    where m.group_id = v_group_id order by m.joined_at;
end;
$$;
grant execute on function hunterfit.get_family_members() to authenticated;

-- (b) salir del grupo (miembro no-dueño): pierde el premium del plan familiar
create or replace function hunterfit.leave_family()
returns void language plpgsql security definer set search_path = hunterfit as $$
declare
  v_group_id bigint;
  v_owner uuid;
begin
  select group_id into v_group_id from family_members where family_members.user_id = auth.uid() limit 1;
  if v_group_id is null then raise exception 'No perteneces a ningún grupo'; end if;
  select owner_id into v_owner from family_groups where id = v_group_id;
  if v_owner = auth.uid() then raise exception 'El dueño no puede salir; cancela el plan Familiar'; end if;
  delete from family_members where user_id = auth.uid() and group_id = v_group_id;
  update profiles set is_premium = false, is_family = false, plan_id = null, plan_source = null
    where id = auth.uid() and plan_source = 'family_invite';
end;
$$;
grant execute on function hunterfit.leave_family() to authenticated;

-- (b) quitar miembro (solo dueño): el miembro pierde el premium del plan
create or replace function hunterfit.remove_family_member(target uuid)
returns void language plpgsql security definer set search_path = hunterfit as $$
declare
  v_group_id bigint;
begin
  select id into v_group_id from family_groups where owner_id = auth.uid();
  if v_group_id is null then raise exception 'No eres dueño de un grupo Familiar'; end if;
  if target = auth.uid() then raise exception 'No puedes quitarte a ti mismo'; end if;
  delete from family_members where user_id = target and group_id = v_group_id;
  update profiles set is_premium = false, is_family = false, plan_id = null, plan_source = null
    where id = target and plan_source = 'family_invite';
end;
$$;
grant execute on function hunterfit.remove_family_member(uuid) to authenticated;
