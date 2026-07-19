import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DisclaimerBanner } from '../../src/components/DisclaimerBanner';
import { Card, EmptyState } from '../../src/components/ui';
import { findConflicts, type ConflictWarning } from '../../src/domain/conflictRules';
import { isoToLocalDate, todayDate } from '../../src/domain/date';
import { createId } from '../../src/domain/id';
import type { Medication, MedicationLog, MedicationPeriod } from '../../src/domain/types';
import { mealsCollection, medicationLogsCollection, medicationsCollection } from '../../src/mocks/db/collections';
import { useRole } from '../../src/state/RoleContext';
import { colors, minTouchTarget, radius, spacing, typeElder } from '../../src/theme/tokens';

type FixedPeriod = Exclude<MedicationPeriod, 'asNeeded'>;

const PERIODS: { key: FixedPeriod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'morning', label: '아침약', icon: 'sunny' },
  { key: 'lunch', label: '점심약', icon: 'partly-sunny' },
  { key: 'evening', label: '저녁약', icon: 'moon' },
];

function periodForTime(time: string): FixedPeriod {
  const hour = Number(time.slice(0, 2));
  if (hour < 11) return 'morning';
  if (hour < 17) return 'lunch';
  return 'evening';
}

function localTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function scheduledIso(dateString: string, time: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

interface Dose {
  medication: Medication;
  time: string;
  period: FixedPeriod;
}

export default function MedicationsScreen() {
  const { activeUserId } = useRole();
  const userId = activeUserId ?? 'elderly-self';
  const today = todayDate();
  const [selectedPeriod, setSelectedPeriod] = useState<FixedPeriod>('morning');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [warnings, setWarnings] = useState<ConflictWarning[]>([]);

  const load = useCallback(async () => {
    const [meds, allLogs, meals] = await Promise.all([
      medicationsCollection.query((item) => item.userId === userId && item.active !== false),
      medicationLogsCollection.query((item) => item.userId === userId),
      mealsCollection.query((item) => item.userId === userId),
    ]);
    const latestMeal = [...meals].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
    setMedications(meds);
    setLogs(allLogs.filter((item) => isoToLocalDate(item.scheduledFor) === today));
    setWarnings(latestMeal ? findConflicts(meds, latestMeal.foods.map((food) => food.name)) : []);
  }, [today, userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doses = useMemo<Dose[]>(() => medications.flatMap((medication) => medication.timesOfDay.map((time) => ({
    medication,
    time,
    period: medication.periods?.[medication.timesOfDay.indexOf(time)] as FixedPeriod | undefined ?? periodForTime(time),
  }))), [medications]);
  const selectedDoses = doses.filter((dose) => dose.period === selectedPeriod);

  function isTaken(dose: Dose): boolean {
    return logs.some((log) => log.medicationId === dose.medication.id && localTime(log.scheduledFor) === dose.time);
  }

  async function markTaken(dose: Dose) {
    if (isTaken(dose)) return;
    const now = new Date().toISOString();
    await medicationLogsCollection.upsert({
      id: createId('medlog'),
      medicationId: dose.medication.id,
      userId,
      takenAt: now,
      scheduledFor: scheduledIso(today, dose.time),
      recordedBy: userId,
      recorderRole: 'elderly',
    });
    await load();
  }

  async function markAllTaken() {
    for (const dose of selectedDoses.filter((item) => !isTaken(item))) {
      await markTaken(dose);
    }
  }

  const selectedTakenCount = selectedDoses.filter(isTaken).length;
  const allDone = selectedDoses.length > 0 && selectedTakenCount === selectedDoses.length;
  const cautionNotes = medications.filter((item) => item.cautionNote).map((item) => `${item.name}: ${item.cautionNote}`);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.eyebrow}>오늘도 잊지 않도록</Text>
          <Text style={styles.title}>오늘의 약</Text>
        </View>

        {(warnings.length > 0 || cautionNotes.length > 0) && (
          <Card style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={26} color={colors.caution} />
              <Text style={styles.warningTitle}>음식과 함께 주의하세요</Text>
            </View>
            {warnings.map((warning, index) => <Text key={`${warning.medicationName}-${index}`} style={styles.warningText}>• {warning.warning}</Text>)}
            {warnings.length === 0 && cautionNotes.slice(0, 2).map((note) => <Text key={note} style={styles.warningText}>• {note}</Text>)}
          </Card>
        )}

        <View style={styles.tabs}>
          {PERIODS.map((period) => {
            const periodDoses = doses.filter((dose) => dose.period === period.key);
            const completed = periodDoses.length > 0 && periodDoses.every(isTaken);
            const active = selectedPeriod === period.key;
            return (
              <Pressable key={period.key} onPress={() => setSelectedPeriod(period.key)} style={[styles.tab, active && styles.tabActive]}>
                <Ionicons name={completed ? 'checkmark-circle' : period.icon} size={24} color={active ? colors.onPrimary : completed ? colors.good : colors.textMuted} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{period.label}</Text>
                <Text style={[styles.tabCount, active && styles.tabTextActive]}>{periodDoses.filter(isTaken).length}/{periodDoses.length}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{PERIODS.find((item) => item.key === selectedPeriod)?.label}</Text>
            <Text style={styles.sectionDescription}>{selectedDoses.length}개 중 {selectedTakenCount}개 드셨어요</Text>
          </View>
          {selectedDoses.length > 0 && (
            <Pressable disabled={allDone} onPress={markAllTaken} style={[styles.allButton, allDone && styles.allButtonDone]}>
              <Text style={[styles.allButtonText, allDone && styles.allButtonTextDone]}>{allDone ? '모두 완료' : '모두 먹었어요'}</Text>
            </Pressable>
          )}
        </View>

        {selectedDoses.length === 0 ? (
          <EmptyState title={`${PERIODS.find((item) => item.key === selectedPeriod)?.label}이 없어요`} description="등록된 복약 일정이 없어요." />
        ) : selectedDoses.map((dose) => {
          const taken = isTaken(dose);
          return (
            <Card key={`${dose.medication.id}-${dose.time}`} style={[styles.doseCard, taken && styles.doseCardTaken]}>
              <View style={[styles.pillIcon, taken && styles.pillIconTaken]}>
                <Ionicons name="medical" size={26} color={taken ? colors.good : colors.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.medicationName}>{dose.medication.name}</Text>
                <Text style={styles.medicationMeta}>{dose.medication.dosage ?? '1정'} · {dose.time} · {dose.medication.mealTiming === 'beforeMeal' ? '식전' : dose.medication.mealTiming === 'withMeal' ? '식사 중' : '식후'}</Text>
                {dose.medication.conflictFoods.length > 0 && <Text style={styles.conflict}>주의 음식: {dose.medication.conflictFoods.join(', ')}</Text>}
              </View>
              <Pressable disabled={taken} onPress={() => markTaken(dose)} style={[styles.takenButton, taken && styles.takenButtonDone]}>
                <Ionicons name={taken ? 'checkmark' : 'add'} size={23} color={taken ? colors.good : colors.onPrimary} />
                <Text style={[styles.takenButtonText, taken && styles.takenButtonTextDone]}>{taken ? '완료' : '먹었어요'}</Text>
              </Pressable>
            </Card>
          );
        })}

        <DisclaimerBanner variant="medication" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl + spacing.lg, gap: spacing.lg },
  flex1: { flex: 1 },
  eyebrow: { ...typeElder.callout, color: colors.textMuted },
  title: { ...typeElder.title, color: colors.text, marginTop: spacing.xxs },
  warningCard: { backgroundColor: colors.cautionBg, borderColor: colors.cautionBorder, gap: spacing.xs },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  warningTitle: { ...typeElder.subheading, color: colors.caution },
  warningText: { ...typeElder.callout, color: colors.text },
  tabs: { flexDirection: 'row', gap: spacing.xs },
  tab: { flex: 1, minHeight: minTouchTarget + 18, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 2, padding: spacing.xs },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...typeElder.callout, color: colors.text },
  tabTextActive: { color: colors.onPrimary },
  tabCount: { ...typeElder.caption, color: colors.textMuted },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { ...typeElder.heading, color: colors.text },
  sectionDescription: { ...typeElder.callout, color: colors.textMuted, marginTop: 2 },
  allButton: { minHeight: minTouchTarget, borderRadius: radius.md, backgroundColor: colors.primary, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  allButtonDone: { backgroundColor: colors.goodBg },
  allButtonText: { ...typeElder.callout, color: colors.onPrimary },
  allButtonTextDone: { color: colors.good },
  doseCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  doseCardTaken: { backgroundColor: colors.goodBg, borderColor: colors.goodBorder },
  pillIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pillIconTaken: { backgroundColor: colors.surface },
  medicationName: { ...typeElder.bodyStrong, color: colors.text },
  medicationMeta: { ...typeElder.caption, color: colors.textMuted, marginTop: 2 },
  conflict: { ...typeElder.caption, color: colors.caution, marginTop: 2 },
  takenButton: { minHeight: minTouchTarget, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: spacing.sm },
  takenButtonDone: { backgroundColor: colors.surface },
  takenButtonText: { ...typeElder.callout, color: colors.onPrimary },
  takenButtonTextDone: { color: colors.good },
});
