# HunterFit — Rediseño "System HUD": overhaul robusto de 5 pantallas

> **For Claude:** REQUIRED SUB-SKILL al ejecutar: `executing-plans` (task-by-task) y cerrar con `verification-before-completion` (tsc limpio + navegar las 5 rutas sin crashes) antes de dar por terminado.

**Goal:** Un cambio **robusto y notorio** en `/nutrition`, `/nutrition/search`, `/workouts`, `/profile` y `/premium/upgrade`. Romper la "sopa de tarjetas" (columna única de paneles idénticos) y comprometerse de verdad con Aurora Maximalism a través de un diferenciador diegético: **la UI es el HUD del "Sistema" de Solo Leveling**.

**Ancla:** Aurora Maximalism (ya es el sistema: fondo `#07080B`, gradiente brand `#5B7CFF→#C084FC→#FB7185`, glow `#8AB4FF`, `AuroraBackground`, `GradientText`). Este plan NO cambia de ancla: la ejecuta con convicción. **Prohibido** introducir hairlines como estructura primaria, superficies planas o restraint minimalista (eso sería Swiss/Industrial y rompería el ancla).

**Diferenciador (3 gestos que se repiten en las 5 pantallas):**
1. **Hero readout** — un número/anillo gigante (56–96px) que es el foco indiscutible de cada pantalla.
2. **Marco HUD con corner-brackets** + glow en el panel hero (no el borde-gradiente uniforme en todo).
3. **Numerales tabulares** (`fontVariant: ['tabular-nums']`) en stats, macros, precios y contadores.

**Tech:** Expo SDK 56, react-native-svg (radar/anillos), react-native-reanimated v4, Ionicons. Sin migraciones de BD.

---

## Context

Diagnóstico con la skill `frontend-design`: las 5 pantallas apilan `SystemPanel` casi idénticos en una columna, cada uno con su micro-label en mayúsculas y el mismo espaciado → monotonía, sin jerarquía ni momento hero. Aurora pide un elemento dominante por pantalla y drama de escala; hoy todo compite por igual.

Hallazgo de contenido (§2): `premium/upgrade.tsx` fabrica datos (testimonios inventados, countdown de urgencia que se reinicia, "+12,000 cazadores"). **Decisión del usuario: quitar/honestizar.**

Archivos clave:
- `src/theme/system.ts` — tokens.
- `src/components/system.tsx` — `SystemPanel`, `SystemWindowPanel`, `GradientText`, `ProgressBar`.
- `src/components/CalorieRing.tsx` — anillo SVG (ya con halo neón).
- Pantallas: `src/app/(tabs)/{nutrition,workouts,profile}.tsx`, `src/app/nutrition/search.tsx`, `src/app/premium/upgrade.tsx`.

---

## Task 1: Primitivas compartidas (construir PRIMERO — dan consistencia y DRY)

**Files:** Modify `src/theme/system.ts`; Create `src/components/HudPanel.tsx`, `src/components/HeroStat.tsx`, `src/components/StatRadar.tsx`.

**1a. Token de numeral tabular** en `system.ts`:
```ts
import { TextStyle } from 'react-native';
export const numeric: TextStyle = { fontVariant: ['tabular-nums'] };
```

**1b. `HudPanel`** — panel hero con 4 corner-brackets glow. Envuelve `SystemWindowPanel` (borde-gradiente) y superpone 4 `View` absolutos en las esquinas (líneas de 2px, `colors.glow`, largo ~16px) formando `⌐ ¬ ∟ ⌐`. Prop `glow?: boolean` para `shadowColor: colors.glow` con `shadowRadius: 24, shadowOpacity: 0.5` (recordar gotcha: contenedor con sombra necesita `borderRadius` y dimensiones; el wrapper ya las tiene). Es el marco del hero de cada pantalla.

**1c. `HeroStat`** — readout grande reutilizable:
```tsx
// props: { value: string|number; unit?: string; label: string; size?: number; accent?: string }
// render: label en micro-caps arriba; value enorme (size ?? 64, fontWeight 900, style=numeric) con GradientText opcional; unit pequeño al lado.
```
Usado en Workouts ("DÍA 2/4") y donde haga falta un número dominante.

