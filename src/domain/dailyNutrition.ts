import type { Meal, NutrientBreakdown, NutritionGoal, NutrientRange } from './types';

export type RangeState = 'missing' | 'low' | 'good' | 'caution' | 'high';

export interface DailyNutritionSummary {
  date: string;
  totals: NutrientBreakdown;
  mealCount: number;
  states: Record<keyof NutrientBreakdown, RangeState>;
}

export interface NutritionBalanceInsight {
  score: number;
  status: 'missing' | 'needsAttention' | 'balanced';
  title: string;
  description: string;
  focusKeys: (keyof NutrientBreakdown)[];
  expectedProgress?: number;
  basisLabel?: string;
}

export interface NutritionTimingContext {
  now: Date;
  isToday: boolean;
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
  if (summary.states.proteinG === 'low') {
    return {
      title: summary.states.sodiumMg === 'caution' || summary.states.sodiumMg === 'high'
        ? '단백질은 채우고, 국물은 가볍게 드세요'
        : '단백질이 조금 부족해요',
      menu: '고등어구이와 나물',
      reason: summary.states.sodiumMg === 'caution' || summary.states.sodiumMg === 'high'
        ? '간을 세게 하지 않은 생선이나 두부와 채소를 함께 드시면 균형을 맞추기 좋아요.'
        : '생선과 두부 같은 부드러운 단백질 반찬을 곁들여보세요.',
    };
  }
  if (summary.states.calories === 'low') {
    return {
      title: '오늘 식사량이 조금 부족해요',
      menu: '소불고기 채소덮밥',
      reason: '밥과 단백질 반찬을 함께 드시면 기운을 채우는 데 도움이 돼요.',
    };
  }
  if (summary.states.sodiumMg === 'caution' || summary.states.sodiumMg === 'high') {
    return {
      title: '전체 균형은 좋고, 간만 가볍게 해보세요',
      menu: '두부 채소구이',
      reason: '다음 끼니도 단백질과 채소를 챙기되 국물과 짠 반찬은 조금만 드셔보세요.',
    };
  }
  return {
    title: '오늘은 골고루 잘 드셨어요',
    menu: '닭가슴살 채소볶음',
    reason: '다음 끼니도 채소와 단백질을 함께 드셔보세요.',
  };
}

export function buildNutritionBalanceInsight(summary: DailyNutritionSummary): NutritionBalanceInsight {
  if (summary.mealCount === 0) {
    return {
      score: 0,
      status: 'missing',
      title: '식사를 기록하면 균형을 알려드려요',
      description: '사진 한 장이면 오늘 드신 음식과 다음 끼니를 함께 살펴볼 수 있어요.',
      focusKeys: [],
    };
  }

  const balanceKeys: (keyof NutrientBreakdown)[] = ['calories', 'carbsG', 'proteinG', 'fatG'];
  const penalties: Record<RangeState, number> = { missing: 100, low: 28, good: 0, caution: 18, high: 34 };
  const score = Math.max(0, Math.round(100 - balanceKeys.reduce((sum, key) => sum + penalties[summary.states[key]], 0) / balanceKeys.length));
  const focusKeys = balanceKeys
    .filter((key) => summary.states[key] !== 'good')
    .sort((a, b) => penalties[summary.states[b]] - penalties[summary.states[a]])
    .slice(0, 2);
  const sodiumNeedsAttention = summary.states.sodiumMg === 'caution' || summary.states.sodiumMg === 'high';
  if (sodiumNeedsAttention) focusKeys.push('sodiumMg');

  const labels: Record<keyof NutrientBreakdown, string> = {
    calories: '식사량', carbsG: '탄수화물', proteinG: '단백질', fatG: '지방', sodiumMg: '나트륨',
  };
  const focusLabels = focusKeys.map((key) => labels[key]);
  const balanced = focusKeys.length === 0;
  return {
    score,
    status: balanced ? 'balanced' : 'needsAttention',
    title: balanced ? '오늘은 골고루 잘 드셨어요' : `${focusLabels.slice(0, 2).join('·')}을 살펴보면 좋아요`,
    description: balanced
      ? '지금처럼 다음 끼니도 밥, 단백질 반찬과 채소를 함께 드셔보세요.'
      : sodiumNeedsAttention
        ? '다음 끼니는 국물보다 단백질 반찬과 채소를 곁들여보세요.'
        : '부족한 부분을 다음 끼니에서 편안하게 채워보세요.',
    focusKeys,
  };
}

export function expectedNutritionProgress(summary: DailyNutritionSummary, context: NutritionTimingContext): number {
  if (!context.isToday) return 1;
  const hour = context.now.getHours() + context.now.getMinutes() / 60;
  const timeProgress = hour < 6 ? 0.12 : hour < 11 ? 0.3 : hour < 16 ? 0.62 : hour < 21 ? 0.9 : 1;
  const mealProgress = Math.min(1, summary.mealCount / 3);
  return Math.max(0.22, Math.min(1, Math.max(timeProgress, mealProgress)));
}

export function buildContextualNutritionBalanceInsight(
  summary: DailyNutritionSummary,
  goal: NutritionGoal | Omit<NutritionGoal, 'id' | 'userId' | 'updatedAt'>,
  context: NutritionTimingContext,
): NutritionBalanceInsight {
  if (summary.mealCount === 0) return buildNutritionBalanceInsight(summary);

  const expectedProgress = expectedNutritionProgress(summary, context);
  const keys: (keyof NutrientBreakdown)[] = ['calories', 'carbsG', 'proteinG', 'fatG'];
  const ratios = keys.map((key) => ({
    key,
    ratio: summary.totals[key] / Math.max(1, goal[key].target * expectedProgress),
  }));
  const score = Math.round(ratios.reduce((sum, item) => {
    const distance = Math.abs(1 - Math.min(1.5, item.ratio));
    return sum + Math.max(0, 100 - distance * 100);
  }, 0) / ratios.length);
  const focusKeys = ratios
    .filter((item) => item.ratio < 0.78 || item.ratio > 1.22)
    .sort((a, b) => Math.abs(1 - b.ratio) - Math.abs(1 - a.ratio))
    .map((item) => item.key)
    .slice(0, 2);
  const sodiumRatio = summary.totals.sodiumMg / Math.max(1, goal.sodiumMg.max * expectedProgress);
  if (sodiumRatio > 1.05) focusKeys.push('sodiumMg');
  const labels: Record<keyof NutrientBreakdown, string> = {
    calories: '식사량', carbsG: '탄수화물', proteinG: '단백질', fatG: '지방', sodiumMg: '나트륨',
  };
  const balanced = focusKeys.length === 0;
  const pct = Math.round(expectedProgress * 100);
  return {
    score,
    status: balanced ? 'balanced' : 'needsAttention',
    title: balanced ? '지금까지 알맞게 드셨어요' : `${focusKeys.slice(0, 2).map((key) => labels[key]).join('·')}을 살펴보면 좋아요`,
    description: balanced
      ? `이 시간까지 필요한 영양을 고르게 채우고 있어요.`
      : sodiumRatio > 1.05
        ? '다음 끼니는 단백질과 채소를 챙기고, 국물과 짠 반찬은 가볍게 드세요.'
        : '아직 남은 끼니가 있으니 부족한 부분을 편안하게 채워보세요.',
    focusKeys,
    expectedProgress,
    basisLabel: context.isToday ? `현재 시각 기준 하루 목표의 약 ${pct}%와 비교했어요` : '하루 전체 기록과 비교했어요',
  };
}
