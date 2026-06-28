# Deploy de backends rotos + cierre de pendientes — Plan

> Ejecutado en esta sesión. Verificación: REST/MCP + tsc + commit/push.

**Goal:** Desplegar los backends que faltaban (features con UI pero que crasheaban) y cerrar pendientes web-testeables.

## Hallazgo (auditoría superpowers)
Features con UI pero backend NO desplegado (404 al usarlas):
- `body-tracking` → tabla `body_measurements` faltante.
- `fasting` → tabla `fasting_logs` faltante.
- búsqueda por voz → edge function `voice-food` no desplegada.

## Tasks
1. **Aplicar migración body/fasting** (crea `body_measurements` + `fasting_logs` con RLS + grants). Renumerar el archivo local de `0009_body_fasting.sql` a `0013_body_fasting.sql` (colisión con el 0009 de grants).
2. **Desplegar `voice-food`** (Gemini transcribe audio). `GEMINI_API_KEY` ya existe como secret (lo usa analyze-food).
3. **Cancelar plan Familiar** (dueño): RPC `cancel_family_plan()` + `family.ts` + botón en `family.tsx`.
4. **Confirmación de email** in-app: reenviar en signup + CTA en login si "email not confirmed".
5. **Expiración de plan**: `grantEntitlement` setea `plan_expires_at` (+1 mes / +1 año).
6. **Limpieza**: quitar `console.*` de debug.
7. tsc limpio + commit + push.

## Verificación
- REST: `body_measurements`/`fasting_logs` → 200; `voice-food` responde 400 sin audio (existe).
- `tsc --noEmit` sin errores nuevos.
