import type { FoodItem, HealthProfile, Meal, MealFitness, MealSlot, NutrientBreakdown } from '../domain/types';

export const FOOD_BANK: FoodItem[] = [
  { id: 'food-rice', name: '흰쌀밥', nutrients: { calories: 300, carbsG: 65, proteinG: 5, fatG: 1, sodiumMg: 5 } },
  { id: 'food-doenjang-guk', name: '된장국', nutrients: { calories: 90, carbsG: 8, proteinG: 6, fatG: 3, sodiumMg: 850 } },
  { id: 'food-grilled-fish', name: '고등어구이', nutrients: { calories: 220, carbsG: 0, proteinG: 20, fatG: 15, sodiumMg: 380 } },
  { id: 'food-kimchi', name: '배추김치', nutrients: { calories: 30, carbsG: 5, proteinG: 1, fatG: 0, sodiumMg: 500 } },
  { id: 'food-namul', name: '시금치나물', nutrients: { calories: 40, carbsG: 4, proteinG: 2, fatG: 2, sodiumMg: 250 } },
  { id: 'food-tofu-stew', name: '순두부찌개', nutrients: { calories: 180, carbsG: 10, proteinG: 12, fatG: 9, sodiumMg: 900 } },
  { id: 'food-bulgogi', name: '소불고기', nutrients: { calories: 320, carbsG: 12, proteinG: 25, fatG: 18, sodiumMg: 650 } },
  { id: 'food-fruit', name: '사과', nutrients: { calories: 95, carbsG: 25, proteinG: 0, fatG: 0, sodiumMg: 2 } },
];

export function analyzeMockPhoto(seedIndex?: number): FoodItem[] {
  const count = 3;
  const startIndex =
    seedIndex !== undefined ? seedIndex % FOOD_BANK.length : Math.floor(Math.random() * FOOD_BANK.length);

  const picked: FoodItem[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const item = FOOD_BANK[(startIndex + offset) % FOOD_BANK.length];
    picked.push({ ...item, id: `${item.id}-${Date.now()}-${offset}` });
  }
  return picked;
}

export function sumNutrients(foods: FoodItem[]): NutrientBreakdown {
  return foods.reduce<NutrientBreakdown>(
    (total, food) => ({
      calories: total.calories + food.nutrients.calories,
      carbsG: total.carbsG + food.nutrients.carbsG,
      proteinG: total.proteinG + food.nutrients.proteinG,
      fatG: total.fatG + food.nutrients.fatG,
      sodiumMg: total.sodiumMg + food.nutrients.sodiumMg,
    }),
    { calories: 0, carbsG: 0, proteinG: 0, fatG: 0, sodiumMg: 0 },
  );
}

const SODIUM_CAUTION_THRESHOLD_MG = 1500;

export function assessMealFitness(
  totalNutrients: NutrientBreakdown,
  profile?: HealthProfile | null,
): {
  fitness: MealFitness;
  fitnessNote: string;
} {
  const hasBloodPressureOrDiabetesRisk =
    profile?.conditions.some((c) => c === '고혈압' || c === '당뇨') ?? false;

  if (totalNutrients.sodiumMg > SODIUM_CAUTION_THRESHOLD_MG) {
    return {
      fitness: 'caution',
      fitnessNote: hasBloodPressureOrDiabetesRisk
        ? '나트륨 섭취가 높아요. 고혈압/당뇨가 있으시니 국물은 남기고 싱겁게 드시는 게 좋아요.'
        : '나트륨 섭취가 다소 높아요. 국물은 조금 남기고 싱겁게 드시면 좋아요.',
    };
  }
  return {
    fitness: 'good',
    fitnessNote: '오늘 식사는 균형이 잘 맞아요. 잘 챙겨 드셨어요!',
  };
}

const NEXT_MEAL_SUGGESTIONS: Record<MealSlot, string[]> = {
  breakfast: [
    '점심에는 나물과 생선 반찬으로 담백하게 드셔보세요.',
    '점심에는 채소 위주로 가볍게 드시고 국물은 줄여보세요.',
  ],
  lunch: [
    '저녁에는 국물을 줄이고 채소 반찬을 늘려보세요.',
    '저녁에는 단백질 반찬(생선, 두부)을 곁들여보세요.',
  ],
  dinner: [
    '내일 아침엔 소화가 편한 죽이나 계란찜을 추천해요.',
    '내일 아침엔 나트륨이 적은 담백한 반찬으로 시작해보세요.',
  ],
  snack: [
    '다음 식사는 과일보다 단백질 반찬을 곁들여보세요.',
    '다음 식사는 채소를 충분히 곁들여보세요.',
  ],
};

