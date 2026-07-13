import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChevronIcon } from '../../src/components/icons/ChevronIcon';
import { colors, fontFamily, fontSize, fontSizeCompact, radius, shadow, spacing } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import {
  checkInsCollection,
  consentRecordsCollection,
  guardianAlertsCollection,
  guardianLinksCollection,
  healthProfilesCollection,
  medicationLogsCollection,
  medicationsCollection,
  mealsCollection,
} from '../../src/mocks/db/collections';
import { findConnectedLink } from '../../src/domain/guardianLink';
import { buildAlertCandidates } from '../../src/domain/alertRules';
import type { CheckIn, ConditionLevel, GuardianAlert, Meal, MedicationLog } from '../../src/domain/types';
import { formatDateWithWeekday, todayDate } from '../../src/domain/date';
import { sumNutrients } from '../../src/mocks/nutritionAnalysis';

const CONDITION_LABEL: Record<ConditionLevel, string> = {
  good: '좋음',
  normal: '보통',
  bad: '좋지 않음',
};

interface TimelineEntry {
  id: string;
  time: string;
  title: string;
  desc: string;
  dot: string;
  mealId?: string;
}

function minutesAgo(iso: string, now: Date): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.round(diffMin / 60);
  return `${diffHr}시간 전`;
}

function formatMealTime(iso: string): string {
  const date = new Date(iso);
  const hour24 = date.getHours();
  const minute = date.getMinutes();
  const period = hour24 < 12 ? '오전' : '오후';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minute === 0 ? `${period} ${hour12}시` : `${period} ${hour12}시 ${minute}분`;
}

