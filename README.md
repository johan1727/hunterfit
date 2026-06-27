# ⚔️ HunterFit

> **Entrena como un Cazador. Sube de rango. Despierta tu poder.**

App móvil de fitness gamificada que fusiona la progresión estilo **Solo Leveling** (rangos E → S, misiones diarias, XP, rachas) con el seguimiento nutricional estilo **Fitia** (base de alimentos, macros, análisis de fotos con IA).

Elige uno de **6 personajes anime originales** como arquetipo físico y la app genera un plan de entrenamiento semanal personalizado para lograr ese físico — mezclando fuerza, cardio y flexibilidad según el personaje, tu nivel y tus días disponibles.

---

## ✨ Features

### 🎮 Sistema de Cazador (gamificación)
- **Rangos E → D → C → B → A → S** con umbrales de XP (500 / 1,500 / 3,500 / 7,000 / 15,000)
- **XP** por completar entrenamientos (100 + 5/ejercicio), misiones (30–80) y rachas
- **3 misiones diarias** generadas según tu nivel ("Haz 100 sentadillas — +60 XP")
- **Racha de días activos** 🔥 con bonus semanal
- **Ventana de Estado** estilo Sistema: stats STR / AGI / VIT / STA derivados de tu progreso

### 🏋️ Motor de rutinas
- Plan semanal generado por algoritmo: `bias del personaje × nivel físico × días disponibles`
- Splits de fuerza (full body → push/pull/legs según días), HIIT o resistencia en cardio, movilidad
- ~80 ejercicios en español con instrucciones, series, reps y descansos
- Pantalla de entrenamiento con **timer de descanso interactivo** y progreso visual
- Si subiste foto corporal, prioriza los grupos musculares que la IA recomendó

### 🥗 Nutrición tipo Fitia
- Metas calóricas y macros calculadas con **Mifflin-St Jeor** + factor de actividad + objetivo
- **5,000+ alimentos LATAM** con macros reales (tacos, frijoles, pollo, tamales, suplementos…)
- Registro por tiempo de comida (desayuno / comida / cena / snack)
- Anillo de calorías + barras de progreso por macro

### 🍳 RecipeAI — Recetas personalizadas con IA
- Genera **3 recetas** adaptadas a tus macros del día con **Gemini 2.5 Flash**
- Selector de comida tipo "stories" (estilo CREME) con bordes gradiente
- Hero card con emoji grande, dificultad, stats y macros visuales
- Sección **"Pregunta al Hunter AI"** para consultas sobre la receta
- Guarda favoritos (Zustand) y registra en historial (`meal_logs`)

### 🤖 IA con Gemini (Premium)
- **Foto de comida → macros**: la Edge Function `analyze-food` identifica alimentos, estima gramos y calcula kcal/proteína/carbs/grasa; tú confirmas y se registra
- **Foto corporal → rutina personalizada**: `analyze-body` detecta tipo corporal y grupos musculares a priorizar
- La API key de Gemini vive **solo en el servidor** (Edge Functions), nunca en la app

### 👥 Roster de personajes

| Personaje | Título | Arquetipo | Enfoque |
|---|---|---|---|
| **Kael** | El Cazador de Sombras | Definición | Calistenia + HIIT |
| **Ragnar** | El Berserker | Masa | Fuerza pesada |
| **Yuki** | La Asesina Veloz | Agilidad | Velocidad + core |
| **Maestro Ren** | El Monje | Movilidad | Flexibilidad + fuerza corporal |
| **Aria** | La Valquiria | Fuerza atlética | Glúteos / piernas / core |
| **Kenta** | El Novato Decidido | General | Full-body principiante |

Cada personaje tiene 3 formas (base → despertado → final) que se desbloquean al subir de rango.

---

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| App | React Native + **Expo SDK 56** (TypeScript, Expo Router) |
| Estado | React Query + Zustand |
| Backend | **Supabase** — Auth, Postgres (schema `hunterfit` con RLS), Storage, Edge Functions |
| IA | **Gemini 2.5 Flash** vía Edge Functions (Deno) |
| Tema | Dark "Sistema" — navy `#0A0E1A`, glow cyan `#00D4FF`, paneles con borde brillante |

