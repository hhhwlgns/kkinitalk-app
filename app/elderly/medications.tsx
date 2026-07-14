import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { BigButton } from '../../src/components/BigButton';
import { MedicationsView, type MedicationDraft } from '../../src/components/medications/MedicationsView';
import { colors } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import { mealsCollection, medicationLogsCollection, medicationsCollection } from '../../src/mocks/db/collections';
import { createId } from '../../src/domain/id';
import type { Medication, MedicationLog } from '../../src/domain/types';
import { findConflicts, type ConflictWarning } from '../../src/domain/conflictRules';
import { todayDate } from '../../src/domain/date';
import { scheduleMedicationReminders } from '../../src/domain/medicationReminders';

function closestTimeToday(timesOfDay: string[]): string {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let closest = timesOfDay[0];
  let smallestDiff = Infinity;
  for (const time of timesOfDay) {
    const [hour, minute] = time.split(':').map(Number);
    const diff = Math.abs(hour * 60 + minute - nowMinutes);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = time;
    }
  }
  return closest;
}

export default function MedicationsScreen() {
  const { activeUserId } = useRole();
  const userId = activeUserId ?? 'elderly-self';

  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [warnings, setWarnings] = useState<ConflictWarning[]>([]);

  const load = useCallback(async () => {
    const meds = await medicationsCollection.query((item) => item.userId === userId);
    setMedications(meds);

    const today = todayDate();
    const allLogs = await medicationLogsCollection.query((item) => item.userId === userId);
    setLogs(allLogs.filter((item) => item.takenAt.slice(0, 10) === today));

    const meals = await mealsCollection.query((item) => item.userId === userId);
    const sortedMeals = [...meals].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    const latestMeal = sortedMeals[0];
    if (latestMeal && meds.length > 0) {
      const foodNames = latestMeal.foods.map((food) => food.name);
      setWarnings(findConflicts(meds, foodNames));
    } else {
      setWarnings([]);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleSave(draft: MedicationDraft) {
    const medication: Medication = {
      id: draft.id ?? createId('medication'),
      userId,
      name: draft.name,
      timesOfDay: draft.timesOfDay,
      conflictFoods: draft.conflictFoods,
      createdAt: new Date().toISOString(),
    };

    await medicationsCollection.upsert(medication);
    await scheduleMedicationReminders(medication);
    await load();
  }

  async function markTaken(medication: Medication) {
    const now = new Date();
    const today = todayDate();
    const nearestTime = closestTimeToday(medication.timesOfDay);
    const log: MedicationLog = {
      id: createId('medlog'),
      medicationId: medication.id,
      userId,
      takenAt: now.toISOString(),
      scheduledFor: `${today}T${nearestTime}:00.000Z`,
    };
    await medicationLogsCollection.upsert(log);
    await load();
  }

  function isTakenToday(medicationId: string): boolean {
    return logs.some((log) => log.medicationId === medicationId);
  }

  return (
    <SafeAreaView style={styles.container}>
      <MedicationsView
        title="오늘의 약"
        medications={medications}
        warnings={warnings}
        onSave={handleSave}
        renderAction={(medication) => (
          <BigButton
            label={isTakenToday(medication.id) ? '오늘 복용 완료' : '먹었어요'}
            variant={isTakenToday(medication.id) ? 'secondary' : 'primary'}
            disabled={isTakenToday(medication.id)}
            onPress={() => markTaken(medication)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