**1d. `StatRadar`** — radar SVG (react-native-svg) para N ejes (4: STR/AGI/VIT/STA). Polígono de fondo + polígono de datos relleno con `gradients.brand[1]` a baja opacidad y borde glow; labels en los vértices. Es la firma Solo Leveling.

**Verificación:** los 4 archivos compilan; sin UI aún (se validan en sus tasks). `tsc` limpio.

---

## Task 2: `/nutrition` — anillo hero full-width

**Files:** Modify `src/app/(tabs)/nutrition.tsx`

Hoy el `CalorieRing` (120px) va en un `kcalRow` lateral dentro de `SystemWindowPanel`. **Notorio:**
- Envolver el hero en `HudPanel glow`.
- Anillo centrado y grande (`size={180}`), como foco vertical de la pantalla.
- Debajo, los 3 macros (P/C/G) en una fila de readouts con barra glow y números en `numeric` (reutilizar el patrón `MacroBar` de Home o `MacroRow`), no apilados a un lado.
- Meta/Restante: el número "restante" del anillo ya es grande; el bloque "Meta/Restante" pasa a una línea secundaria fina debajo.
- Cabecera de tab a `fontSize: 46` (ya hecho) — mantener.

**Verificación:** Nutrición abre con el anillo dominando la mitad superior; macros como readout glow; un solo panel hero (HudPanel) con brackets. `tsc` limpio.

---

## Task 3: `/nutrition/search` — buscador search-first, descongestionar

**Files:** Modify `src/app/nutrition/search.tsx`

La pantalla está sobrecargada (barcode + foto IA + favoritos + categorías + subcats + recientes + manual + resultados + detalle apilados). **Notorio = jerarquía y aire:**
- **Buscador como hero sticky:** mover el `SystemInput` arriba (justo bajo el título), agrandarlo (altura ~52, icono `search` Ionicon a la izquierda) y hacerlo sticky con `stickyHeaderIndices` del `ScrollView` (o moverlo fuera del scroll).
- **Colapsar acciones secundarias:** barcode + "Analizar foto IA" + "Crear manual" → una sola fila de 3 botones-icono compactos bajo el buscador (no 3 bloques grandes repartidos). El formulario manual y el detalle siguen apareciendo on-demand.
- **Favoritos y categorías** se mantienen pero como chips horizontales compactas (ya lo son) — verificar que no empujen el contenido principal hacia abajo.
- Resultados/Recientes: lista más densa (reducir `paddingVertical` de `foodRow` de `spacing.md` a ~10).

**Verificación:** al abrir, el buscador es lo primero y domina; las acciones IA/barcode/manual no compiten con él; scroll fluido con buscador sticky. `tsc` limpio.

---

## Task 4: `/workouts` — hero de semana

**Files:** Modify `src/app/(tabs)/workouts.tsx`

El progreso semanal es hoy un hilo fino bajo el título. **Notorio:**
- `HudPanel glow` arriba con `HeroStat` "DÍA {completedDays}/{routines.length}" (número enorme, `numeric`) + fila de N celdas-día (una por rutina): completadas con fill gradiente + glow, pendientes en `bgElevated`. Tipo tracker de racha semanal.
- Las `RoutineCard` se mantienen debajo (ya tienen buen diseño con el chevron Ionicon).
- Cabecera a 46 (ya hecho).

**Verificación:** Entrena abre con el tracker de semana como hero grande; las celdas-día reflejan `completedDays`. `tsc` limpio.

---

## Task 5: `/profile` — radar de stats RPG + barrido de iconos

**Files:** Modify `src/app/(tabs)/profile.tsx`

