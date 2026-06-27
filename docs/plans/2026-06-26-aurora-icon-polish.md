# HunterFit — Pulido Aurora: iconografía consistente + refinamientos visuales

> **For Claude:** REQUIRED SUB-SKILL al ejecutar: usar `executing-plans` para implementar task-by-task, y cerrar con `verification-before-completion` (tsc limpio + abrir las 4 tabs sin crashes) antes de dar por terminado.

**Goal:** Terminar la unificación de iconografía empezada en Home (barrer glifos de texto `▦ › ☆ ⚡ ‹ ↩ ▲ ▼ ✕` por Ionicons en las 4 tabs y el buscador) y empujar el sistema decisivamente hacia **Aurora Maximalism**: jerarquía de glow, `CalorieRing` como pieza firma con halo neón, transición al alternar `SegmentedTabs` y display tipográfico más grande en cabeceras.

**Ancla:** Aurora Maximalism. El theme ya vive ahí — superficie casi-negra `#07080B`, gradiente brand `#5B7CFF→#C084FC→#FB7185`, acento glow `#8AB4FF`, `AuroraBackground` de cápsulas, `GradientText`. Estos cambios no introducen un ancla nueva: refuerzan la existente y eliminan el ruido (glifos unicode como iconos) que la diluye. **No** introducir hairlines como estructura primaria ni superficies planas (eso sería Swiss/Industrial).

**Diferenciador:** el `CalorieRing` con halo neón es la pieza firma que se repite con autoridad en Home y Nutrición.

**Regla de contenido (§2 frontend-design):**
- **Convertir** glifos de texto usados como iconos de UI → Ionicons monocromos.
- **Convertir** emojis de *label de sección* (🕐 Recientes, ⚔️ Hoy, 📅 Semana, 🔥 streak) → Ionicons.
- **Mantener** emojis que son *datos*: `foods.icon` (🥩🥦🍎) y el mapa `CATEGORY_EMOJI` de las chips de categoría — son una taxonomía consistente provista por el dominio, no iconografía de chrome.
- **Mantener** emojis expresivos no-icónicos: `👋` del saludo.
- No tocar copy estándar (no themear labels de botones).

**Stack:** Expo SDK 56, Ionicons (`@expo/vector-icons`), react-native-reanimated v4, react-native-svg. Sin migraciones de BD.

---

## Context

En la sesión previa se implementaron 9 mejoras UX (commit `032fca9`). Quedó pendiente, como recomendación nº1 de la revisión de diseño, **terminar la iconografía**: Home ya usa Ionicons en QuickActions, pero `search.tsx` y el resto de tabs siguen mezclando glifos de texto (`▦`, `›`, `☆`, `⚡`, `‹`, `↩`, `▲`, `▼`, `✕`) y emojis de sección con la paleta neón. Esto es el anti-patrón "unicode glyph as icon substitute": dependen del renderer de emoji por plataforma y rompen la coherencia Aurora.

Archivos clave:
- `src/components/system.tsx` — `SystemWindowPanel` (borde-gradiente, ya documentado como "differentiator Aurora: solo la tarjeta principal lo usa") y `SystemPanel` (plano).
- `src/components/CalorieRing.tsx` — anillo SVG.
- `src/components/SegmentedTabs.tsx` — toggle (creado en la sesión previa; hoy solo acepta `label` string).
- `src/theme/system.ts` — tokens: `colors.glow #8AB4FF`, `gradients.brand`, `radius`, `spacing`.
- Tabs: `src/app/(tabs)/{home,nutrition,workouts}.tsx`, `src/app/nutrition/search.tsx`.

---

## Task 1: Barrido de iconos en `search.tsx`

**Files:** Modify `src/app/nutrition/search.tsx`

Importar Ionicons: `import { Ionicons } from '@expo/vector-icons';`

Reemplazos (todos los glifos son `<SystemText>`/`<Text>` con un carácter usado como icono):

| Ubicación | Glifo actual | Reemplazo |
|-----------|--------------|-----------|
| Botón barcode (`barcodeBtn`) | `▦` | `<Ionicons name="barcode-outline" size={22} color={colors.text} />` |
| Toggle "⭐ Mis favoritos" | `⭐` en texto | `<Ionicons name="star" size={14} color={colors.warning} />` + texto "Mis favoritos (n)" |
| Chevron toggle favoritos | `▲` / `▼` | `<Ionicons name={showFavorites ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textDim} />` |
| Icono fila favorito | `⭐` | `<Ionicons name="star" size={18} color={colors.warning} />` |
| Botón quitar favorito | `✕` | `<Ionicons name="close" size={16} color={colors.danger} />` |
| Label "🕐 Recientes" | `🕐` en texto | fila con `<Ionicons name="time-outline" size={13} color={colors.textDim} />` + "Recientes" |
| Chevron filas Recientes | `›` | `<Ionicons name="chevron-forward" size={18} color={colors.glow} />` |
| Estrella fav en filas resultado | `⭐` / `☆` | `<Ionicons name={isFavorite(item.id) ? 'star' : 'star-outline'} size={18} color={isFavorite(item.id) ? colors.warning : colors.textFaint} />` |
| Chevron filas resultado | `›` | `<Ionicons name="chevron-forward" size={18} color={colors.glow} />` |

