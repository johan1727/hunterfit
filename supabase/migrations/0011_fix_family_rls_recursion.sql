-- Migration: 0011_fix_family_rls_recursion
-- Fix de 2 bugs en el plan Familiar (detectados probando la app):
--  1) 42P17 recursión infinita: la policy read_family_members se auto-referenciaba.
--  2) PGRST200: el embed profiles(username) no tenía FK family_members->profiles.
-- Solución: policies no-recursivas (cada quien ve su propia fila / su grupo) +
-- RPC SECURITY DEFINER que lista los miembros con username (bypassa RLS).
-- Aplicada vía MCP el 2026-06-27.

drop policy if exists "read_family_members" on hunterfit.family_members;
create policy "read_own_membership" on hunterfit.family_members for select
  using (user_id = auth.uid());

drop policy if exists "read_family_groups" on hunterfit.family_groups;
create policy "read_own_group" on hunterfit.family_groups for select
  using (owner_id = auth.uid());

create or replace function hunterfit.get_family_members()
returns table (user_id uuid, username text, joined_at timestamptz, is_owner boolean)
language plpgsql security definer set search_path = hunterfit as $$
declare
  v_group_id bigint;
  v_owner uuid;
begin
  select group_id into v_group_id from family_members where family_members.user_id = auth.uid() limit 1;
  if v_group_id is null then return; end if;
  select owner_id into v_owner from family_groups where id = v_group_id;
  return query
    select m.user_id, p.username, m.joined_at, (m.user_id = v_owner)
    from family_members m
    left join profiles p on p.id = m.user_id
    where m.group_id = v_group_id
    order by m.joined_at;
end;
$$;
grant execute on function hunterfit.get_family_members() to authenticated;
