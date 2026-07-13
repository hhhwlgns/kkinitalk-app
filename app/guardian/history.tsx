import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { DayHistoryView } from '../../src/components/history/DayHistoryView';
import { colors } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import {
  checkInsCollection,
  guardianLinksCollection,
  medicationLogsCollection,
  medicationsCollection,
  mealsCollection,
} from '../../src/mocks/db/collections';
import { findConnectedLink } from '../../src/domain/guardianLink';
import type { CheckIn, Meal, Medication, MedicationLog } from '../../src/domain/types';

export default function GuardianHistoryScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';

  const [meals, setMeals] = useState<Meal[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  const load = useCallback(async () => {
    const links = await guardianLinksCollection.getAll();
    const link = findConnectedLink(links, guardianUserId);
    if (!link) {
      router.replace('/guardian/connect');
      return;
    }
    const elderlyUserId = link.elderlyUserId;

    const [loadedMeals, loadedMedications, loadedLogs, loadedCheckIns] = await Promise.all([
      mealsCollection.query((item) => item.userId === elderlyUserId),
      medicationsCollection.query((item) => item.userId === elderlyUserId),
      medicationLogsCollection.query((item) => item.userId === elderlyUserId),
      checkInsCollection.query((item) => item.userId === elderlyUserId),
    ]);
    setMeals(loadedMeals);
    setMedications(loadedMedications);
    setMedicationLogs(loadedLogs);
    setCheckIns(loadedCheckIns);
  }, [guardianUserId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <DayHistoryView
        variant="guardian"
        title="식사 기록"
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