**Mantener sin tocar:**
- `(item as any).icon ?? '🍽️'` (emoji de alimento = dato).
- `getCategoryEmoji(cat)` y `⚡` de la chip "Todos" → la chip "Todos" usa `⚡` como parte de la taxonomía de categorías; para coherencia con el resto de chips (que son emoji de categoría), **mantener** el emoji. *(Si en review se decide convertir toda la fila de chips a Ionicons, va en un task aparte — fuera de alcance aquí.)*

**Verificación:** abrir `/nutrition/search` → no quedan glifos `▦ › ☆ ✕ ▲ ▼`; barcode, chevrons y estrellas se ven como iconos nítidos. `npx tsc --noEmit` sin errores nuevos.

---

## Task 2: Barrido de iconos en `nutrition.tsx`

**Files:** Modify `src/app/(tabs)/nutrition.tsx`

Importar Ionicons.

| Ubicación | Glifo actual | Reemplazo |
|-----------|--------------|-----------|
| Flecha fecha izquierda (`dateArrow`) | `‹` | `<Ionicons name="chevron-back" size={20} color={colors.text} />` |
| Flecha fecha derecha | `›` | `<Ionicons name="chevron-forward" size={20} color={colors.text} />` |
| Botón "↩ Copiar comidas de ayer" | `↩` | `<Ionicons name="arrow-undo-outline" size={15} color={colors.textDim} />` + texto en una fila |
| Botón "🤖 Generar Receta con IA" | `🤖` | mantener (emoji expresivo en botón temático, opcional convertir a `sparkles`); si se convierte: prefijo `<Ionicons name="sparkles-outline" />` |

Los `dateArrowText` que ahora envuelven texto deben pasar a un contenedor que centre el `<Ionicons>` (el `dateArrow` ya es 32×32 centrado, solo cambiar el hijo).

**Verificación:** navegación de fechas y botón copiar muestran iconos; `tsc` limpio.

---

## Task 3: Barrido de iconos en `workouts.tsx`

**Files:** Modify `src/app/(tabs)/workouts.tsx`

Importar Ionicons.

| Ubicación | Glifo actual | Reemplazo |
|-----------|--------------|-----------|
| Chevron en `RoutineCard` (`arrow`) | `›` | `<Ionicons name="chevron-forward" size={22} color={colors.textFaint} />` |
| Botón "🏆 Historial y récords" | `🏆` | mantener (emoji en botón) u opcional `<Ionicons name="trophy-outline" />` prefijo |

**Verificación:** las tarjetas de rutina muestran chevron Ionicon; `tsc` limpio.

---

## Task 4: Iconos en Home (streak + SegmentedTabs)

**Files:** Modify `src/components/SegmentedTabs.tsx`, `src/app/(tabs)/home.tsx`

**Paso 1: Extender `SegmentedTabs` para aceptar icono opcional por opción**

```tsx
import { Ionicons } from '@expo/vector-icons';

export function SegmentedTabs<T extends string>({ options, value, onChange }: {
  options: { key: T; label: string; icon?: keyof typeof Ionicons.glyphMap }[];
  value: T;
  onChange: (key: T) => void;
}) {
  // ...dentro del Pressable, antes del SystemText:
  // {opt.icon && <Ionicons name={opt.icon} size={14} color={active ? colors.text : colors.textDim} />}
  // envolver icono + label en <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
}
```

**Paso 2: Home — usar `icon` en vez de emoji en los labels de misiones**

```tsx
options={[
  { key: 'daily',  label: `Hoy (${activeQuests.length})`,        icon: 'flash-outline' },
  { key: 'weekly', label: `Semana (${activeWeeklyQuests.length})`, icon: 'calendar-outline' },
]}
```

**Paso 3: Home — streak `🔥` → Ionicon**

En el `streakBadge`, reemplazar `<SystemText style={{ fontSize: 22 }}>🔥</SystemText>` por `<Ionicons name="flame" size={22} color={colors.warning} />`. El número y "días" se mantienen.

**Mantener:** `👋` del saludo (expresivo, no icónico).

**Verificación:** Home → el toggle de misiones y la racha muestran Ionicons monocromos; `tsc` limpio.

---

## Task 5: `CalorieRing` como pieza firma (halo neón)

**Files:** Modify `src/components/CalorieRing.tsx`

**Objetivo:** que el arco de progreso tenga glow real, no solo el relleno de gradiente. Es el diferenciador Aurora visible.

