-- Migration: 0016_apply_entitlement_besteffort_history
-- El insert en subscriptions es historial best-effort: antes del RPC (cliente)
-- un fallo del historial NO bloqueaba la compra. 0015 lo hizo transaccional;
-- esto restaura la semantica original — el grant de premium nunca se revierte
-- por un fallo del insert de historial.

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
    -- Historial best-effort: no bloquea la compra si falla.
    begin
      insert into subscriptions (user_id, plan_id, source, status, expires_at)
      values (v_uid, p_plan_id, p_source, 'active', p_expires_at);
    exception when others then null;
    end;
  else
    -- Restore: reactivar premium sin conocer el plan exacto.
    update profiles set is_premium = true, plan_source = p_source
    where id = v_uid;
  end if;
end;
$$;
