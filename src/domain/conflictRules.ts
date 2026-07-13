export interface ConflictRule {
  medicationKeyword: string;
  foodKeyword: string;
  warning: string;
}

export const CONFLICT_RULES: ConflictRule[] = [
  {
    medicationKeyword: '혈압약',
    foodKeyword: '자몽',
    warning: '혈압약과 자몽(자몽주스 포함)을 함께 섭취하면 약물 부작용 위험이 커질 수 있어요.',
  },
  {
    medicationKeyword: '당뇨약',
    foodKeyword: '자몽',
    warning: '당뇨약과 자몽을 함께 섭취하면 약효에 영향을 줄 수 있어요.',
  },
  {
    medicationKeyword: '관절약',
    foodKeyword: '술',
    warning: '관절약(소염진통제 계열)과 술을 함께 섭취하면 위장 출혈 위험이 커질 수 있어요.',
  },
];

export interface ConflictWarning {
  medicationName: string;
  foodName: string;
  warning: string;
}

export function findConflicts(
  medications: { name: string; conflictFoods: string[] }[],
  foodNames: string[],
): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];

  for (const medication of medications) {
    const matchingRules = CONFLICT_RULES.filter((rule) => medication.name.includes(rule.medicationKeyword));
    for (const rule of matchingRules) {
      const matchedFood = foodNames.find((food) => food.includes(rule.foodKeyword));
      if (matchedFood) {
        warnings.push({ medicationName: medication.name, foodName: matchedFood, warning: rule.warning });
      }
    }

    for (const conflictFood of medication.conflictFoods) {
      const matchedFood = foodNames.find((food) => food.includes(conflictFood));
      if (matchedFood && !warnings.some((w) => w.medicationName === medication.name && w.foodName === matchedFood)) {
        warnings.push({
          medicationName: medication.name,
          foodName: matchedFood,
          warning: `${medication.name} 복용 중에는 ${conflictFood} 섭취를 피하는 것이 좋아요.`,
        });
      }
    }
  }

  return warnings;
}