**Enfoque (RN + react-native-svg):** añadir un segundo `<Circle>` de progreso idéntico debajo del nítido, con `strokeWidth` mayor, color `colors.glow`/`gradients.brand[1]`, `opacity ~0.35` y sin `strokeLinecap` redondo extra — actúa de halo difuso. Alternativa más simple y barata: envolver el `wrap` en un `View` con `shadowColor: colors.glow, shadowRadius: 18, shadowOpacity: 0.6` (recordar gotcha del proyecto: contenedor con sombra necesita `borderRadius` y dimensiones explícitas — el `wrap` ya tiene `width/height`, añadir `borderRadius: size/2`).

Aplicar el glow **solo** cuando no hay sobreconsumo (`!over`); en `over`, el rojo `colors.danger` ya comunica el estado sin glow.

**Verificación:** Home y Nutrición → el anillo proyecta un halo neón sutil; en sobreconsumo se ve rojo sin glow azul. `tsc` limpio.

---

## Task 6: Jerarquía de glow (disciplina `SystemWindowPanel` vs `SystemPanel`)

**Files:** Modify `src/app/(tabs)/nutrition.tsx` (y auditar Home)

**Problema:** el borde-gradiente vivo (`SystemWindowPanel`) es el gesto que dirige el ojo; si demasiados paneles lo usan, deja de destacar. Hoy Home usa `SystemWindowPanel` para el hero de calorías, pero Nutrición usa `SystemPanel` plano para el suyo → inconsistente.

**Paso 1:** En `nutrition.tsx`, el panel hero de calorías (el que ahora envuelve `CalorieRing`) debe usar `SystemWindowPanel` para igualar a Home y ser el foco de la pantalla. Los paneles secundarios (Macros, Agua, comidas) se quedan en `SystemPanel` plano.

**Paso 2:** Auditar que ninguna pantalla use `SystemWindowPanel` en más de 1–2 paneles hero. Dejar el resto en `SystemPanel`.

**Verificación:** en cada tab, solo el panel principal tiene borde-gradiente; el ojo va ahí primero. `tsc` limpio.

---

## Task 7: Transición al alternar `SegmentedTabs` en Home

**Files:** Modify `src/app/(tabs)/home.tsx`

El contenido de misiones cambia de golpe al tocar Hoy/Semana. Envolver la lista renderizada (el `<View style={{ marginTop: spacing.sm }}>` que contiene los quests) en un `Animated.View` con `key={questTab}` y `entering={FadeIn.duration(180)}` (importar `FadeIn` de `react-native-reanimated`) para que el cambio se sienta del mismo material elástico que el resto de la app.

**Verificación:** alternar Hoy/Semana hace un fundido suave del contenido, sin salto seco. `tsc` limpio.

---

## Task 8: Display tipográfico más grande en cabeceras (opcional/cuidado)

**Files:** Modify `src/app/(tabs)/nutrition.tsx`, `src/app/(tabs)/workouts.tsx`

Aurora vive en titulares dominantes. Subir el `GradientText` de cabecera de tab de `fontSize: 38` a `~46–52` (con `lineHeight` acorde) para que el título hero domine la composición.

**Cuidado:** verificar que no provoque wrap feo en español (p. ej. "Nutrición" cabe; revisar en ancho de móvil real). Si algún título se parte mal, dejarlo en 38–42. Cambio puramente de escala, sin tocar copy.

**Verificación:** cabeceras más imponentes sin desbordes ni wraps rotos en móvil. `tsc` limpio.

---

## Orden recomendado

1. **Task 1** (search — el de mayor impacto, termina lo de Home)
2. **Tasks 2, 3** (nutrition, workouts — mecánicos)
3. **Task 4** (Home + extensión SegmentedTabs)
4. **Task 5** (CalorieRing firma — visible, aislado)
5. **Task 6** (jerarquía glow)
6. **Task 7** (transición tabs)
7. **Task 8** (tipografía — último, ajuste fino con riesgo de wrap)

---

## Verification (cierre — `verification-before-completion`)

1. `npx tsc --noEmit` → sin errores nuevos vs. baseline (26 preexistentes: rutas tipadas `/routines`, `numberOfLines` en `SystemText`, edge functions Deno).
2. Grep de control: no quedan glifos-icono `▦ ‹ › ☆ ▲ ▼ ✕ ↩` en las 4 tabs ni en `search.tsx` (salvo los emojis-dato y `👋`).
3. Recargar `localhost:8081` y navegar las 4 tabs + `/nutrition/search` sin crashes; confirmar visualmente: barcode/chevrons/estrellas como iconos, anillo con halo, solo 1 panel hero con borde-gradiente por pantalla, toggle de misiones con fundido.
4. Commit (por grupo: "iconos" y "refinamientos Aurora") con mensajes claros y push a `origin/main`.