export default function GuardianHomeScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';

  const [checking, setChecking] = useState(true);
  const [elderlyName, setElderlyName] = useState('연결된 어르신');
  const [elderlyAge, setElderlyAge] = useState<number | null>(null);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [medicationCount, setMedicationCount] = useState(0);
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState<GuardianAlert[]>([]);
  const [recentMeals, setRecentMeals] = useState<Meal[]>([]);
  const [recentLogs, setRecentLogs] = useState<MedicationLog[]>([]);
  const [checkInAt, setCheckInAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    const links = await guardianLinksCollection.getAll();
    const link = findConnectedLink(links, guardianUserId);

    if (!link) {
      setChecking(false);
      router.replace('/guardian/connect');
      return;
    }

    const elderlyUserId = link.elderlyUserId;
    const today = todayDate();

    const [profiles, checkIns, meals, medications, medicationLogs, consentRecord] = await Promise.all([
      healthProfilesCollection.query((item) => item.userId === elderlyUserId),
      checkInsCollection.query((item) => item.userId === elderlyUserId),
      mealsCollection.query((item) => item.userId === elderlyUserId),
      medicationsCollection.query((item) => item.userId === elderlyUserId),
      medicationLogsCollection.query((item) => item.userId === elderlyUserId),
      consentRecordsCollection.getById(elderlyUserId),
    ]);
    const highRiskSharingConsent = consentRecord?.highRiskSharingConsent ?? false;

    setElderlyName(profiles[0]?.name || '연결된 어르신');
    setElderlyAge(profiles[0]?.age ?? null);

    const todayCheckInItem = checkIns.find((item) => item.date === today) ?? null;
    setTodayCheckIn(todayCheckInItem);
    setCheckInAt(todayCheckInItem?.recordedAt ?? null);

    const todaysMeals = meals.filter((item) => item.recordedAt.slice(0, 10) === today);
    setTodayMeals(todaysMeals);

    const todaysLogs = medicationLogs.filter((item) => item.takenAt.slice(0, 10) === today);
    setTodayLogs(todaysLogs);
    setMedicationCount(medications.length);

    const sortedMeals = [...meals].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    setRecentMeals(sortedMeals.slice(0, 5));
    const sortedLogs = [...medicationLogs].sort((a, b) => b.takenAt.localeCompare(a.takenAt));
    setRecentLogs(sortedLogs.slice(0, 5));

    const candidates = buildAlertCandidates(
      elderlyUserId,
      new Date(),
      checkIns,
      meals,
      medications,
      medicationLogs,
      highRiskSharingConsent,
    );
    const now = new Date().toISOString();
    for (const candidate of candidates) {
      const existing = await guardianAlertsCollection.getById(candidate.id);
      if (!existing) {
        await guardianAlertsCollection.upsert({
          ...candidate,
          createdAt: now,
          acknowledged: false,
          comment: null,
        });
      }
    }

    const allAlerts = await guardianAlertsCollection.query((item) => item.elderlyUserId === elderlyUserId);
    setUnacknowledgedAlerts(allAlerts.filter((item) => !item.acknowledged));

    setChecking(false);
  }, [guardianUserId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalNutrients = useMemo(() => sumNutrients(todayMeals.flatMap((meal) => meal.foods)), [todayMeals]);
  const isSodiumCaution = totalNutrients.sodiumMg > 1500;
  const isSodiumDanger = totalNutrients.sodiumMg > 2000;

  const sodiumLabel = isSodiumDanger ? '초과' : isSodiumCaution ? '주의' : '양호';
  const sodiumBoxStyle = isSodiumDanger
    ? { backgroundColor: colors.dangerBg }
    : isSodiumCaution
      ? { backgroundColor: colors.cautionBg }
      : null;
  const sodiumLabelColor = isSodiumDanger ? colors.danger : isSodiumCaution ? colors.caution : colors.textMuted;
  const sodiumValueColor = isSodiumDanger ? colors.danger : isSodiumCaution ? colors.caution : colors.text;

  const now = new Date();
  const conditionGood = todayCheckIn?.condition === 'good' || todayCheckIn?.condition === 'normal';

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    if (todayCheckIn) {
      entries.push({
        id: `checkin-${todayCheckIn.id}`,
        time: formatMealTime(todayCheckIn.recordedAt),
        title: '아침 체크인 완료',
        desc: `컨디션 ${CONDITION_LABEL[todayCheckIn.condition]}`,
        dot: todayCheckIn.condition === 'bad' ? colors.danger : colors.good,
      });
    }
    for (const meal of recentMeals.filter((meal) => meal.recordedAt.slice(0, 10) === todayDate())) {
      const displayName = meal.foods.length > 0 ? `${meal.foods[0].name} 등` : '식사';
      entries.push({
        id: `meal-${meal.id}`,
        time: formatMealTime(meal.recordedAt),
        title: `${displayName} 식사`,
        desc: meal.fitness === 'good' ? '영양 적합 · 눌러서 분석 보기' : '나트륨 주의 · 눌러서 분석 보기',
        dot: meal.fitness === 'good' ? colors.good : colors.caution,
        mealId: meal.id,
      });
    }
    for (const log of recentLogs.filter((log) => log.takenAt.slice(0, 10) === todayDate())) {
      entries.push({
        id: `med-${log.id}`,
        time: formatMealTime(log.takenAt),
        title: '복약 완료',
        desc: '정해진 시간에 약을 드셨어요',
        dot: colors.good,
      });
    }
    return entries.sort((a, b) => b.time.localeCompare(a.time));
  }, [todayCheckIn, recentMeals, recentLogs]);

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>불러오는 중이에요...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>우리 {elderlyName.length > 1 ? '어르신' : elderlyName}</Text>
          <Text style={styles.dateLabel}>{formatDateWithWeekday(now)}</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{elderlyName.charAt(0) || '?'}</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.elderName}>
                {elderlyName}
                {elderlyAge !== null ? <Text style={styles.elderAge}> {elderlyAge}세</Text> : null}
              </Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: conditionGood ? colors.good : colors.danger }]} />
                <Text style={[styles.statusText, { color: conditionGood ? colors.good : colors.danger }]}>
                  {todayCheckIn
                    ? `오늘 컨디션 ${CONDITION_LABEL[todayCheckIn.condition]} · ${checkInAt ? minutesAgo(checkInAt, now) : ''} 체크인`
                    : '아직 체크인하지 않았어요'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryBoxLabel}>오늘 식사</Text>
              <Text style={styles.summaryBoxValue} numberOfLines={1} adjustsFontSizeToFit>
                {todayMeals.length}회
              </Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryBoxLabel}>복약</Text>
              <Text style={styles.summaryBoxValue} numberOfLines={1} adjustsFontSizeToFit>
                {todayLogs.length}/{medicationCount}
              </Text>
            </View>
            <View style={[styles.summaryBox, sodiumBoxStyle]}>
              <Text style={[styles.summaryBoxLabel, { color: sodiumLabelColor }]}>나트륨</Text>
              <Text style={[styles.summaryBoxValue, { color: sodiumValueColor }]} numberOfLines={1} adjustsFontSizeToFit>
                {sodiumLabel}
              </Text>
            </View>
          </View>
        </View>

        {unacknowledgedAlerts.length > 0 && (
          <Pressable style={styles.alertBanner} onPress={() => router.push('/guardian/alerts')}>
            <View style={styles.alertIconWrap}>
              <Text style={styles.alertIconLabel}>!</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.alertTitle}>나트륨 3일 연속 초과</Text>
              <Text style={styles.alertSub}>알림 {unacknowledgedAlerts.length}건 · 눌러서 확인</Text>
            </View>
            <ChevronIcon color={colors.danger} />
          </Pressable>
        )}

        <View style={styles.timelineCard}>
          <Text style={styles.timelineHeader}>오늘 기록</Text>
          {timeline.length === 0 ? (
            <Text style={styles.timelineEmpty}>아직 기록이 없어요</Text>
          ) : (
            timeline.map((entry, index) => (
              <Pressable
                key={entry.id}
                disabled={!entry.mealId}
                onPress={() =>
                  entry.mealId &&
                  router.push({ pathname: '/guardian/analysis', params: { mealId: entry.mealId } })
                }
                style={({ pressed }) => [
                  styles.timelineRow,
                  index === timeline.length - 1 && styles.timelineRowLast,
                  pressed && entry.mealId ? styles.timelinePressed : null,
                ]}
              >
                <Text style={styles.timelineTime}>{entry.time}</Text>
                <View style={[styles.timelineDot, { backgroundColor: entry.dot }]} />
                <View style={styles.flex1}>
                  <Text style={styles.timelineTitle}>{entry.title}</Text>
                  <Text style={styles.timelineDesc}>{entry.desc}</Text>
                </View>
                {entry.mealId ? <ChevronIcon size={13} color={colors.textFaint} /> : null}
              </Pressable>
            ))
          )}
        </View>

        <Pressable style={styles.reportButton} onPress={() => router.push('/guardian/report')}>
          <Text style={styles.reportButtonLabel}>주간 리포트 보기</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  flex1: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { fontSize: fontSizeCompact.sectionHeader, fontFamily: fontFamily.extrabold, color: colors.text, letterSpacing: -0.5 },
  dateLabel: { fontSize: fontSizeCompact.small, fontFamily: fontFamily.semibold, color: colors.textMuted },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.neutralFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: fontSizeCompact.label, fontFamily: fontFamily.extrabold, color: colors.avatarInitial },
  elderName: { fontSize: fontSize.label, fontFamily: fontFamily.extrabold, color: colors.text },
  elderAge: { fontSize: fontSize.small, fontFamily: fontFamily.semibold, color: colors.textMuted },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 9, height: 9, borderRadius: 4.5 },
  statusText: { fontSize: fontSize.small, fontFamily: fontFamily.bold },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  summaryBox: {
    flex: 1,
    backgroundColor: colors.cardSubBg,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  summaryBoxLabel: { fontSize: fontSize.meta, fontFamily: fontFamily.semibold, color: colors.textMuted },
  summaryBoxValue: { fontSize: fontSize.label, fontFamily: fontFamily.extrabold, color: colors.text, marginTop: 3 },
  alertBanner: {
    borderWidth: 1.5,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconLabel: { fontSize: fontSize.body, fontFamily: fontFamily.extrabold, color: colors.iconFillCream },
  alertTitle: { fontSize: fontSize.body, fontFamily: fontFamily.extrabold, color: colors.danger },
  alertSub: { fontSize: fontSize.small, fontFamily: fontFamily.medium, color: colors.textMuted, marginTop: 2 },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    ...shadow.card,
  },
  timelineHeader: { fontSize: fontSize.small, fontFamily: fontFamily.extrabold, color: colors.textMuted, marginBottom: spacing.xs },
  timelineEmpty: { fontSize: fontSize.small, fontFamily: fontFamily.semibold, color: colors.textFaint, paddingVertical: spacing.sm },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerLight,
  },
  timelineRowLast: { borderBottomWidth: 0 },
  timelinePressed: { opacity: 0.6 },
  timelineTime: { width: 44, fontSize: fontSize.meta, fontFamily: fontFamily.bold, color: colors.textMuted, marginTop: 3 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  timelineTitle: { fontSize: fontSize.body, fontFamily: fontFamily.bold, color: colors.text },
  timelineDesc: { fontSize: fontSize.small, fontFamily: fontFamily.medium, color: colors.textMuted, marginTop: 1 },
  reportButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  reportButtonLabel: { fontSize: fontSize.label, fontFamily: fontFamily.extrabold, color: colors.text },
  loadingText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    padding: spacing.lg,
  },
});
