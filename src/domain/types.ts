export type Role = 'elderly' | 'guardian';

export type Sex = 'male' | 'female' | 'unspecified';

export interface HealthProfile {
  id: string;
  userId: string;
  name: string;
  age: number | null;
  sex: Sex;
  conditions: string[];
  medications: string[];
  swallowingDifficulty: boolean;
  avoidedFoods: string[];
  recentWeightKg: number | null;
  appetiteLevel: 'low' | 'normal' | 'high' | null;
  allergies?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NutrientBreakdown {
  calories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  sodiumMg: number;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealFitness = 'good' | 'caution';

export interface FoodItem {
  id: string;
  name: string;
  nutrients: NutrientBreakdown;
}

export interface Meal {
  id: string;
  userId: string;
  slot: MealSlot;
  photoUri: string | null;
  photoUris?: string[];
  foods: FoodItem[];
  totalNutrients: NutrientBreakdown;
  fitness: MealFitness;
  fitnessNote: string;
  nextMealSuggestion: string | null;
  recommendationReason?: string | null;
  analysisSource?: 'mock' | 'manual';
  analysisEdited?: boolean;
  recordedAt: string;
}

export type MedicationPeriod = 'morning' | 'lunch' | 'evening' | 'asNeeded';

export type MedicationMealTiming = 'beforeMeal' | 'afterMeal' | 'withMeal' | 'anytime';

export interface Medication {
  id: string;
  userId: string;
  name: string;
  category?: string;
  dosage?: string;
  doseCount?: number;
  timesOfDay: string[];
  periods?: MedicationPeriod[];
  mealTiming?: MedicationMealTiming;
  conflictFoods: string[];
  cautionNote?: string | null;
  active?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  userId: string;
  takenAt: string;
  scheduledFor: string;
  recordedBy?: string;
  recorderRole?: Role;
}

export type ConditionLevel = 'good' | 'normal' | 'bad';

export interface CheckIn {
  id: string;
  userId: string;
  date: string;
  condition: ConditionLevel;
  hadMeal: boolean;
  note: string | null;
  recordedAt: string;
}

export interface GuardianLink {
  id: string;
  inviteCode: string;
  elderlyUserId: string;
  guardianUserId: string | null;
  relationship?: string | null;
  permissions?: GuardianPermission[];
  status: 'pending' | 'connected';
  createdAt: string;
}

export type GuardianPermission =
  | 'view_health'
  | 'manage_profile'
  | 'manage_medications'
  | 'receive_high_risk_alerts'
  | 'send_meals';

export type AlertType = 'missed_meal' | 'nutrition_risk' | 'missed_medication' | 'high_risk';

export interface GuardianAlert {
  id: string;
  elderlyUserId: string;
  type: AlertType;
  message: string;
  createdAt: string;
  acknowledged: boolean;
  comment: string | null;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  highRiskSharingConsent: boolean;
  updatedAt: string;
}

export interface User {
  id: string;
  role: Role;
  displayName: string;
}

export interface NutrientRange {
  min: number;
  target: number;
  max: number;
}

export interface NutritionGoal {
  id: string;
  userId: string;
  calories: NutrientRange;
  carbsG: NutrientRange;
  proteinG: NutrientRange;
  fatG: NutrientRange;
  sodiumMg: NutrientRange;
  updatedAt: string;
}

export interface MealProduct {
  id: string;
  name: string;
  description: string;
  category: 'lowSodium' | 'diabetes' | 'highProtein' | 'softMeal' | 'general' | 'porridge' | 'sideDishes';
  price: number;
  imageUri: string | null;
  foods: string[];
  nutrients: NutrientBreakdown;
  suitableConditions: string[];
  allergens: string[];
  cautionFoods: string[];
  deliveryDays: string[];
  featured: boolean;
}

export type MealOrderStatus = 'confirmed' | 'preparing' | 'shipping' | 'delivered';

export interface MealOrder {
  id: string;
  guardianUserId: string;
  elderlyUserId: string;
  productId: string;
  quantity: number;
  deliveryDate: string;
  deliveryAddressLabel: string;
  giftMessage: string | null;
  status: MealOrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HealthProfileRevision {
  id: string;
  userId: string;
  changedBy: string;
  changerRole: Role;
  summary: string;
  changedAt: string;
}
