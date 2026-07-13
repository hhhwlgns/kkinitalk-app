import type {
  CheckIn,
  ConsentRecord,
  GuardianAlert,
  GuardianLink,
  HealthProfile,
  Meal,
  Medication,
  MedicationLog,
  User,
} from '../../domain/types';
import { createCollection } from './store';

export const usersCollection = createCollection<User>('users');
export const healthProfilesCollection = createCollection<HealthProfile>('healthProfiles');
export const mealsCollection = createCollection<Meal>('meals');
export const medicationsCollection = createCollection<Medication>('medications');
export const medicationLogsCollection = createCollection<MedicationLog>('medicationLogs');
export const checkInsCollection = createCollection<CheckIn>('checkIns');
export const guardianLinksCollection = createCollection<GuardianLink>('guardianLinks');
export const guardianAlertsCollection = createCollection<GuardianAlert>('guardianAlerts');
export const consentRecordsCollection = createCollection<ConsentRecord>('consentRecords');
