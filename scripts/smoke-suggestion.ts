import { assessMealFitness, suggestNextMeal } from '../src/mocks/nutritionAnalysis';
import type { HealthProfile, Meal, NutrientBreakdown } from '../src/domain/types';

function buildProfile(overrides: Partial<HealthProfile>): HealthProfile {
  return {
    id: 'profile-test',
    userId: 'elderly-self',
    name: '어르신',
    age: 78,
    sex: 'unspecified',
    conditions: [],
    medications: [],
    swallowingDifficulty: false,
    avoidedFoods: [],
    recentWeightKg: null,
    appetiteLevel: 'normal',
    createdAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z',
    ...overrides,
  };
}

function buildMeal(overrides: Partial<Meal>): Meal {
  return {
    id: 'meal-test',
    userId: 'elderly-self',
    slot: 'breakfast',
    photoUri: null,
    foods: [],
    totalNutrients: { calories: 0, carbsG: 0, proteinG: 0, fatG: 0, sodiumMg: 0 },
    fitness: 'good',
    fitnessNote: '',
    nextMealSuggestion: null,
    recordedAt: '2026-07-12T08:00:00.000Z',
    ...overrides,
  };
}

const highSodium: NutrientBreakdown = { calories: 500, carbsG: 50, proteinG: 20, fatG: 10, sodiumMg: 2000 };
const lowSodium: NutrientBreakdown = { calories: 400, carbsG: 50, proteinG: 20, fatG: 10, sodiumMg: 500 };

function run() {
  const baseFitness = assessMealFitness(highSodium, null);
  if (baseFitness.fitness !== 'caution') {
    throw new Error('expected caution fitness for high sodium meal');
  }

  const hypertensionProfile = buildProfile({ conditions: ['고혈압'] });
  const hypertensionFitness = assessMealFitness(highSodium, hypertensionProfile);
  if (hypertensionFitness.fitnessNote === baseFitness.fitnessNote) {
    throw new Error('expected HealthProfile-aware fitness note to differ for hypertension condition');
  }

  const goodFitness = assessMealFitness(lowSodium, null);
  if (goodFitness.fitness !== 'good') {
    throw new Error('expected good fitness for low sodium meal');
  }

  const noAvoidance = suggestNextMeal('breakfast', buildProfile({ avoidedFoods: [] }), []);
  const withAvoidance = suggestNextMeal('breakfast', buildProfile({ avoidedFoods: ['짠 음식'] }), []);
  if (noAvoidance === withAvoidance) {
    throw new Error('expected suggestion to differ when HealthProfile has avoidedFoods');
  }
  if (!withAvoidance.includes('짠 음식')) {
    throw new Error('expected suggestion to mention avoided food');
  }

  const noCautionHistory = suggestNextMeal('lunch', null, []);
  const cautionHistory = suggestNextMeal('lunch', null, [
    buildMeal({ fitness: 'caution' }),
    buildMeal({ fitness: 'good' }),
  ]);
  if (noCautionHistory === cautionHistory) {
    throw new Error('expected suggestion to differ based on recent meal fitness history');
  }

  console.log('SMOKE TEST PASSED: fitness feedback reflects HealthProfile, and next-meal suggestion varies by avoided foods and recent meal history', {
    baseFitnessNote: baseFitness.fitnessNote,
    hypertensionFitnessNote: hypertensionFitness.fitnessNote,
    noAvoidance,
    withAvoidance,
    noCautionHistory,
    cautionHistory,
  });
}

run();
