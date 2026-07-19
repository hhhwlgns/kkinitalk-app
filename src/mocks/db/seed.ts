import type {
  CheckIn,
  ConditionLevel,
  ConsentRecord,
  FoodItem,
  GuardianAlert,
  GuardianLink,
  HealthProfile,
  Meal,
  MealOrder,
  MealProduct,
  MealSlot,
  Medication,
  MedicationLog,
  NutritionGoal,
  User,
} from '../../domain/types';
import { createId } from '../../domain/id';
import { FOOD_BANK, assessMealFitness, sumNutrients } from '../nutritionAnalysis';
import {
  checkInsCollection,
  consentRecordsCollection,
  guardianAlertsCollection,
  guardianLinksCollection,
  healthProfilesCollection,
  mealOrdersCollection,
  mealProductsCollection,
  mealsCollection,
  medicationLogsCollection,
  medicationsCollection,
  nutritionGoalsCollection,
  usersCollection,
} from './collections';

const ELDERLY_USER_ID = 'elderly-self';
const GUARDIAN_USER_ID = 'guardian-self';

const GRAPEFRUIT_JUICE: FoodItem = {
  id: 'food-grapefruit-juice',
  name: '자몽주스',
  nutrients: { calories: 120, carbsG: 29, proteinG: 1, fatG: 0, sodiumMg: 5 },
};

function daysAgo(n: number, hour = 9, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - n);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function foodsFrom(names: string[]): FoodItem[] {
  return names.map((name) => {
    const base = name === GRAPEFRUIT_JUICE.name ? GRAPEFRUIT_JUICE : FOOD_BANK.find((food) => food.name === name);
    if (!base) {
      throw new Error(`unknown seed food: ${name}`);
    }
    return { ...base, id: createId(base.id) };
  });
}

function buildMeal(
  userId: string,
  slot: MealSlot,
  foodNames: string[],
  recordedAt: Date,
  profile: HealthProfile,
  nextMealSuggestion: string,
): Meal {
  const foods = foodsFrom(foodNames);
  const totalNutrients = sumNutrients(foods);
  const { fitness, fitnessNote } = assessMealFitness(totalNutrients, profile);
  return {
    id: createId('meal'),
    userId,
    slot,
    photoUri: null,
    foods,
    totalNutrients,
    fitness,
    fitnessNote,
    nextMealSuggestion,
    recordedAt: recordedAt.toISOString(),
  };
}

