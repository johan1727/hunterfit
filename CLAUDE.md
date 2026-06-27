@AGENTS.md

# HunterFit — contexto del proyecto

App de fitness al estilo Solo Leveling con tracking de nutrición estilo Fitia.
Target: usuarios latinos que quieren una app motivadora y funcional.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Expo SDK 56 + Expo Router v3 (file-based) |
| UI | React Native + expo-linear-gradient + react-native-reanimated v4 |
| Backend | Supabase (proyecto "MY EX", `mrabsfuwprxisgxfqnuy`, schema `hunterfit`) |
| Estado | Zustand (`src/lib/demoStore.ts`) + React Query (`@tanstack/react-query`) |
| Auth | Supabase Auth — email/password + Google OAuth |
| IA | Gemini (generación de planes) |
| Icons | @expo/vector-icons (Ionicons) |

## Supabase

- **URL**: `https://mrabsfuwprxisgxfqnuy.supabase.co`
- **Schema**: `hunterfit` (todas las tablas van aquí)
- **Google OAuth**: habilitado en el dashboard
- **Redirect URLs requeridas** (agregar en Auth > URL Configuration):
  - `http://localhost:8081/auth/callback`
  - `hunterfit://auth/callback`
- El proyecto "MY EX" es compartido — no tocar el schema `public`

## Design System

- Archivo de tokens: `src/theme/system.ts`
- Componentes: `src/components/system.tsx`
- Estilo: **Aurora Maximalism** — fondo `#07080B`, gradiente brand azul→violeta→rosa
- Todos los paneles usan `SystemPanel` / `SystemWindowPanel` (borde 1.5px gradiente)
- Tipografía: `GradientText` para títulos hero, `SystemText` para cuerpo
- Animaciones: `FadeInDown.delay(n).springify()` para entradas, `withSpring` para press

## Modo demo

- Store: `src/lib/demoStore.ts` — `enterDemo()` + `exitDemo()`
- Datos mock: `src/lib/demo.ts` — rutinas, comidas, perfil completo
- Siempre verificar `isDemo` antes de llamar a Supabase
- Navegar con `router.replace('/(tabs)/home')` después de `enterDemo()`

## Convenciones

- Rutas auth: `src/app/auth/` — login, signup, callback
- Rutas onboarding: `src/app/onboarding/` — quiz, character-select, body-photo
- Tabs: `src/app/(tabs)/` — home, workouts, nutrition, profile
- Hooks de datos: `src/hooks/useHunterData.ts` (unifica demo + real)
- No usar el componente `app-tabs.web.tsx` (es un remanente del template, tiene errores TS)

## Importante

- `detectSessionInUrl: false` en supabase client → el callback OAuth llama manualmente `exchangeCodeForSession`
- `GradientText` usa prop `colors` (no `stops`)
- `Pill.style` aplica a `Text` interno, no al `View` — no pasar `borderColor`/`backgroundColor` ahí
- `GradStops` requiere cast `as [string, string]` para arrays dinámicos