export function suggestNextMeal(
  slot: MealSlot,
  profile?: HealthProfile | null,
  recentMeals?: Meal[],
  variantOverride?: number,
): string {
  const variants = NEXT_MEAL_SUGGESTIONS[slot];
  const recentCautionCount = (recentMeals ?? []).filter((m) => m.fitness === 'caution').length;
  const variant =
    variantOverride !== undefined ? variants[variantOverride % variants.length] : recentCautionCount > 0 ? variants[1] : variants[0];

  const avoidedFoods = profile?.avoidedFoods.filter((food) => food !== '없음') ?? [];
  if (avoidedFoods.length > 0) {
    return `${variant} ${avoidedFoods.join(', ')}은 피해주세요.`;
  }

  return variant;
}

export function inferMealSlot(date: Date): MealSlot {
  const hour = date.getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
}

const NUTRIENT_TARGETS = {
  calories: 1400,
  sodiumMg: 1640,
  proteinG: 45,
  carbsG: 153,
};

export const DAILY_CALORIE_TARGET = NUTRIENT_TARGETS.calories;
export const MEAL_CALORIE_TARGET = Math.round(NUTRIENT_TARGETS.calories / 3);
export const MEAL_CARB_TARGET = Math.round(NUTRIENT_TARGETS.carbsG / 3);

// Not capped at 100 — captions show the real overshoot ("하루 권장의 128%");
// StatusGauge clamps its bar fill internally.
export function nutrientPct(value: number, key: keyof typeof NUTRIENT_TARGETS): number {
  return Math.round((value / NUTRIENT_TARGETS[key]) * 100);
}

// Per-food contribution to the meal's calories & sodium — powers the detailed
// analysis breakdown so users see *which* food drove a warning.
export interface FoodContribution {
  food: FoodItem;
  calories: number;
  sodiumMg: number;
  proteinG: number;
  sodiumShare: number; // 0-100, this food's share of the meal's sodium
}

export function computeFoodContributions(foods: FoodItem[]): FoodContribution[] {
  const totalSodium = foods.reduce((sum, f) => sum + f.nutrients.sodiumMg, 0) || 1;
  return foods
    .map((food) => ({
      food,
      calories: food.nutrients.calories,
      sodiumMg: food.nutrients.sodiumMg,
      proteinG: food.nutrients.proteinG,
      sodiumShare: Math.round((food.nutrients.sodiumMg / totalSodium) * 100),
    }))
    .sort((a, b) => b.sodiumMg - a.sodiumMg);
}

// Actionable, elder-friendly suggestions derived from the meal's numbers + profile.
export function buildMealInsights(
  totals: NutrientBreakdown,
  foods: FoodItem[],
  profile?: HealthProfile | null,
): string[] {
  const insights: string[] = [];
  const contributions = computeFoodContributions(foods);
  const topSodium = contributions[0];

  if (totals.sodiumMg > SODIUM_CAUTION_THRESHOLD_MG && topSodium) {
    insights.push(`나트륨이 높아요. 특히 ${topSodium.food.name}의 국물을 남기면 도움이 돼요.`);
  } else if (totals.sodiumMg <= 800) {
    insights.push('나트륨이 낮아 심심할 수 있어요. 지금처럼 싱겁게 드시면 좋아요.');
  }

  if (nutrientPct(totals.proteinG, 'proteinG') < 50) {
    insights.push('단백질이 조금 부족해요. 다음 끼니에 생선·두부·계란을 곁들여보세요.');
  } else {
    insights.push('단백질을 충분히 드셨어요. 근력 유지에 좋아요.');
  }

  const hasHypertension = profile?.conditions.some((c) => c === '고혈압') ?? false;
  if (hasHypertension && totals.sodiumMg > 1200) {
    insights.push('고혈압이 있으시니 국·찌개는 절반만 드시는 걸 권해요.');
  }

  if (profile?.swallowingDifficulty) {
    insights.push('삼키기 어려우실 수 있으니 부드럽게 조리한 반찬을 추천해요.');
  }

  return insights;
}
