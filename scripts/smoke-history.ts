import {
  checkInsCollection,
  medicationLogsCollection,
  medicationsCollection,
  mealsCollection,
} from '../src/mocks/db/collections';
import { createId } from '../src/domain/id';
import type { CheckIn, Meal, Medication, MedicationLog } from '../src/domain/types';
import { buildDayHistory, collectRecordDates, getMonthGridDates } from '../src/domain/historyView';

const USER_ID = 'elderly-self';
const DAY_1 = '2026-07-10';
const DAY_2 = '2026-07-11';
const DAY_EMPTY = '2026-07-09';

async function writePhase() {
  const medication: Medication = {
    id: createId('medication'),
    userId: USER_ID,
    name: '혈압약',
    timesOfDay: ['08:00'],
    conflictFoods: [],
    createdAt: `${DAY_1}T07:00:00.000Z`,
  };
  await medicationsCollection.upsert(medication);

  const meal: Meal = {
    id: createId('meal'),
    userId: USER_ID,
    slot: 'breakfast',
    photoUri: null,
    foods: [{ id: 'food-a', name: '흰쌀밥', nutrients: { calories: 300, carbsG: 65, proteinG: 5, fatG: 1, sodiumMg: 5 } }],
    totalNutrients: { calories: 300, carbsG: 65, proteinG: 5, fatG: 1, sodiumMg: 5 },
    fitness: 'good',
    fitnessNote: '균형이 잘 맞아요.',
    nextMealSuggestion: null,
    recordedAt: `${DAY_1}T08:00:00.000Z`,
  };
  await mealsCollection.upsert(meal);

  const log: MedicationLog = {
    id: createId('medlog'),
    medicationId: medication.id,
    userId: USER_ID,
    takenAt: `${DAY_2}T08:05:00.000Z`,
    scheduledFor: `${DAY_2}T08:00:00.000Z`,
  };
  await medicationLogsCollection.upsert(log);

  const checkIn: CheckIn = {
    id: createId('checkin'),
    userId: USER_ID,
    date: DAY_2,
    condition: 'good',
    hadMeal: true,
    note: null,
    recordedAt: `${DAY_2}T07:30:00.000Z`,
  };
  await checkInsCollection.upsert(checkIn);

  console.log('HISTORY_WRITE_PHASE_OK');
}

async function readPhase() {
  const [meals, medications, medicationLogs, checkIns] = await Promise.all([
    mealsCollection.query((item) => item.userId === USER_ID),
    medicationsCollection.query((item) => item.userId === USER_ID),
    medicationLogsCollection.query((item) => item.userId === USER_ID),
    checkInsCollection.query((item) => item.userId === USER_ID),
  ]);

  if (meals.length !== 1 || medications.length !== 1 || medicationLogs.length !== 1 || checkIns.length !== 1) {
    throw new Error(
      `expected 1 of each record after restart, got meals=${meals.length} medications=${medications.length} logs=${medicationLogs.length} checkIns=${checkIns.length}`,
    );
  }

  const recordDates = collectRecordDates(meals, medicationLogs, checkIns);
  if (!recordDates.has(DAY_1) || !recordDates.has(DAY_2) || recordDates.has(DAY_EMPTY)) {
    throw new Error('collectRecordDates did not correctly identify record-bearing dates');
  }

  const day1History = buildDayHistory(DAY_1, meals, medicationLogs, medications, checkIns);
  if (day1History.meals.length !== 1 || day1History.medicationLogs.length !== 0 || day1History.checkIn !== null) {
    throw new Error('day1 history mismatch: expected only the meal record');
  }

  const day2History = buildDayHistory(DAY_2, meals, medicationLogs, medications, checkIns);
  if (day2History.meals.length !== 0 || day2History.medicationLogs.length !== 1 || !day2History.checkIn) {
    throw new Error('day2 history mismatch: expected medication log + check-in');
  }
  if (day2History.medicationLogs[0].medicationName !== '혈압약') {
    throw new Error('medication log did not resolve medication name correctly');
  }

  const emptyHistory = buildDayHistory(DAY_EMPTY, meals, medicationLogs, medications, checkIns);
  if (emptyHistory.meals.length !== 0 || emptyHistory.medicationLogs.length !== 0 || emptyHistory.checkIn !== null) {
    throw new Error('expected no records for an unrelated date');
  }

  const monthCells = getMonthGridDates(2026, 6);
  const daysInJuly2026 = monthCells.filter((cell) => cell !== null).length;
  if (daysInJuly2026 !== 31) {
    throw new Error(`expected 31 day cells for July 2026, got ${daysInJuly2026}`);
  }

  console.log(
    'SMOKE TEST PASSED: meal/medication log/check-in records persisted across simulated restart, and day-based history aggregation + calendar grid are correct',
    { recordDateCount: recordDates.size, daysInJuly2026 },
  );
}

const phase = process.argv[2];

const run = phase === 'write' ? writePhase() : readPhase();

run.catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exitCode = 1;
});
