import { isRunningInExpoGo } from 'expo';

import type { Medication } from './types';

export const MEDICATION_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function scheduleMedicationReminders(medication: Medication): Promise<void> {
  if (isRunningInExpoGo()) {
    return;
  }
  const Notifications = await import('expo-notifications');
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return;
  }
  for (const time of medication.timesOfDay) {
    const [hour, minute] = time.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '복약 시간이에요',
        body: `${medication.name} 복용 시간입니다.`,
        data: { medicationId: medication.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}
