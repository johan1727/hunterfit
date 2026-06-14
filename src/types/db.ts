export type HunterRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type ExerciseCategory = 'strength' | 'cardio' | 'flexibility';
export type MealType = 'desayuno' | 'comida' | 'cena' | 'snack';
export type FitnessLevel = 'principiante' | 'intermedio' | 'avanzado';
export type UserGoal = 'definicion' | 'masa' | 'agilidad' | 'movilidad' | 'fuerza' | 'general';

export interface Profile {
  id: string;
  username: string | null;
  rank: HunterRank;
  xp: number;
  level: number;
  streak_days: number;
  last_activity_date: string | null;
  active_character_id: number | null;
  is_premium: boolean;
  sex: 'm' | 'f' | 'otro' | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy_activo' | null;
  goal: UserGoal | null;
  training_days_per_week: number;
  fitness_level: FitnessLevel;
  calorie_target: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  body_analysis: BodyAnalysis | null;
  onboarding_complete: boolean;
}

export interface BodyAnalysis {
  tipo_corporal: string;
  grupos_a_priorizar: string[];
  notas: string;
}

export interface Character {
  id: number;
  slug: string;
  name: string;
  title: string;
  archetype: UserGoal;
  description_es: string;
  attributes: { str: number; agi: number; vit: number; sta: number };
  routine_bias: { strength: number; cardio: number; flexibility: number };
  unlock_rank: HunterRank;
}

export interface Exercise {
  id: number;
  slug: string;
  name_es: string;
  category: ExerciseCategory;
  muscle_groups: string[];
  equipment: string;
  difficulty: number;
  instructions_es: string;
  default_sets: number | null;
  default_reps: number | null;
  default_seconds: number | null;
  rest_seconds: number;
  met_value: number;
}

export interface Routine {
  id: string;
  user_id: string;
  character_id: number;
  level: number;
  day_index: number;
  name: string;
  focus: string;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: number;
  position: number;
  sets: number;
  reps: number | null;
  seconds: number | null;
  rest_seconds: number;
  exercise?: Exercise;
}

export interface Quest {
  id: string;
  user_id: string;
  date: string;
  description_es: string;
  type: string;
  target: number;
  progress: number;
  completed: boolean;
  xp_reward: number;
}

export interface Food {
  id: number;
  name_es: string;
  brand: string | null;
  category: string;
  serving_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface MealLog {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  food_id: number | null;
  custom_name: string | null;
  quantity_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: 'manual' | 'ai_photo';
}

export interface FoodAnalysisItem {
  nombre: string;
  gramos_estimados: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