export async function seedMockDb(): Promise<void> {
  const now = new Date().toISOString();

  const elderlyUser: User = { id: ELDERLY_USER_ID, role: 'elderly', displayName: '김끼니' };
  const guardianUser: User = { id: GUARDIAN_USER_ID, role: 'guardian', displayName: '김보호' };
  await usersCollection.upsert(elderlyUser);
  await usersCollection.upsert(guardianUser);

  const profile: HealthProfile = {
    id: createId('profile'),
    userId: ELDERLY_USER_ID,
    name: '김끼니',
    age: 78,
    sex: 'female',
    conditions: ['고혈압', '당뇨'],
    medications: ['혈압약', '당뇨약'],
    swallowingDifficulty: false,
    avoidedFoods: ['짠 음식'],
    recentWeightKg: 54,
    appetiteLevel: 'normal',
    allergies: [],
    createdAt: now,
    updatedAt: now,
  };
  await healthProfilesCollection.upsert(profile);

  const bloodPressureMed: Medication = {
    id: createId('medication'),
    userId: ELDERLY_USER_ID,
    name: '혈압약',
    category: '혈압약',
    dosage: '5mg',
    doseCount: 1,
    timesOfDay: ['08:00', '20:00'],
    periods: ['morning', 'evening'],
    mealTiming: 'afterMeal',
    conflictFoods: ['자몽'],
    cautionNote: '자몽과 자몽주스는 피해주세요.',
    active: true,
    createdAt: daysAgo(30).toISOString(),
  };
  const diabetesMed: Medication = {
    id: createId('medication'),
    userId: ELDERLY_USER_ID,
    name: '당뇨약',
    category: '당뇨약',
    dosage: '500mg',
    doseCount: 1,
    timesOfDay: ['08:00'],
    periods: ['morning'],
    mealTiming: 'withMeal',
    conflictFoods: [],
    cautionNote: '식사와 함께 드시고 임의로 복용을 중단하지 마세요.',
    active: true,
    createdAt: daysAgo(30).toISOString(),
  };
  const jointMed: Medication = {
    id: createId('medication'),
    userId: ELDERLY_USER_ID,
    name: '관절약',
    category: '진통제',
    dosage: '1정',
    doseCount: 1,
    timesOfDay: ['12:30'],
    periods: ['lunch'],
    mealTiming: 'afterMeal',
    conflictFoods: ['술'],
    cautionNote: '술과 함께 드시면 속이 불편할 수 있어요.',
    active: true,
    createdAt: daysAgo(20).toISOString(),
  };
  const vitaminMed: Medication = {
    id: createId('medication'),
    userId: ELDERLY_USER_ID,
    name: '종합비타민',
    category: '영양제',
    dosage: '1정',
    doseCount: 1,
    timesOfDay: ['09:00'],
    periods: ['morning'],
    mealTiming: 'afterMeal',
    conflictFoods: [],
    cautionNote: null,
    active: true,
    createdAt: daysAgo(20).toISOString(),
  };
  for (const medication of [bloodPressureMed, diabetesMed, jointMed, vitaminMed]) {
    await medicationsCollection.upsert(medication);
  }

  async function logTaken(medication: Medication, dayOffset: number, time: string) {
    const scheduled = daysAgo(dayOffset, Number(time.split(':')[0]), Number(time.split(':')[1]));
    const log: MedicationLog = {
      id: createId('medlog'),
      medicationId: medication.id,
      userId: ELDERLY_USER_ID,
      takenAt: scheduled.toISOString(),
      scheduledFor: scheduled.toISOString(),
    };
    await medicationLogsCollection.upsert(log);
  }

  for (const dayOffset of [3, 2, 1]) {
    await logTaken(bloodPressureMed, dayOffset, '08:00');
    await logTaken(diabetesMed, dayOffset, '08:00');
    await logTaken(jointMed, dayOffset, '12:30');
  }
  await logTaken(vitaminMed, 3, '09:00');
  await logTaken(vitaminMed, 2, '09:00');

  const checkIns: { dayOffset: number; condition: ConditionLevel; hadMeal: boolean; note: string | null }[] = [
    { dayOffset: 6, condition: 'normal', hadMeal: true, note: null },
    { dayOffset: 5, condition: 'good', hadMeal: true, note: null },
    { dayOffset: 4, condition: 'bad', hadMeal: true, note: '기운이 없어요' },
    { dayOffset: 3, condition: 'good', hadMeal: true, note: null },
    { dayOffset: 2, condition: 'normal', hadMeal: true, note: null },
    { dayOffset: 1, condition: 'bad', hadMeal: false, note: '속이 안 좋아요' },
    { dayOffset: 0, condition: 'good', hadMeal: true, note: null },
  ];
  for (const entry of checkIns) {
    const recordedAt = daysAgo(entry.dayOffset, 8, 0);
    const checkIn: CheckIn = {
      id: createId('checkin'),
      userId: ELDERLY_USER_ID,
      date: isoDate(recordedAt),
      condition: entry.condition,
      hadMeal: entry.hadMeal,
      note: entry.note,
      recordedAt: recordedAt.toISOString(),
    };
    await checkInsCollection.upsert(checkIn);
  }

  const meals: Meal[] = [
    buildMeal(
      ELDERLY_USER_ID,
      'breakfast',
      ['흰쌀밥', '시금치나물', '사과'],
      daysAgo(3, 8, 0),
      profile,
      '점심에는 나물과 생선 반찬으로 담백하게 드셔보세요.',
    ),
    buildMeal(
      ELDERLY_USER_ID,
      'lunch',
      ['흰쌀밥', '고등어구이', '배추김치'],
      daysAgo(3, 12, 30),
      profile,
      '저녁에는 국물을 줄이고 채소 반찬을 늘려보세요.',
    ),
    buildMeal(
      ELDERLY_USER_ID,
      'dinner',
      ['순두부찌개', '흰쌀밥', '배추김치'],
      daysAgo(3, 18, 30),
      profile,
      '내일 아침엔 소화가 편한 죽이나 계란찜을 추천해요.',
    ),
    buildMeal(
      ELDERLY_USER_ID,
      'breakfast',
      ['된장국', '순두부찌개', '흰쌀밥'],
      daysAgo(2, 8, 0),
      profile,
      '점심에는 채소 위주로 가볍게 드시고 국물은 줄여보세요.',
    ),
    buildMeal(
      ELDERLY_USER_ID,
      'dinner',
      ['소불고기', '시금치나물', '흰쌀밥'],
      daysAgo(2, 18, 30),
      profile,
      '내일 아침엔 나트륨이 적은 담백한 반찬으로 시작해보세요.',
    ),
    buildMeal(
      ELDERLY_USER_ID,
      'lunch',
      ['고등어구이', '배추김치', '사과'],
      daysAgo(1, 12, 30),
      profile,
      '저녁에는 단백질 반찬(생선, 두부)을 곁들여보세요.',
    ),
    buildMeal(
      ELDERLY_USER_ID,
      'breakfast',
      ['흰쌀밥', '된장국', '자몽주스'],
      daysAgo(0, 8, 0),
      profile,
      '점심에는 나물과 생선 반찬으로 담백하게 드셔보세요.',
    ),
    buildMeal(
      ELDERLY_USER_ID,
      'lunch',
      ['소불고기', '시금치나물', '사과'],
      daysAgo(0, 12, 30),
      profile,
      '저녁에는 국물을 줄이고 채소 반찬을 늘려보세요.',
    ),
  ];
  for (const meal of meals) {
    await mealsCollection.upsert(meal);
  }

  const guardianLink: GuardianLink = {
    id: createId('guardianlink'),
    inviteCode: 'FAMILY1',
    elderlyUserId: ELDERLY_USER_ID,
    guardianUserId: GUARDIAN_USER_ID,
    relationship: '딸',
    permissions: ['view_health', 'manage_profile', 'manage_medications', 'receive_high_risk_alerts', 'send_meals'],
    status: 'connected',
    createdAt: daysAgo(30).toISOString(),
  };
  await guardianLinksCollection.upsert(guardianLink);

  const cautionMeal = meals.find((meal) => meal.fitness === 'caution' && meal.recordedAt.startsWith(isoDate(daysAgo(2))));
  const alerts: GuardianAlert[] = [
    {
      id: `alert-${ELDERLY_USER_ID}-nutrition_risk-${isoDate(daysAgo(2))}`,
      elderlyUserId: ELDERLY_USER_ID,
      type: 'nutrition_risk',
      message: cautionMeal?.fitnessNote ?? '나트륨 섭취가 높은 식사가 있었어요.',
      createdAt: daysAgo(2, 9, 0).toISOString(),
      acknowledged: true,
      comment: '싱겁게 드시라고 말씀드렸어요',
    },
    {
      id: `alert-${ELDERLY_USER_ID}-high_risk-${isoDate(daysAgo(4))}`,
      elderlyUserId: ELDERLY_USER_ID,
      type: 'high_risk',
      message: '오늘 컨디션이 안 좋다고 체크인했어요. 확인이 필요해요.',
      createdAt: daysAgo(4, 9, 0).toISOString(),
      acknowledged: true,
      comment: '전화로 안부 확인함',
    },
    {
      id: `alert-${ELDERLY_USER_ID}-missed_medication-${vitaminMed.id}-${isoDate(daysAgo(1))}`,
      elderlyUserId: ELDERLY_USER_ID,
      type: 'missed_medication',
      message: `${vitaminMed.name} 복용 시간이 지났지만 복용 기록이 없어요.`,
      createdAt: daysAgo(1, 10, 0).toISOString(),
      acknowledged: false,
      comment: null,
    },
    {
      id: `alert-${ELDERLY_USER_ID}-missed_meal-${isoDate(daysAgo(1))}`,
      elderlyUserId: ELDERLY_USER_ID,
      type: 'missed_meal',
      message: '오늘 오후 2시가 지났지만 식사 기록이 없어요.',
      createdAt: daysAgo(1, 15, 0).toISOString(),
      acknowledged: false,
      comment: null,
    },
  ];
  for (const alert of alerts) {
    await guardianAlertsCollection.upsert(alert);
  }

  const consent: ConsentRecord = {
    id: ELDERLY_USER_ID,
    userId: ELDERLY_USER_ID,
    highRiskSharingConsent: true,
    updatedAt: daysAgo(30).toISOString(),
  };
  await consentRecordsCollection.upsert(consent);

  const nutritionGoal: NutritionGoal = {
    id: ELDERLY_USER_ID,
    userId: ELDERLY_USER_ID,
    calories: { min: 1200, target: 1400, max: 1650 },
    carbsG: { min: 130, target: 153, max: 190 },
    proteinG: { min: 40, target: 45, max: 70 },
    fatG: { min: 30, target: 45, max: 60 },
    sodiumMg: { min: 0, target: 1400, max: 1640 },
    updatedAt: now,
  };
  await nutritionGoalsCollection.upsert(nutritionGoal);

  const products: MealProduct[] = [
    {
      id: 'product-low-sodium-fish',
      name: '담백한 고등어 채소 도시락',
      description: '국물 없이 담백하게 구운 생선과 부드러운 채소 반찬을 담았어요.',
      category: 'lowSodium',
      price: 8900,
      imageUri: null,
      foods: ['잡곡밥', '고등어구이', '시금치나물', '두부조림'],
      nutrients: { calories: 510, carbsG: 58, proteinG: 29, fatG: 17, sodiumMg: 620 },
      suitableConditions: ['고혈압'],
      allergens: ['대두', '고등어'],
      cautionFoods: [],
      deliveryDays: [isoDate(daysAgo(-1)), isoDate(daysAgo(-2)), isoDate(daysAgo(-3))],
      featured: true,
    },
    {
      id: 'product-diabetes-chicken',
      name: '든든한 닭가슴살 잡곡 도시락',
      description: '잡곡밥과 닭가슴살로 단백질을 든든하게 채운 균형 식단이에요.',
      category: 'diabetes',
      price: 9500,
      imageUri: null,
      foods: ['잡곡밥', '닭가슴살구이', '버섯볶음', '브로콜리'],
      nutrients: { calories: 485, carbsG: 49, proteinG: 36, fatG: 14, sodiumMg: 540 },
      suitableConditions: ['당뇨'],
      allergens: ['대두'],
      cautionFoods: [],
      deliveryDays: [isoDate(daysAgo(-1)), isoDate(daysAgo(-2)), isoDate(daysAgo(-3))],
      featured: true,
    },
    {
      id: 'product-soft-tofu',
      name: '부드러운 두부 달걀찜 식단',
      description: '씹고 삼키기 편한 두부와 달걀찜으로 구성한 부드러운 식단이에요.',
      category: 'softMeal',
      price: 8200,
      imageUri: null,
      foods: ['진밥', '두부조림', '달걀찜', '애호박볶음'],
      nutrients: { calories: 430, carbsG: 52, proteinG: 24, fatG: 13, sodiumMg: 480 },
      suitableConditions: [],
      allergens: ['달걀', '대두'],
      cautionFoods: [],
      deliveryDays: [isoDate(daysAgo(-1)), isoDate(daysAgo(-2)), isoDate(daysAgo(-3))],
      featured: false,
    },
    {
      id: 'product-protein-bulgogi',
      name: '단백질 든든 소불고기 도시락',
      description: '부드러운 소불고기와 나물 반찬으로 단백질을 보충해요.',
      category: 'highProtein',
      price: 9900,
      imageUri: null,
      foods: ['잡곡밥', '소불고기', '시금치나물', '버섯볶음'],
      nutrients: { calories: 560, carbsG: 61, proteinG: 32, fatG: 20, sodiumMg: 780 },
      suitableConditions: [],
      allergens: ['대두', '밀'],
      cautionFoods: [],
      deliveryDays: [isoDate(daysAgo(-1)), isoDate(daysAgo(-2)), isoDate(daysAgo(-3))],
      featured: true,
    },
  ];
  for (const product of products) {
    await mealProductsCollection.upsert(product);
  }

  const mealOrder: MealOrder = {
    id: 'order-demo-gift',
    guardianUserId: GUARDIAN_USER_ID,
    elderlyUserId: ELDERLY_USER_ID,
    productId: products[0].id,
    quantity: 1,
    deliveryDate: isoDate(daysAgo(-1)),
    deliveryAddressLabel: '김끼니 님 댁',
    giftMessage: '어머니, 내일 점심 맛있게 드세요!',
    status: 'preparing',
    createdAt: now,
    updatedAt: now,
  };
  await mealOrdersCollection.upsert(mealOrder);
}
