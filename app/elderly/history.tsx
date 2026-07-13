import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { DayHistoryView } from '../../src/components/history/DayHistoryView';
import { colors } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import {
  checkInsCollection,
  medicationLogsCollection,
  medicationsCollection,
  mealsCollection,
} from '../../src/mocks/db/collections';
import type { CheckIn, Meal, Medication, MedicationLog } from '../../src/domain/types';

export default function HistoryScreen() {
  const { activeUserId } = useRole();
  const userId = activeUserId ?? 'elderly-self';

  const [meals, setMeals] = useState<Meal[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  const load = useCallback(async () => {
    const [loadedMeals, loadedMedications, loadedLogs, loadedCheckIns] = await Promise.all([
      mealsCollection.query((item) => item.userId === userId),
      medicationsCollection.query((item) => item.userId === userId),
      medicationLogsCollection.query((item) => item.userId === userId),
      checkInsCollection.query((item) => item.userId === userId),
    ]);
    setMeals(loadedMeals);
    setMedications(loadedMedications);
    setMedicationLogs(loadedLogs);
    setCheckIns(loadedCheckIns);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <DayHistoryView
        variant="elderly"
        title="드신 기록"
        meals={meals}
        medications={medications}
        medicationLogs={medicationLogs}
        checkIns={checkIns}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
