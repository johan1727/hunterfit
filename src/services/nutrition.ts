import type { Profile, UserGoal } from '../types/db';

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  activo: 1.725,
  muy_activo: 1.9,
};

// Ajuste calórico y reparto de macros según el objetivo del personaje
const GOAL_CONFIG: Record<UserGoal, { kcalDelta: number; proteinPerKg: number; fatPct: number }> = {
  masa: { kcalDelta: 350, proteinPerKg: 2.0, fatPct: 0.25 },
  fuerza: { kcalDelta: 200, proteinPerKg: 2.0, fatPct: 0.27 },
  definicion: { kcalDelta: -400, proteinPerKg: 2.2, fatPct: 0.25 },
  agilidad: { kcalDelta: -150, proteinPerKg: 1.8, fatPct: 0.27 },
  movilidad: { kcalDelta: 0, proteinPerKg: 1.6, fatPct: 0.30 },
  general: { kcalDelta: 0, proteinPerKg: 1.8, fatPct: 0.28 },
};

export interface MacroTargets {
  calorie_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/** Mifflin-St Jeor + factor de actividad + ajuste por objetivo */
export function calculateTargets(p: {
  sex: Profile['sex'];
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: string;
  goal: UserGoal;
}): MacroTargets {
  const base = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age;
  const bmr = p.sex === 'f' ? base - 161 : base + 5;
  const tdee = bmr * (ACTIVITY_FACTORS[p.activity_level] ?? 1.375);
  const cfg = GOAL_CONFIG[p.goal] ?? GOAL_CONFIG.general;

  const kcal = Math.max(1200, Math.round(tdee + cfg.kcalDelta));
  const protein = Math.round(cfg.proteinPerKg * p.weight_kg);
  const fat = Math.round((kcal * cfg.fatPct) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return { calorie_target: kcal, protein_g: protein, carbs_g: carbs, fat_g: fat };
}
