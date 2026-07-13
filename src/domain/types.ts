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
  foods: FoodItem[];
  totalNutrients: NutrientBreakdown;
  fitness: MealFitness;
  fitnessNote: string;
  nextMealSuggestion: string | null;
  recordedAt: string;
}

export interface Medication {
  id: string;
  userId: string;
  name: string;
  timesOfDay: string[];
  conflictFoods: string[];
  createdAt: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  userId: string;
  takenAt: string;
  scheduledFor: string;
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
  status: 'pending' | 'connected';
  createdAt: string;
}

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
