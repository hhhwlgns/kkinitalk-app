import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateNavigator } from '../../src/components/history/DateNavigator';
import { MealPhotoGrid } from '../../src/components/nutrition/MealPhotoGrid';
import { NutritionOverview, NutritionTrendChart } from '../../src/components/nutrition/NutritionOverview';
import { Card } from '../../src/components/ui';
import { buildNutritionTrend, DEFAULT_NUTRITION_GOAL, summarizeNutritionForDate } from '../../src/domain/dailyNutrition';
import { isoToLocalDate, todayDate } from '../../src/domain/date';
import { findConnectedLink } from '../../src/domain/guardianLink';
import type { CheckIn, Meal, Medication, MedicationLog, NutritionGoal } from '../../src/domain/types';
import { checkInsCollection, guardianLinksCollection, mealsCollection, medicationLogsCollection, medicationsCollection, nutritionGoalsCollection } from '../../src/mocks/db/collections';
import { useRole } from '../../src/state/RoleContext';
import { colors, radius, spacing, type } from '../../src/theme/tokens';

export default function GuardianHistoryScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';
  const [date, setDate] = useState(todayDate());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [goal, setGoal] = useState<NutritionGoal | null>(null);
  const [elderlyUserId, setElderlyUserId] = useState('elderly-self');

  const load = useCallback(async () => {
    const link = findConnectedLink(await guardianLinksCollection.getAll(), guardianUserId);
    if (!link) { router.replace('/guardian/connect'); return; }
    const [loadedMeals, meds, loadedLogs, loadedCheckIns, goals] = await Promise.all([
      mealsCollection.query((item) => item.userId === link.elderlyUserId), medicationsCollection.query((item) => item.userId === link.elderlyUserId), medicationLogsCollection.query((item) => item.userId === link.elderlyUserId), checkInsCollection.query((item) => item.userId === link.elderlyUserId), nutritionGoalsCollection.query((item) => item.userId === link.elderlyUserId),
    ]);
    setElderlyUserId(link.elderlyUserId); setMeals(loadedMeals); setMedications(meds); setLogs(loadedLogs); setCheckIns(loadedCheckIns); setGoal(goals[0] ?? null);
  }, [guardianUserId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resolvedGoal = useMemo<NutritionGoal>(() => goal ?? { id: elderlyUserId, userId: elderlyUserId, ...DEFAULT_NUTRITION_GOAL, updatedAt: new Date().toISOString() }, [elderlyUserId, goal]);
  const summary = useMemo(() => summarizeNutritionForDate(meals, date, resolvedGoal), [date, meals, resolvedGoal]);
  const trend = useMemo(() => buildNutritionTrend(meals, date, 7, resolvedGoal), [date, meals, resolvedGoal]);
  const dayMeals = meals.filter((meal) => isoToLocalDate(meal.recordedAt) === date);
  const dayLogs = logs.filter((log) => isoToLocalDate(log.takenAt) === date);
  const dayCheckIn = checkIns.find((checkIn) => checkIn.date === date);
  const scheduled = medications.reduce((sum, medication) => sum + medication.timesOfDay.length, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>식사·영양 기록</Text><Text style={styles.title}>상세 기록</Text></View><Pressable onPress={() => router.push('/guardian/alerts')} style={styles.iconButton}><Ionicons name="notifications-outline" size={27} color={colors.primary} /></Pressable></View>
        <DateNavigator date={date} onChange={setDate} calendarOpen={calendarOpen} onCalendarOpenChange={setCalendarOpen} />
        <View style={styles.modeTabs}><Pressable onPress={() => setMode('day')} style={[styles.modeTab, mode === 'day' && styles.modeTabActive]}><Text style={[styles.modeText, mode === 'day' && styles.modeTextActive]}>일간</Text></Pressable><Pressable onPress={() => setMode('week')} style={[styles.modeTab, mode === 'week' && styles.modeTabActive]}><Text style={[styles.modeText, mode === 'week' && styles.modeTextActive]}>최근 7일</Text></Pressable></View>
        {mode === 'day' ? (
          <>
            <NutritionOverview summary={summary} goal={resolvedGoal} />
            <View style={styles.section}><Text style={styles.sectionTitle}>끼니별 사진과 분석</Text><MealPhotoGrid meals={dayMeals} onMealPress={(meal) => router.push({ pathname: '/guardian/analysis', params: { mealId: meal.id } })} onAddPress={() => {}} /></View>
            <View style={styles.statusRow}>
              <Card style={styles.statusCard}><Text style={styles.statusLabel}>복약</Text><Text style={styles.statusValue}>{dayLogs.length}/{scheduled}</Text><Text style={styles.statusCaption}>복용 기록</Text></Card>
              <Card style={styles.statusCard}><Text style={styles.statusLabel}>컨디션</Text><Text style={styles.statusValue}>{dayCheckIn ? dayCheckIn.condition === 'good' ? '좋음' : dayCheckIn.condition === 'normal' ? '보통' : '나쁨' : '미확인'}</Text><Text style={styles.statusCaption}>체크인 상태</Text></Card>
            </View>
          </>
        ) : <NutritionTrendChart summaries={trend} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { ...type.callout, color: colors.textMuted }, title: { ...type.title, color: colors.text }, iconButton: { width: 54, height: 54, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  modeTabs: { flexDirection: 'row', backgroundColor: colors.surfaceSunken, borderRadius: radius.lg, padding: spacing.xxs }, modeTab: { flex: 1, minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, modeTabActive: { backgroundColor: colors.primary }, modeText: { ...type.bodyStrong, color: colors.textMuted }, modeTextActive: { color: colors.onPrimary }, section: { gap: spacing.sm }, sectionTitle: { ...type.heading, color: colors.text }, statusRow: { flexDirection: 'row', gap: spacing.sm }, statusCard: { flex: 1 }, statusLabel: { ...type.caption, color: colors.textMuted }, statusValue: { ...type.heading, color: colors.text, marginTop: spacing.xs }, statusCaption: { ...type.caption, color: colors.textFaint },
});
