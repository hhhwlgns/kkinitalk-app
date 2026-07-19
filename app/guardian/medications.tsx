import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '../../src/components/BigButton';
import { MedicationsView, type MedicationDraft } from '../../src/components/medications/MedicationsView';
import { colors, radius, spacing, type } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import { guardianLinksCollection, healthProfilesCollection, medicationLogsCollection, medicationsCollection } from '../../src/mocks/db/collections';
import { findConnectedLink } from '../../src/domain/guardianLink';
import { createId } from '../../src/domain/id';
import type { Medication, MedicationLog } from '../../src/domain/types';
import { cancelMedicationReminders, scheduleMedicationReminders } from '../../src/domain/medicationReminders';
import { isoToLocalDate, todayDate } from '../../src/domain/date';
import { Card } from '../../src/components/ui';

export default function GuardianMedicationsScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';

  const [elderlyUserId, setElderlyUserId] = useState<string | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [elderlyName, setElderlyName] = useState('어르신');

  const load = useCallback(async () => {
    const links = await guardianLinksCollection.getAll();
    const link = findConnectedLink(links, guardianUserId);
    if (!link) {
      router.replace('/guardian/connect');
      return;
    }
    setElderlyUserId(link.elderlyUserId);

    const [meds, logs, profiles] = await Promise.all([
      medicationsCollection.query((item) => item.userId === link.elderlyUserId),
      medicationLogsCollection.query((item) => item.userId === link.elderlyUserId),
      healthProfilesCollection.query((item) => item.userId === link.elderlyUserId),
    ]);
    setMedications(meds);
    setTodayLogs(logs.filter((item) => isoToLocalDate(item.takenAt) === todayDate()));
    setElderlyName(profiles[profiles.length - 1]?.name ?? '어르신');
  }, [guardianUserId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleSave(draft: MedicationDraft) {
    if (!elderlyUserId) return;

    const existing = draft.id ? medications.find((item) => item.id === draft.id) : null;
    const medication: Medication = {
      ...existing,
      id: draft.id ?? createId('medication'),
      userId: elderlyUserId,
      name: draft.name,
      timesOfDay: draft.timesOfDay,
      conflictFoods: draft.conflictFoods,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await medicationsCollection.upsert(medication);
    await scheduleMedicationReminders(medication);
    await load();
  }

  async function deleteMedication(id: string) {
    await medicationsCollection.remove(id);
    await cancelMedicationReminders(id);
    await load();
  }

  return (
    <SafeAreaView style={styles.container}>
      <MedicationsView
        title={`${elderlyName} 님 복약 관리`}
        medications={medications}
        compact
        onSave={handleSave}
        summaryContent={(
          <View style={styles.summaryWrap}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>오늘 복약 상태</Text>
              <Pressable onPress={() => router.push('/guardian/alerts')} style={styles.alertButton}>
                <Ionicons name="notifications-outline" size={22} color={colors.primary} />
                <Text style={styles.alertButtonText}>알림</Text>
              </Pressable>
            </View>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryValue}>{todayLogs.length}/{medications.reduce((sum, item) => sum + item.timesOfDay.length, 0)}</Text>
                <Text style={styles.summaryLabel}>복용 기록</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryValue}>{medications.filter((item) => item.conflictFoods.length > 0).length}개</Text>
                <Text style={styles.summaryLabel}>음식 주의 약</Text>
              </View>
            </Card>
          </View>
        )}
        renderAction={(medication) => (
          <BigButton label="삭제" variant="secondary" onPress={() => deleteMedication(medication.id)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  summaryWrap: { gap: spacing.sm, marginTop: spacing.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryTitle: { ...type.heading, color: colors.text },
  alertButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, borderRadius: radius.pill, backgroundColor: colors.primarySoft, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  alertButtonText: { ...type.callout, color: colors.primary },
  summaryCard: { flexDirection: 'row' },
  summaryMetric: { flex: 1 },
  summaryValue: { ...type.heading, color: colors.text },
  summaryLabel: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.dividerLight, marginHorizontal: spacing.md },
});
