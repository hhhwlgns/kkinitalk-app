import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NutritionBalanceTrend } from '../../src/components/nutrition/NutritionBalanceTrend';
import { Card, EmptyState, ScreenState } from '../../src/components/ui';
import { buildNutritionBalanceInsight, DEFAULT_NUTRITION_GOAL, recentDateStrings, summarizeNutritionForDate, type DailyNutritionSummary } from '../../src/domain/dailyNutrition';
import { isoToLocalDate, todayDate } from '../../src/domain/date';
import { findConnectedLink } from '../../src/domain/guardianLink';
import type { CheckIn, Meal, Medication, MedicationLog, NutritionGoal } from '../../src/domain/types';
import { checkInsCollection, guardianLinksCollection, mealsCollection, medicationLogsCollection, medicationsCollection, nutritionGoalsCollection } from '../../src/mocks/db/collections';
import { useRole } from '../../src/state/RoleContext';
import { colors, minTouchTarget, radius, spacing, type } from '../../src/theme/tokens';

interface WeeklyData {
  summaries: DailyNutritionSummary[];
  meals: Meal[];
  medications: Medication[];
  logs: MedicationLog[];
  checkIns: CheckIn[];
}

export default function GuardianReportScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const link = findConnectedLink(await guardianLinksCollection.getAll(), guardianUserId);
    if (!link) { router.replace('/guardian/connect'); return; }
    const [meals, medications, logs, checkIns, goals] = await Promise.all([
      mealsCollection.query((item) => item.userId === link.elderlyUserId),
      medicationsCollection.query((item) => item.userId === link.elderlyUserId && item.active !== false),
      medicationLogsCollection.query((item) => item.userId === link.elderlyUserId),
      checkInsCollection.query((item) => item.userId === link.elderlyUserId),
      nutritionGoalsCollection.query((item) => item.userId === link.elderlyUserId),
    ]);
    const goal: NutritionGoal = goals[0] ?? { id: link.elderlyUserId, userId: link.elderlyUserId, ...DEFAULT_NUTRITION_GOAL, updatedAt: new Date().toISOString() };
    const dates = recentDateStrings(todayDate(), 7);
    setData({ summaries: dates.map((date) => summarizeNutritionForDate(meals, date, goal)), meals, medications, logs, checkIns });
    setLoading(false);
  }, [guardianUserId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const metrics = useMemo(() => {
    if (!data) return null;
    const dates = new Set(data.summaries.map((summary) => summary.date));
    const totalMeals = data.summaries.reduce((sum, summary) => sum + summary.mealCount, 0);
    const daysWithMeals = data.summaries.filter((summary) => summary.mealCount > 0).length;
    const recordedBalances = data.summaries.filter((summary) => summary.mealCount > 0).map(buildNutritionBalanceInsight);
    const averageBalance = recordedBalances.length ? Math.round(recordedBalances.reduce((sum, item) => sum + item.score, 0) / recordedBalances.length) : null;
    const scheduledPerDay = data.medications.reduce((sum, medication) => sum + medication.timesOfDay.length, 0);
    const taken = data.logs.filter((log) => dates.has(isoToLocalDate(log.scheduledFor)) && log.status !== 'skipped').length;
    const skipped = data.logs.filter((log) => dates.has(isoToLocalDate(log.scheduledFor)) && log.status === 'skipped').length;
    const scheduled = scheduledPerDay * 7;
    const adherence = scheduled > 0 ? Math.min(100, Math.round(taken / scheduled * 100)) : null;
    const weeklyCheckIns = data.checkIns.filter((checkIn) => dates.has(checkIn.date));
    const badDays = weeklyCheckIns.filter((checkIn) => checkIn.condition === 'bad').length;
    return { totalMeals, daysWithMeals, averageBalance, adherence, skipped, checkInDays: weeklyCheckIns.length, badDays };
  }, [data]);

  if (loading) return <SafeAreaView style={styles.container}><ScreenState kind="loading" title="주간 기록을 정리하고 있어요" description="식사·영양·복약·컨디션을 함께 살펴보는 중이에요." /></SafeAreaView>;
  if (!data || !metrics) return <SafeAreaView style={styles.container}><EmptyState title="리포트를 만들 수 없어요" description="연결 상태를 다시 확인해 주세요." /></SafeAreaView>;

  const hasData = metrics.totalMeals > 0 || metrics.adherence !== null || metrics.checkInDays > 0;
  const summary = !hasData
    ? '이번 주 기록이 아직 없어요.'
    : `${metrics.daysWithMeals >= 5 ? '식사 기록은 꾸준해요.' : `식사 기록이 ${7 - metrics.daysWithMeals}일 비어 있어요.`} ${metrics.adherence !== null ? `복약 이행은 ${metrics.adherence}%예요.` : ''} ${metrics.badDays > 0 ? `컨디션 확인이 필요한 날이 ${metrics.badDays}일 있었어요.` : '기록된 컨디션은 대체로 안정적이에요.'}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View><Text style={styles.eyebrow}>최근 7일</Text><Text style={styles.title}>주간 돌봄 리포트</Text></View>
        <Card raised style={styles.summaryCard}><View style={styles.summaryIcon}><Ionicons name="sparkles" size={26} color={colors.primary} /></View><View style={styles.flex1}><Text style={styles.summaryLabel}>이번 주 한눈에</Text><Text style={styles.summaryText}>{summary}</Text></View></Card>

        <View style={styles.metricGrid}>
          <MetricCard icon="restaurant" label="식사 규칙성" value={`${metrics.daysWithMeals}/7일`} description={`총 ${metrics.totalMeals}끼 기록`} tone={metrics.daysWithMeals >= 5 ? 'good' : 'caution'} />
          <MetricCard icon="pie-chart" label="영양 균형" value={metrics.averageBalance === null ? '기록 전' : `${metrics.averageBalance}점`} description="기록된 날 평균" tone={metrics.averageBalance !== null && metrics.averageBalance >= 80 ? 'good' : 'caution'} />
          <MetricCard icon="medkit" label="복약 이행" value={metrics.adherence === null ? '일정 없음' : `${metrics.adherence}%`} description={metrics.skipped > 0 ? `미복용 ${metrics.skipped}회` : '미복용 기록 없음'} tone={metrics.adherence !== null && metrics.adherence >= 80 ? 'good' : 'caution'} />
          <MetricCard icon="happy" label="컨디션" value={`${metrics.checkInDays}/7일`} description={metrics.badDays > 0 ? `확인 필요 ${metrics.badDays}일` : '특이 기록 없음'} tone={metrics.badDays === 0 ? 'good' : 'caution'} />
        </View>

        <NutritionBalanceTrend summaries={data.summaries} />

        <Card style={styles.nextCard}>
          <Text style={styles.nextTitle}>다음 주에는 이렇게 도와주세요</Text>
          <ActionLine number="1" text={metrics.daysWithMeals < 5 ? '식사 기록이 비는 시간에 안부를 확인해 주세요.' : '지금처럼 식사 기록을 꾸준히 격려해 주세요.'} />
          <ActionLine number="2" text={metrics.adherence !== null && metrics.adherence < 80 ? '놓치기 쉬운 약 시간을 어르신과 다시 맞춰보세요.' : '현재 복약 습관을 유지하도록 응원해 주세요.'} />
          <ActionLine number="3" text={metrics.badDays > 0 ? '컨디션이 좋지 않았던 날의 식사와 복약을 함께 살펴보세요.' : '맞춤 식단으로 다음 주 식사를 미리 준비할 수 있어요.'} />
        </Card>

        <View style={styles.actions}><Pressable onPress={() => router.push('/guardian/history')} style={styles.secondaryButton}><Text style={styles.secondaryText}>상세 기록 보기</Text></Pressable><Pressable onPress={() => router.push('/guardian/shop')} style={styles.primaryButton}><Text style={styles.primaryText}>맞춤 식단 보내기</Text></Pressable></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ icon, label, value, description, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; description: string; tone: 'good' | 'caution' }) {
  const color = tone === 'good' ? colors.good : colors.caution;
  return <Card style={styles.metricCard}><Ionicons name={icon} size={23} color={color} /><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricDescription}>{description}</Text></Card>;
}

function ActionLine({ number, text }: { number: string; text: string }) {
  return <View style={styles.actionLine}><View style={styles.number}><Text style={styles.numberText}>{number}</Text></View><Text style={styles.actionLineText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }, flex1: { flex: 1 }, eyebrow: { ...type.callout, color: colors.primary }, title: { ...type.title, color: colors.text, marginTop: spacing.xxs },
  summaryCard: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }, summaryIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, summaryLabel: { ...type.caption, color: colors.primary }, summaryText: { ...type.heading, color: colors.text, marginTop: spacing.xxs },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, metricCard: { width: '48%', gap: spacing.xxs }, metricLabel: { ...type.caption, color: colors.textMuted }, metricValue: { ...type.heading, color: colors.text }, metricDescription: { ...type.caption, color: colors.textMuted },
  nextCard: { gap: spacing.md }, nextTitle: { ...type.heading, color: colors.text }, actionLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, number: { width: 26, height: 26, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, numberText: { ...type.caption, color: colors.primary }, actionLineText: { ...type.body, color: colors.text, flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm }, primaryButton: { minHeight: minTouchTarget, flex: 1, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, primaryText: { ...type.callout, color: colors.onPrimary }, secondaryButton: { minHeight: minTouchTarget, flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, secondaryText: { ...type.callout, color: colors.primary },
});
