import type { Character, MealLog, Profile, Quest } from '../types/db';
import type { RoutineWithExercises } from '../services/routines';

export const DEMO_USER_ID = 'demo-user-local';

export const DEMO_PROFILE: Profile = {
  id: DEMO_USER_ID,
  username: 'Cazador',
  rank: 'E',
  xp: 340,
  level: 4,
  streak_days: 3,
  last_activity_date: null,
  active_character_id: 1,
  is_premium: false,
  is_family: false,
  plan_id: null,
  plan_expires_at: null,
  plan_source: null,
  sex: 'm',
  age: 22,
  height_cm: 175,
  weight_kg: 72,
  activity_level: 'moderado',
  goal: 'masa',
  training_days_per_week: 4,
  fitness_level: 'principiante',
  calorie_target: 2400,
  protein_g: 160,
  carbs_g: 280,
  fat_g: 70,
  body_analysis: null,
  onboarding_complete: true,
};

export const DEMO_CHARACTER: Character = {
  id: 1,
  slug: 'jin-woo',
  name: 'Sung Jin-Woo',
  title: 'El Cazador más débil',
  archetype: 'masa',
  description_es: 'Comenzó desde cero. Cada rep lo acerca a un poder que nadie puede ver todavía.',
  attributes: { str: 12, agi: 8, vit: 10, sta: 9 },
  routine_bias: { strength: 0.6, cardio: 0.3, flexibility: 0.1 },
  unlock_rank: 'E',
};

export const DEMO_QUESTS: Quest[] = [
  { id: 'q1', user_id: DEMO_USER_ID, date: today(), description_es: '20 sentadillas', type: 'strength', target: 20, progress: 0, completed: false, xp_reward: 50 },
  { id: 'q2', user_id: DEMO_USER_ID, date: today(), description_es: '15 minutos de cardio', type: 'cardio', target: 15, progress: 0, completed: false, xp_reward: 40 },
  { id: 'q3', user_id: DEMO_USER_ID, date: today(), description_es: 'Registrar 3 comidas', type: 'nutrition', target: 3, progress: 1, completed: false, xp_reward: 30 },
];

export const DEMO_ROUTINES: RoutineWithExercises[] = [
  {
    id: 'r1', user_id: DEMO_USER_ID, character_id: 1, level: 4, day_index: 0,
    name: 'Empuje', focus: 'Pecho · Hombros · Tríceps',
    routine_exercises: [
      makeEx(1, 'r1', 0, 'Press de banca', 'strength', ['pecho'], 4, 10),
      makeEx(2, 'r1', 1, 'Press militar', 'strength', ['hombros'], 3, 12),
      makeEx(3, 'r1', 2, 'Extensiones de tríceps', 'strength', ['tríceps'], 3, 15),
      makeEx(4, 'r1', 3, 'Fondos en paralelas', 'strength', ['pecho', 'tríceps'], 3, 10),
    ],
  },
  {
    id: 'r2', user_id: DEMO_USER_ID, character_id: 1, level: 4, day_index: 1,
    name: 'Jalón', focus: 'Espalda · Bíceps',
    routine_exercises: [
      makeEx(5, 'r2', 0, 'Dominadas', 'strength', ['espalda'], 4, 8),
      makeEx(6, 'r2', 1, 'Remo con barra', 'strength', ['espalda'], 3, 10),
      makeEx(7, 'r2', 2, 'Curl de bíceps', 'strength', ['bíceps'], 3, 12),
      makeEx(8, 'r2', 3, 'Face pulls', 'strength', ['hombros'], 3, 15),
    ],
  },
  {
    id: 'r3', user_id: DEMO_USER_ID, character_id: 1, level: 4, day_index: 2,
    name: 'Piernas', focus: 'Cuádriceps · Isquios · Glúteos',
    routine_exercises: [
      makeEx(9, 'r3', 0, 'Sentadilla con barra', 'strength', ['cuádriceps', 'glúteos'], 4, 8),
      makeEx(10, 'r3', 1, 'Peso muerto rumano', 'strength', ['isquios'], 3, 10),
      makeEx(11, 'r3', 2, 'Prensa de piernas', 'strength', ['cuádriceps'], 3, 12),
      makeEx(12, 'r3', 3, 'Elevaciones de pantorrilla', 'strength', ['pantorrillas'], 4, 20),
    ],
  },
];

export const DEMO_MEALS: MealLog[] = [
  makeMeal('m1', 'desayuno', 'Avena con proteína', 150, 480, 32, 62, 8),
  makeMeal('m2', 'desayuno', 'Plátano', 120, 105, 1, 27, 0),
  makeMeal('m3', 'comida', 'Pollo a la plancha', 200, 330, 62, 0, 7),
  makeMeal('m4', 'comida', 'Arroz integral', 180, 234, 5, 49, 4),
];

// ── helpers ───────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split('T')[0]; }

function makeEx(
  id: number, routineId: string, pos: number,
  name: string, cat: 'strength' | 'cardio' | 'flexibility',
  muscles: string[], sets: number, reps: number,
): RoutineWithExercises['routine_exercises'][number] {
  return {
    id: `re${id}`, routine_id: routineId, exercise_id: id, position: pos,
    sets, reps, seconds: null, rest_seconds: 60,
    exercise: {
      id, slug: name.toLowerCase().replace(/ /g, '-'), name_es: name,
      category: cat, muscle_groups: muscles, equipment: 'barra',
      difficulty: 2, instructions_es: '', default_sets: sets,
      default_reps: reps, default_seconds: null, rest_seconds: 60, met_value: 4,
    },
  };
}

function makeMeal(
  id: string, type: MealLog['meal_type'], name: string,
  qty: number, kcal: number, protein: number, carbs: number, fat: number,
): MealLog {
  return {
    id, user_id: DEMO_USER_ID, date: today(), meal_type: type,
    food_id: null, custom_name: name, quantity_g: qty,
    kcal, protein_g: protein, carbs_g: carbs, fat_g: fat, source: 'manual',
  };
}
