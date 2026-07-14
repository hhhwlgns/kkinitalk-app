// Single source of truth for turning raw numbers into a good/caution/danger
// status. Every screen reads status from here so color + emphasis stay
// consistent — a "위험" sodium value looks the same on home, history, analysis.
import type { NutrientBreakdown } from './types';

export type NutrientStatus = 'good' | 'caution' | 'danger';

// Thresholds tuned to the mock nutrition targets (see nutritionAnalysis).
const SODIUM_CAUTION = 1500;
const SODIUM_DANGER = 2000;
const PROTEIN_TARGET = 45;

export function sodiumStatus(sodiumMg: number): NutrientStatus {
  if (sodiumMg > SODIUM_DANGER) return 'danger';
  if (sodiumMg > SODIUM_CAUTION) return 'caution';
  return 'good';
}

export function proteinStatus(proteinG: number): NutrientStatus {
  if (proteinG >= PROTEIN_TARGET * 0.5) return 'good';
  if (proteinG >= PROTEIN_TARGET * 0.25) return 'caution';
  return 'danger';
}

// Overall meal verdict rolled up from the individual nutrients.
export function mealStatus(totals: NutrientBreakdown): NutrientStatus {
  const s = sodiumStatus(totals.sodiumMg);
  if (s === 'danger') return 'danger';
  const p = proteinStatus(totals.proteinG);
  if (s === 'caution' || p === 'danger') return 'caution';
  return 'good';
}

// Medication adherence (taken / scheduled, 0-100).
export function adherenceStatus(ratePct: number): NutrientStatus {
  if (ratePct >= 80) return 'good';
  if (ratePct >= 50) return 'caution';
  return 'danger';
}

// Short elder-friendly label per status (generic; screens can override).
export const STATUS_WORD: Record<NutrientStatus, string> = {
  good: '양호',
  caution: '주의',
  danger: '위험',
};
