import type { HunterRank } from '../types/db';

// Umbrales de XP por rango (deben coincidir con rank_for_xp en SQL)
export const RANK_THRESHOLDS: { rank: HunterRank; xp: number }[] = [
  { rank: 'E', xp: 0 },
  { rank: 'D', xp: 500 },
  { rank: 'C', xp: 1500 },
  { rank: 'B', xp: 3500 },
  { rank: 'A', xp: 7000 },
  { rank: 'S', xp: 15000 },
];

export const XP = {
  workout: 100,
  quest: 50,
  streak7Bonus: 200,
  allMealsLogged: 30,
} as const;

export const RANK_NAMES: Record<HunterRank, string> = {
  E: 'Cazador Rango E',
  D: 'Cazador Rango D',
  C: 'Cazador Rango C',
  B: 'Cazador Rango B',
  A: 'Cazador Rango A',
  S: 'Cazador Rango S',
};

export function nextRankInfo(xp: number) {
  const current = [...RANK_THRESHOLDS].reverse().find((r) => xp >= r.xp)!;
  const next = RANK_THRESHOLDS[RANK_THRESHOLDS.findIndex((r) => r.rank === current.rank) + 1];
  if (!next) return { current: current.rank, next: null, progress: 1, remaining: 0 };
  return {
    current: current.rank,
    next: next.rank,
    progress: (xp - current.xp) / (next.xp - current.xp),
    remaining: next.xp - xp,
  };
}

// Imágenes de personajes: forma según rango del usuario.
// Mientras el usuario no genere las imágenes, usamos require condicional vía registry.
// Las claves coinciden con characters.slug en la BD.
export type CharacterForm = 'base' | 'awakened' | 'final';

export function formForRank(rank: HunterRank): CharacterForm {
  if (rank === 'S') return 'final';
  if (rank === 'C' || rank === 'B' || rank === 'A') return 'awakened';
  return 'base';
}

// Registry de imágenes. Cuando el usuario descargue las imágenes generadas,
// este archivo se actualiza para apuntar a los .png reales (Fase 6).
// Por ahora todas usan el placeholder.
const placeholder = require('../../assets/characters/placeholder.png');

export const characterImages: Record<string, Record<CharacterForm, number>> = {
  kael: { base: placeholder, awakened: placeholder, final: placeholder },
  ragnar: { base: placeholder, awakened: placeholder, final: placeholder },
  yuki: { base: placeholder, awakened: placeholder, final: placeholder },
  ren: { base: placeholder, awakened: placeholder, final: placeholder },
  aria: { base: placeholder, awakened: placeholder, final: placeholder },
  kenta: { base: placeholder, awakened: placeholder, final: placeholder },
};

export function characterImage(slug: string, rank: HunterRank): number {
  const forms = characterImages[slug];
  if (!forms) return placeholder;
  return forms[formForRank(rank)];
}
