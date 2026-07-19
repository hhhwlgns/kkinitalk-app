import { buildNextMealAdvice, buildNutritionBalanceInsight, buildNutritionTrend, summarizeNutritionForDate } from '../src/domain/dailyNutrition';
import type { Meal } from '../src/domain/types';

function meal(id: string, date: string, proteinG: number, sodiumMg: number): Meal {
  return {
    id,
    userId: 'elderly-smoke',
    slot: id.includes('breakfast') ? 'breakfast' : 'lunch',
    photoUri: null,
    foods: [],
    totalNutrients: { calories: 500, carbsG: 55, proteinG, fatG: 14, sodiumMg },
    fitness: sodiumMg > 1500 ? 'caution' : 'good',
    fitnessNote: 'smoke',
    nextMealSuggestion: null,
    recordedAt: `${date}T03:00:00.000Z`,
  };
}

const meals = [
  meal('breakfast-1', '2026-07-18', 10, 300),
  meal('lunch-1', '2026-07-18', 12, 400),
  meal('breakfast-2', '2026-07-19', 8, 900),
  meal('lunch-2', '2026-07-19', 9, 900),
];

const empty = summarizeNutritionForDate(meals, '2026-07-17');
if (empty.mealCount !== 0 || empty.states.calories !== 'missing') {
  throw new Error('기록 없음과 섭취량 0을 구분하지 못했습니다.');
}

const today = summarizeNutritionForDate(meals, '2026-07-19');
if (today.totals.calories !== 1000 || today.totals.sodiumMg !== 1800) {
  throw new Error(`일별 영양 합계가 올바르지 않습니다: ${JSON.stringify(today.totals)}`);
}
if (today.states.sodiumMg !== 'caution' || today.states.proteinG !== 'low') {
  throw new Error(`영양 범위 상태가 올바르지 않습니다: ${JSON.stringify(today.states)}`);
}

const advice = buildNextMealAdvice(today);
if (!advice.reason.includes('간을 세게 하지 않은') || !advice.title.includes('단백질') || advice.menu.length === 0) {
  throw new Error(`다음 메뉴 조언이 여러 영양 상태와 나트륨 행동을 종합하지 못했습니다: ${JSON.stringify(advice)}`);
}

const balance = buildNutritionBalanceInsight(today);
if (balance.status !== 'needsAttention' || balance.focusKeys.length < 2 || !balance.focusKeys.includes('sodiumMg')) {
  throw new Error(`종합 영양 균형이 부족 영양소와 상한 지표를 함께 반영하지 못했습니다: ${JSON.stringify(balance)}`);
}

const trend = buildNutritionTrend(meals, '2026-07-19', 3);
if (trend.length !== 3 || trend[0].date !== '2026-07-17' || trend[2].date !== '2026-07-19') {
  throw new Error(`최근 영양 추이 날짜가 올바르지 않습니다: ${JSON.stringify(trend.map((item) => item.date))}`);
}

console.log('SMOKE TEST PASSED: redesign daily nutrition aggregation distinguishes missing records and builds range-aware advice', {
  totals: today.totals,
  states: today.states,
  advice,
  balance,
});
