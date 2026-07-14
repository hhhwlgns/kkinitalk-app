import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '../../src/components/BigButton';
import { MedicationsView, type MedicationDraft } from '../../src/components/medications/MedicationsView';
import { colors } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import { guardianLinksCollection, medicationsCollection } from '../../src/mocks/db/collections';
import { findConnectedLink } from '../../src/domain/guardianLink';
import { createId } from '../../src/domain/id';
import type { Medication } from '../../src/domain/types';
import { scheduleMedicationReminders } from '../../src/domain/medicationReminders';

export default function GuardianMedicationsScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';

  const [elderlyUserId, setElderlyUserId] = useState<string | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);

  const load = useCallback(async () => {
    const links = await guardianLinksCollection.getAll();
    const link = findConnectedLink(links, guardianUserId);
    if (!link) {
      router.replace('/guardian/connect');
      return;
    }
    setElderlyUserId(link.elderlyUserId);

    const meds = await medicationsCollection.query((item) => item.userId === link.elderlyUserId);
    setMedications(meds);
  }, [guardianUserId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleSave(draft: MedicationDraft) {
    if (!elderlyUserId) return;

    const medication: Medication = {
      id: draft.id ?? createId('medication'),
      userId: elderlyUserId,
      name: draft.name,
      timesOfDay: draft.timesOfDay,
      conflictFoods: draft.conflictFoods,
      createdAt: new Date().toISOString(),
    };

    await medicationsCollection.upsert(medication);
    await scheduleMedicationReminders(medication);
    await load();
  }

  async function deleteMedication(id: string) {
    await medicationsCollection.remove(id);
    await load();
  }

  return (
    <SafeAreaView style={styles.container}>
      <MedicationsView
        title="복약 관리"
        medications={medications}
        compact
        onSave={handleSave}
        renderAction={(medication) => (
          <BigButton label="삭제" variant="secondary" onPress={() => deleteMedication(medication.id)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
