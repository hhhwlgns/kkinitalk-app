import { mealsCollection } from '../src/mocks/db/collections';
import { createId } from '../src/domain/id';
import type { Meal } from '../src/domain/types';
import { sumNutrients } from '../src/mocks/nutritionAnalysis';

const USER_ID = 'elderly-self';
const TODAY = '2026-07-12';

function buildMeal(overrides: Partial<Meal>): Meal {
  return {
    id: createId('meal'),
    userId: USER_ID,
    slot: 'breakfast',
    photoUri: 'file:///fake/photo.jpg',
    foods: [
      { id: 'food-a', name: '흰쌀밥', nutrients: { calories: 300, carbsG: 65, proteinG: 5, fatG: 1, sodiumMg: 5 } },
      { id: 'food-b', name: '된장국', nutrients: { calories: 90, carbsG: 8, proteinG: 6, fatG: 3, sodiumMg: 850 } },
    ],
    totalNutrients: { calories: 390, carbsG: 73, proteinG: 11, fatG: 4, sodiumMg: 855 },
    fitness: 'good',
    fitnessNote: '오늘 식사는 균형이 잘 맞아요.',
    nextMealSuggestion: '점심에는 나물과 생선 반찬으로 담백하게 드셔보세요.',
    recordedAt: `${TODAY}T08:00:00.000Z`,
    ...overrides,
  };
}

async function writePhase() {
  const breakfast = buildMeal({ slot: 'breakfast', recordedAt: `${TODAY}T08:00:00.000Z` });
  const lunch = buildMeal({
    slot: 'lunch',
    recordedAt: `${TODAY}T12:30:00.000Z`,
    foods: [
      { id: 'food-c', name: '소불고기', nutrients: { calories: 320, carbsG: 12, proteinG: 25, fatG: 18, sodiumMg: 650 } },
    ],
    totalNutrients: { calories: 320, carbsG: 12, proteinG: 25, fatG: 18, sodiumMg: 650 },
    fitness: 'caution',
    fitnessNote: '나트륨 섭취가 다소 높아요.',
  });

  await mealsCollection.upsert(breakfast);
  await mealsCollection.upsert(lunch);

  const stored = await mealsCollection.query((item) => item.userId === USER_ID);
  if (stored.length !== 2) {
    throw new Error(`expected 2 meals, got ${stored.length}`);
  }

  console.log('MEAL_WRITE_PHASE_OK');
}

async function readPhase() {
  const stored = await mealsCollection.query((item) => item.userId === USER_ID);
  if (stored.length !== 2) {
    throw new Error(`expected 2 persisted meals after restart, got ${stored.length}`);
  }

  const bySlot = new Map(stored.map((item) => [item.slot, item]));
  const breakfast = bySlot.get('breakfast');
  const lunch = bySlot.get('lunch');

  if (!breakfast || breakfast.fitness !== 'good' || breakfast.foods.length !== 2) {
    throw new Error('breakfast meal mismatch after restart');
  }
  if (!lunch || lunch.fitness !== 'caution' || lunch.totalNutrients.sodiumMg !== 650) {
    throw new Error('lunch meal mismatch after restart');
  }

  const todaysMeals = stored.filter((item) => item.recordedAt.slice(0, 10) === TODAY);
  const dailyTotal = sumNutrients(todaysMeals.flatMap((item) => item.foods));

  const expectedCalories = 300 + 90 + 320;
  if (dailyTotal.calories !== expectedCalories) {
    throw new Error(`expected daily total calories ${expectedCalories}, got ${dailyTotal.calories}`);
  }

  console.log('SMOKE TEST PASSED: meal records persisted across simulated restart and daily nutrition total is queryable', {
    count: stored.length,
    dailyTotal,
  });
}

const phase = process.argv[2];

const run = phase === 'write' ? writePhase() : readPhase();

run.catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exitCode = 1;
});
