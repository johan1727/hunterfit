import type { Character, Exercise, FitnessLevel, UserGoal } from '../types/db';

export interface GeneratedExercise {
  exercise: Exercise;
  sets: number;
  reps: number | null;
  seconds: number | null;
  rest_seconds: number;
}

export interface GeneratedDay {
  name: string;
  focus: string;
  exercises: GeneratedExercise[];
}

const MAX_DIFFICULTY: Record<FitnessLevel, number> = {
  principiante: 2,
  intermedio: 3,
  avanzado: 4,
};

// Esquema de series/reps según el objetivo del personaje
const REP_SCHEMES: Record<UserGoal, { sets: number; reps: number; rest: number }> = {
  masa: { sets: 4, reps: 9, rest: 90 },
  fuerza: { sets: 4, reps: 7, rest: 120 },
  definicion: { sets: 3, reps: 13, rest: 60 },
  agilidad: { sets: 3, reps: 12, rest: 45 },
  movilidad: { sets: 3, reps: 12, rest: 45 },
  general: { sets: 3, reps: 12, rest: 60 },
};

const STRENGTH_SPLITS: Record<number, string[][]> = {
  1: [['full_body', 'piernas', 'pecho', 'espalda', 'core']],
  2: [
    ['pecho', 'hombros', 'brazos', 'core'],
    ['piernas', 'gluteos', 'espalda', 'core'],
  ],
  3: [
    ['pecho', 'hombros', 'brazos'],
    ['espalda', 'brazos', 'core'],
    ['piernas', 'gluteos', 'core'],
  ],
  4: [
    ['pecho', 'hombros'],
    ['espalda', 'brazos'],
    ['piernas', 'gluteos'],
    ['core', 'full_body'],
  ],
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickByGroups(
  pool: Exercise[],
  groups: string[],
  count: number,
  priorityGroups: string[] = []
): Exercise[] {
  const matches = pool.filter((e) => e.muscle_groups.some((g) => groups.includes(g)));
  // Los grupos prioritarios (del análisis corporal) van primero
  const prioritized = [
    ...shuffle(matches.filter((e) => e.muscle_groups.some((g) => priorityGroups.includes(g)))),
    ...shuffle(matches.filter((e) => !e.muscle_groups.some((g) => priorityGroups.includes(g)))),
  ];
  const picked: Exercise[] = [];
  for (const ex of prioritized) {
    if (picked.length >= count) break;
    if (!picked.find((p) => p.id === ex.id)) picked.push(ex);
  }
  return picked;
}

function toGenerated(ex: Exercise, scheme: { sets: number; reps: number; rest: number }): GeneratedExercise {
  // Cardio e isométricos usan tiempo; el resto usa reps
  if (ex.default_seconds != null && ex.default_reps == null) {
    return {
      exercise: ex,
      sets: ex.default_sets ?? scheme.sets,
      reps: null,
      seconds: ex.default_seconds,
      rest_seconds: ex.rest_seconds,
    };
  }
  return {
    exercise: ex,
    sets: scheme.sets,
    reps: ex.default_reps != null ? Math.round((ex.default_reps + scheme.reps) / 2) : scheme.reps,
    seconds: null,
    rest_seconds: scheme.rest,
  };
}

/**
 * Genera el plan semanal: reparte los días según el bias del personaje y
 * arma cada día con ejercicios del catálogo filtrados por nivel del usuario.
 */
export function generateWeeklyPlan(
  character: Character,
  fitnessLevel: FitnessLevel,
  daysPerWeek: number,
  allExercises: Exercise[],
  priorityGroups: string[] = []
): GeneratedDay[] {
  daysPerWeek = Math.min(7, Math.max(1, Math.round(daysPerWeek) || 1));
  const maxDiff = MAX_DIFFICULTY[fitnessLevel];
  const pool = allExercises.filter((e) => e.difficulty <= maxDiff);
  const scheme = REP_SCHEMES[character.archetype];
  const bias = character.routine_bias;

  // Repartir días por categoría (mínimo 1 día de la categoría dominante)
  let strengthDays = Math.round(bias.strength * daysPerWeek);
  let cardioDays = Math.round(bias.cardio * daysPerWeek);
  let flexDays = daysPerWeek - strengthDays - cardioDays;
  while (flexDays < 0) {
    if (cardioDays > strengthDays) cardioDays--;
    else strengthDays--;
    flexDays = daysPerWeek - strengthDays - cardioDays;
  }
  const dominant = Object.entries(bias).sort((a, b) => b[1] - a[1])[0][0];
  if (dominant === 'strength' && strengthDays === 0) { strengthDays = 1; flexDays = Math.max(0, flexDays - 1); }
  if (dominant === 'cardio' && cardioDays === 0) { cardioDays = 1; flexDays = Math.max(0, flexDays - 1); }
  if (dominant === 'flexibility' && flexDays === 0) flexDays = 1;

  const days: GeneratedDay[] = [];
  // Si el filtro por dificultad deja una categoría vacía, usar el catálogo completo de esa categoría
  const byCategory = (cat: string) => {
    const filtered = pool.filter((e) => e.category === cat);
    return filtered.length > 0 ? filtered : allExercises.filter((e) => e.category === cat);
  };
  const strengthPool = byCategory('strength');
  const cardioPool = byCategory('cardio');
  const flexPool = byCategory('flexibility');

  const split = STRENGTH_SPLITS[Math.min(strengthDays, 4) as 1 | 2 | 3 | 4] ?? STRENGTH_SPLITS[1];
  const splitNames: Record<string, string> = {
    pecho: 'Empuje', espalda: 'Tracción', piernas: 'Pierna y Glúteo',
    full_body: 'Cuerpo Completo', core: 'Core', hombros: 'Empuje', gluteos: 'Pierna y Glúteo', brazos: 'Brazos',
  };

  for (let i = 0; i < strengthDays; i++) {
    const groups = split[i % split.length];
    const main = pickByGroups(strengthPool, groups, 5, priorityGroups);
    // Calentamiento de movilidad + remate de core
    const warmup = pickByGroups(flexPool, groups.concat('full_body'), 1);
    const exercises = [...warmup, ...main].map((e) => toGenerated(e, scheme));
    days.push({
      name: `Mazmorra de Fuerza ${strengthDays > 1 ? i + 1 : ''}`.trim(),
      focus: `Fuerza — ${splitNames[groups[0]] ?? 'General'}`,
      exercises,
    });
  }

  for (let i = 0; i < cardioDays; i++) {
    const isHiit = character.archetype === 'definicion' || character.archetype === 'agilidad';
    const main = shuffle(cardioPool).slice(0, isHiit ? 5 : 3);
    const cooldown = shuffle(flexPool).slice(0, 2);
    days.push({
      name: `Cacería de Resistencia ${cardioDays > 1 ? i + 1 : ''}`.trim(),
      focus: isHiit ? 'Cardio — HIIT' : 'Cardio — Resistencia',
      exercises: [...main, ...cooldown].map((e) => toGenerated(e, scheme)),
    });
  }

  for (let i = 0; i < flexDays; i++) {
    const main = shuffle(flexPool).slice(0, 7);
    days.push({
      name: `Meditación del Monje ${flexDays > 1 ? i + 1 : ''}`.trim(),
      focus: 'Movilidad y Flexibilidad',
      exercises: main.map((e) => toGenerated(e, scheme)),
    });
  }

  // Intercalar: fuerza, cardio, flex repartidos en la semana
  const ordered: GeneratedDay[] = [];
  const buckets = [
    days.filter((d) => d.focus.startsWith('Fuerza')),
    days.filter((d) => d.focus.startsWith('Cardio')),
    days.filter((d) => d.focus.startsWith('Movilidad')),
  ];
  while (ordered.length < days.length) {
    for (const b of buckets) {
      const next = b.shift();
      if (next) ordered.push(next);
    }
  }
  // No guardar días vacíos (catálogo insuficiente)
  return ordered.filter((d) => d.exercises.length > 0);
}
