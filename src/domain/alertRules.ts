import type { CheckIn, GuardianAlert, Meal, Medication, MedicationLog } from './types';

export type AlertCandidate = Omit<GuardianAlert, 'acknowledged' | 'comment' | 'createdAt'>;

const MISSED_MEAL_CHECK_MINUTES = 14 * 60;
const MEDICATION_GRACE_MINUTES = 30;

function todayDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function buildAlertCandidates(
  elderlyUserId: string,
  now: Date,
  checkIns: CheckIn[],
  meals: Meal[],
  medications: Medication[],
  medicationLogs: MedicationLog[],
  highRiskSharingConsent: boolean,
): AlertCandidate[] {
  const today = todayDate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const candidates: AlertCandidate[] = [];

  const todayCheckIn = checkIns.find((item) => item.date === today) ?? null;
  const todayMeals = meals.filter((meal) => meal.recordedAt.slice(0, 10) === today);
  const todayLogs = medicationLogs.filter((log) => log.takenAt.slice(0, 10) === today);

  if (
    nowMinutes >= MISSED_MEAL_CHECK_MINUTES &&
    todayMeals.length === 0 &&
    (todayCheckIn === null || todayCheckIn.hadMeal === false)
  ) {
    candidates.push({
      id: `alert-${elderlyUserId}-missed_meal-${today}`,
      elderlyUserId,
      type: 'missed_meal',
      message: '오늘 오후 2시가 지났지만 식사 기록이 없어요.',
    });
  }

  const cautionMeal = todayMeals.find((meal) => meal.fitness === 'caution');
  if (cautionMeal) {
    candidates.push({
      id: `alert-${elderlyUserId}-nutrition_risk-${today}`,
      elderlyUserId,
      type: 'nutrition_risk',
      message: cautionMeal.fitnessNote,
    });
  }

  for (const medication of medications) {
    const scheduledTimePassed = medication.timesOfDay.some(
      (time) => timeToMinutes(time) + MEDICATION_GRACE_MINUTES < nowMinutes,
    );
    const takenToday = todayLogs.some((log) => log.medicationId === medication.id);
    if (scheduledTimePassed && !takenToday) {
      candidates.push({
        id: `alert-${elderlyUserId}-missed_medication-${medication.id}-${today}`,
        elderlyUserId,
        type: 'missed_medication',
        message: `${medication.name} 복용 시간이 지났지만 복용 기록이 없어요.`,
      });
    }
  }

  if (todayCheckIn?.condition === 'bad' && highRiskSharingConsent) {
    candidates.push({
      id: `alert-${elderlyUserId}-high_risk-${today}`,
      elderlyUserId,
      type: 'high_risk',
      message: '오늘 컨디션이 안 좋다고 체크인했어요. 확인이 필요해요.',
    });
  }

  return candidates;
}