- **Reemplazar las 4 barras** de stats [profile.tsx:347-369] por `StatRadar` (STR/AGI/VIT/STA) dentro del panel "Estadísticas". El radar glow es el gesto más reconocible y on-theme del plan. (Mantener los valores numéricos en los vértices.)
- **Barrido de iconos:** `✓` y `✕` del editor de nombre → `<Ionicons name="checkmark" />` / `name="close"`; `🔥` inline de "racha X días 🔥" → `<Ionicons name="flame" size={13} />`.
- El `SystemWindowPanel` "Status Window" hero puede subir a `HudPanel glow` para coherencia con las otras pantallas.
- Números de XP/nivel/peso/stats con `numeric`.

**Verificación:** Perfil muestra el radar hexagonal/diamante glow; sin glifos `✓ ✕`; racha con icono `flame`. `tsc` limpio.

---

## Task 6: `/premium/upgrade` — honestizar contenido + restyle

**Files:** Modify `src/app/premium/upgrade.tsx`

**6a. Integridad de contenido (§2 — decisión: quitar/honestizar):**
- **Eliminar `TESTIMONIALS`** y su sección (testimonios fabricados). Si se quiere prueba social futura, dejar el espacio vacío con un comentario `// TODO: testimonios reales` — no inventar.
- **Quitar el countdown falso** (`timeLeft`/`useEffect` del timer y el `ofertaBanner` de urgencia) — o, si hay una oferta real, atarlo a una fecha fija pasada por config (no un reset en cada montaje).
- **Quitar "+12,000 cazadores"** (métrica inventada) del subtítulo hero — reemplazar por copy honesto del valor ("Desbloquea IA, todos los personajes y más").

**6b. Restyle Aurora:**
- Hero `👑` (52px emoji) → `<Ionicons name="diamond" />` o un `GradientText` grande; quitar `⚡ HUNTER PRO`, `🔥 MÁS POPULAR`, `💎`, `⏰` y los `✅/❌` de las listas → usar Ionicons (`checkmark-circle` verde / `close-circle` dim) en la comparativa.
- Precios en `numeric` (tabular).
- CTA: el dorado `#FFD700→#FF6B35` choca con el ancla azul→violeta; alinear el botón principal a `gradients.brand` (o reservar el dorado solo para el badge "mejor valor"). Mantener `⭐` de rating → `Ionicons star` repetido o `name="star"` × n.

**Verificación:** no quedan datos fabricados; la pantalla vende con honestidad; paleta coherente con el resto. `tsc` limpio.

---

## Task 7: Verificación final + commit

1. `npx tsc --noEmit` (desde `hunterfit/`) → sin errores nuevos vs. baseline (26 preexistentes conocidos).
2. Grep de control: sin glifos-icono `✓ ✕ 👑 ⚡ 🔥 ⏰ 💎 ✅ ❌` en `profile.tsx` ni `upgrade.tsx` (salvo emojis-dato si los hubiera).
3. Navegar las 5 rutas en `localhost:8081` sin crashes; confirmar: cada pantalla tiene UN hero dominante (anillo / tracker semana / radar / buscador / plan), marco HUD con brackets en el hero, números tabulares.
4. Commit único de diseño (revert limpio) "feat(ui): rediseño System HUD — heros, radar, marco HUD, numerales tabulares; honestizar premium" y push a `origin/main`.

---

## Orden recomendado

1. **Task 1** (primitivas — todo lo demás depende de ellas)
2. **Task 4** (workouts — hero más simple, valida HeroStat + HudPanel)
3. **Task 2** (nutrition ring hero)
4. **Task 5** (profile radar — valida StatRadar)
5. **Task 3** (search — la más delicada, reestructura layout)
6. **Task 6** (premium — contenido + restyle)
7. **Task 7** (verificación + commit)

## Riesgos / notas

- **`StatRadar`** y `HudPanel` son los componentes con más riesgo (SVG + posicionamiento absoluto); validarlos aislados en Task 1.
- **Sticky search** en RN ScrollView (`stickyHeaderIndices`) puede comportarse distinto en web vs nativo; verificar en `localhost:8081`.
- Cambio grande → un solo commit para revert limpio si no convence (igual que el commit `6c26354` anterior).
- Fuera de alcance (otro pase): glifos residuales en `recipe.tsx` y `meal-plan.tsx`.
