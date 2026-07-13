import type { CheckIn, Meal, Medication, MedicationLog } from './types';

export function collectRecordDates(
  meals: { recordedAt: string }[],
  medicationLogs: { takenAt: string }[],
  checkIns: { date: string }[],
): Set<string> {
  const dates = new Set<string>();
  meals.forEach((meal) => dates.add(meal.recordedAt.slice(0, 10)));
  medicationLogs.forEach((log) => dates.add(log.takenAt.slice(0, 10)));
  checkIns.forEach((checkIn) => dates.add(checkIn.date));
  return dates;
}

export interface DayHistory {
  meals: Meal[];
  medicationLogs: (MedicationLog & { medicationName: string })[];
  checkIn: CheckIn | null;
}

export function buildDayHistory(
  date: string,
  meals: Meal[],
  medicationLogs: MedicationLog[],
  medications: Medication[],
  checkIns: CheckIn[],
): DayHistory {
  const medicationNameById = new Map(medications.map((medication) => [medication.id, medication.name]));

  return {
    meals: meals.filter((meal) => meal.recordedAt.slice(0, 10) === date),
    medicationLogs: medicationLogs
      .filter((log) => log.takenAt.slice(0, 10) === date)
      .map((log) => ({ ...log, medicationName: medicationNameById.get(log.medicationId) ?? '알 수 없는 약' })),
    checkIn: checkIns.find((checkIn) => checkIn.date === date) ?? null,
  };
}

export function getMonthGridDates(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    cells.push(`${year}-${mm}-${dd}`);
  }
  return cells;
}
