import type { Meal, NutrientBreakdown, NutritionGoal, NutrientRange } from './types';

export type RangeState = 'missing' | 'low' | 'good' | 'caution' | 'high';

export interface DailyNutritionSummary {
  date: string;
  totals: NutrientBreakdown;
  mealCount: number;
  states: Record<keyof NutrientBreakdown, RangeState>;
}

export const DEFAULT_NUTRITION_GOAL: Omit<NutritionGoal, 'id' | 'userId' | 'updatedAt'> = {
  calories: { min: 1200, target: 1400, max: 1650 },
  carbsG: { min: 130, target: 153, max: 190 },
  proteinG: { min: 40, target: 45, max: 70 },
  fatG: { min: 30, target: 45, max: 60 },
  sodiumMg: { min: 0, target: 1400, max: 1640 },
};

const EMPTY_NUTRIENTS: NutrientBreakdown = {
  calories: 0,
  carbsG: 0,
  proteinG: 0,
  fatG: 0,
  sodiumMg: 0,
};

export function nutrientRangeState(value: number, range: NutrientRange, hasRecords: boolean): RangeState {
  if (!hasRecords) return 'missing';
  if (value < range.min) return 'low';
  if (value <= range.max) return 'good';
  if (value <= range.max * 1.2) return 'caution';
  return 'high';
}

export function mealsForDate(meals: Meal[], date: string): Meal[] {
  return meals.filter((meal) => meal.recordedAt.slice(0, 10) === date);
}

export function summarizeNutritionForDate(
  meals: Meal[],
  date: string,
  goal: NutritionGoal | Omit<NutritionGoal, 'id' | 'userId' | 'updatedAt'> = DEFAULT_NUTRITION_GOAL,
): DailyNutritionSummary {
  const dailyMeals = mealsForDate(meals, date);
  const totals = dailyMeals.reduce<NutrientBreakdown>(
    (sum, meal) => ({
      calories: sum.calories + meal.totalNutrients.calories,
      carbsG: sum.carbsG + meal.totalNutrients.carbsG,
      proteinG: sum.proteinG + meal.totalNutrients.proteinG,
      fatG: sum.fatG + meal.totalNutrients.fatG,
      sodiumMg: sum.sodiumMg + meal.totalNutrients.sodiumMg,
    }),
    { ...EMPTY_NUTRIENTS },
  );
  const hasRecords = dailyMeals.length > 0;

  return {
    date,
    totals,
    mealCount: dailyMeals.length,
    states: {
      calories: nutrientRangeState(totals.calories, goal.calories, hasRecords),
      carbsG: nutrientRangeState(totals.carbsG, goal.carbsG, hasRecords),
      proteinG: nutrientRangeState(totals.proteinG, goal.proteinG, hasRecords),
      fatG: nutrientRangeState(totals.fatG, goal.fatG, hasRecords),
      sodiumMg: nutrientRangeState(totals.sodiumMg, goal.sodiumMg, hasRecords),
    },
  };
}

export function recentDateStrings(endDate: string, count: number): string[] {
  const [year, month, day] = endDate.split('-').map(Number);
  const end = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (count - index - 1));
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${mm}-${dd}`;
  });
}

export function buildNutritionTrend(
  meals: Meal[],
  endDate: string,
  count: number,
  goal?: NutritionGoal,
): DailyNutritionSummary[] {
  return recentDateStrings(endDate, count).map((date) => summarizeNutritionForDate(meals, date, goal));
}

export function buildNextMealAdvice(summary: DailyNutritionSummary): {
  title: string;
  menu: string;
  reason: string;
} {
  if (summary.mealCount === 0) {
    return {
      title: '아직 식사 기록이 없어요',
      menu: '부드러운 계란죽',
      reason: '사진을 찍어주시면 오늘 드신 음식에 맞춰 다음 메뉴를 알려드릴게요.',
    };
  }
  if (summary.states.sodiumMg === 'caution' || summary.states.sodiumMg === 'high') {
    return {
      title: '오늘 나트륨을 충분히 드셨어요',
      menu: '두부 채소구이',
      reason: '다음 끼니는 국물 없이 담백하게 드시는 게 좋아요.',
    };
  }
  if (summary.states.proteinG === 'low') {
    return {
      title: '단백질이 조금 부족해요',
      menu: '고등어구이와 나물',
      reason: '생선과 두부 같은 부드러운 단백질 반찬을 곁들여보세요.',
    };
  }
  if (summary.states.calories === 'low') {
    return {
      title: '오늘 식사량이 조금 부족해요',
      menu: '소불고기 채소덮밥',
      reason: '밥과 단백질 반찬을 함께 드시면 기운을 채우는 데 도움이 돼요.',
    };
  }
  return {
    title: '오늘은 골고루 잘 드셨어요',
    menu: '닭가슴살 채소볶음',
    reason: '다음 끼니도 채소와 단백질을 함께 드셔보세요.',
  };
}