```
src/
├── app/                    # Rutas (Expo Router)
│   ├── index.tsx           # Redirect según sesión/onboarding
│   ├── auth/               # login, signup
│   ├── onboarding/         # quiz (8 pasos), character-select, body-photo
│   ├── (tabs)/             # home, workouts, nutrition, profile
│   ├── workout/[id].tsx    # Ejecución de entrenamiento con timer
│   └── nutrition/          # search, edit/[id]
├── components/system.tsx   # SystemPanel, SystemButton, RankBadge, ProgressBar…
├── services/               # routineGenerator, nutrition, quests, routines, ai
├── hooks/                  # useAuth, useData (React Query)
├── lib/                    # supabase client, dates, base64
├── constants/game.ts       # Umbrales de rango, XP, registry de imágenes
└── theme/system.ts         # Colores, spacing, glow
```

---

## 🚀 Setup

### Requisitos
- Node 20+, cuenta de [Supabase](https://supabase.com), [Expo Go](https://expo.dev/go) en tu celular
- API key de [Google AI Studio](https://aistudio.google.com/apikey) (para las features de IA)

### 1. Instalar y configurar

```bash
cd hunterfit
npm install
```

Crea `.env` en la raíz de `hunterfit/`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
```

### 2. Base de datos (Supabase)

Aplica las migraciones de `../supabase/migrations/` en orden (0001 → 0008): schema `hunterfit` completo con tablas, RLS, función `grant_xp`, trigger de perfil, buckets de Storage y seeds (6 personajes, ~80 ejercicios, ~280 alimentos).

**Configuración obligatoria del Dashboard:**
1. **Settings → Data API → Exposed schemas** → agregar `hunterfit`
2. **Edge Functions → Secrets** → agregar `GEMINI_API_KEY`
3. Desplegar las Edge Functions `analyze-food` y `analyze-body` (`../supabase/functions/`)

### 3. Correr

```bash
npx expo start
```

Escanea el QR con **Expo Go** (Android) o la app Cámara (iOS).

---

## 🧪 Flujo E2E de prueba

1. **Signup** → confirma email → login
2. **Quiz** (sexo, edad, medidas, actividad, objetivo, días, nivel) → calcula tus macros
3. **Elige personaje** → carrusel con stats y bias de entrenamiento
4. **Foto corporal** (opcional, premium) → la IA ajusta tu rutina
5. **Entrenamientos** → "Generar Plan" → toca un día → completa con timer → **+XP**
6. **Nutrición** → busca "pollo" → agrega 150 g → ve el anillo de calorías actualizarse
7. **Perfil** → Ventana de Estado con rango, progreso y stats

---

## 🔒 Notas de arquitectura

- **Aislamiento por schema**: todo vive en el schema Postgres `hunterfit` para no interferir con otras apps del mismo proyecto Supabase. El cliente se configura con `db: { schema: 'hunterfit' }`.
- **RLS en todas las tablas**: catálogos legibles solo autenticado; datos personales solo del dueño (`auth.uid()`).
- **`grant_xp` es atómico**: actualiza XP, recalcula nivel/rango y mantiene la racha en una sola función SQL (`SECURITY DEFINER`).
- **Fechas en hora local** (`localDateString()`): las misiones y comidas usan la fecha del dispositivo, no UTC.
- **Premium**: flag `is_premium` en el perfil + paywall. La integración de pagos (RevenueCat) está pendiente.

## 🗺️ Roadmap

- [ ] Imágenes de personajes (prompts listos en `../docs/image-prompts.md` — 25 prompts para Gemini/Nano Banana)
- [ ] Notificaciones locales (recordatorio de misiones)
- [ ] Pagos reales con RevenueCat
- [ ] Historial de entrenamientos y gráficas de progreso
- [ ] Leaderboard entre cazadores
- [ ] Expandir base de alimentos a 10,000+ (paridad con Fitia)
- [ ] RecipeAI: foto de comida → macros automáticos

---

*Proyecto personal — personajes originales sin copyright, inspirados en la estética manhwa/anime.*
