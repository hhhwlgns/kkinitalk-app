import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlarmIcon } from '../../src/components/icons/AlarmIcon';
import { CameraIcon } from '../../src/components/icons/CameraIcon';
import { CheckIcon } from '../../src/components/icons/CheckIcon';
import { ChevronIcon } from '../../src/components/icons/ChevronIcon';
import { PillIcon } from '../../src/components/icons/PillIcon';
import { Card } from '../../src/components/ui';
import { buildAlertCandidates } from '../../src/domain/alertRules';
import { formatDateWithWeekday, formatIsoTime, isoToLocalDate, todayDate } from '../../src/domain/date';
import { findConnectedLink } from '../../src/domain/guardianLink';
import type { CheckIn, ConditionLevel, GuardianAlert, Meal, MedicationLog } from '../../src/domain/types';
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
import { useRole } from '../../src/state/RoleContext';
import { colors, fontFamily, minTouchTarget, radius, shadow, spacing, type as typeScale } from '../../src/theme/tokens';

const CONDITION_LABEL: Record<ConditionLevel, string> = {
  good: '좋음',
  normal: '보통',
  bad: '좋지 않음',
};

interface TimelineEntry {
  id: string;
  at: string;
  time: string;
  title: string;
  description: string;
  tone: 'good' | 'caution' | 'neutral';
  kind: 'checkin' | 'meal' | 'medication';
  mealId?: string;
}

function relativeTime(iso: string, now: Date): string {
  const diffMinutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours}시간 전`;
}

export default function GuardianHomeScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';

  const [checking, setChecking] = useState(true);
  const [elderlyName, setElderlyName] = useState('연결된 부모님');
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

    const profile = profiles[profiles.length - 1];
    const todayCheckInItem = checkIns.find((item) => item.date === today) ?? null;
    const todaysMeals = meals.filter((item) => isoToLocalDate(item.recordedAt) === today);
    const todaysLogs = medicationLogs.filter((item) => isoToLocalDate(item.takenAt) === today);

    setElderlyName(profile?.name || '연결된 부모님');
    setElderlyAge(profile?.age ?? null);
    setTodayCheckIn(todayCheckInItem);
    setCheckInAt(todayCheckInItem?.recordedAt ?? null);
    setTodayMeals(todaysMeals);
    setTodayLogs(todaysLogs);
    setMedicationCount(medications.length);
    setRecentMeals([...meals].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).slice(0, 5));
    setRecentLogs([...medicationLogs].sort((a, b) => b.takenAt.localeCompare(a.takenAt)).slice(0, 5));

    const candidates = buildAlertCandidates(
      elderlyUserId,
      new Date(),
      checkIns,
      meals,
      medications,
      medicationLogs,
      consentRecord?.highRiskSharingConsent ?? false,
    );
    const createdAt = new Date().toISOString();
    for (const candidate of candidates) {
      if (!(await guardianAlertsCollection.getById(candidate.id))) {
        await guardianAlertsCollection.upsert({ ...candidate, createdAt, acknowledged: false, comment: null });
      }
    }

    const alerts = await guardianAlertsCollection.query((item) => item.elderlyUserId === elderlyUserId);
    setUnacknowledgedAlerts(alerts.filter((item) => !item.acknowledged));
    setChecking(false);
  }, [guardianUserId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const now = new Date();
  const latestAlert = useMemo(
    () => [...unacknowledgedAlerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null,
    [unacknowledgedAlerts],
  );
  const hoursSinceCheckIn = checkInAt ? Math.max(0, (now.getTime() - new Date(checkInAt).getTime()) / 3600000) : null;
  const checkInIsStale = hoursSinceCheckIn !== null && hoursSinceCheckIn >= 6;
  const statusTone = !todayCheckIn ? 'caution' : todayCheckIn.condition === 'bad' ? 'danger' : checkInIsStale ? 'caution' : 'good';
  const statusTitle = !todayCheckIn
    ? '아직 오늘 상태가 확인되지 않았어요'
    : todayCheckIn.condition === 'bad'
      ? '오늘은 세심한 확인이 필요해요'
      : checkInIsStale
        ? '마지막 확인 당시 괜찮았어요'
        : `${elderlyName} 님은 지금까지 괜찮아요`;
  const statusDescription = checkInAt
    ? `${relativeTime(checkInAt, now)}에 마지막으로 확인했어요`
    : '체크인을 완료하면 상태를 알려드려요';

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    if (todayCheckIn) {
      entries.push({
        id: `checkin-${todayCheckIn.id}`,
        at: todayCheckIn.recordedAt,
        time: formatIsoTime(todayCheckIn.recordedAt),
        title: '오늘 상태를 알려주셨어요',
        description: `컨디션 ${CONDITION_LABEL[todayCheckIn.condition]}`,
        tone: todayCheckIn.condition === 'bad' ? 'caution' : 'good',
        kind: 'checkin',
      });
    }
    for (const meal of recentMeals.filter((item) => isoToLocalDate(item.recordedAt) === todayDate())) {
      entries.push({
        id: `meal-${meal.id}`,
        at: meal.recordedAt,
        time: formatIsoTime(meal.recordedAt),
        title: `${meal.foods[0]?.name ?? '식사'}을 드셨어요`,
        description: meal.fitness === 'good' ? '영양 상태가 대체로 좋아요' : '확인할 영양 정보가 있어요',
        tone: meal.fitness === 'good' ? 'good' : 'caution',
        kind: 'meal',
        mealId: meal.id,
      });
    }
    for (const log of recentLogs.filter((item) => isoToLocalDate(item.takenAt) === todayDate())) {
      entries.push({
        id: `medication-${log.id}`,
        at: log.takenAt,
        time: formatIsoTime(log.takenAt),
        title: '약을 드셨어요',
        description: '복약 기록이 남겨졌어요',
        tone: 'good',
        kind: 'medication',
      });
    }
    return entries.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  }, [todayCheckIn, recentMeals, recentLogs]);

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>부모님의 오늘을 불러오고 있어요...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.date}>{formatDateWithWeekday(now)}</Text>
          <View style={styles.profileRow}>
            <View>
              <Text style={styles.title}>{elderlyName} 님의 하루</Text>
              <Text style={styles.relationship}>연결된 가족{elderlyAge !== null ? ` · ${elderlyAge}세` : ''}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{elderlyName.charAt(0) || '?'}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.statusCard, styles[`statusCard_${statusTone}`]]}>
          <View style={[styles.statusIcon, styles[`statusIcon_${statusTone}`]]}>
            {statusTone === 'good' ? (
              <CheckIcon size={22} color={colors.onPrimary} />
            ) : (
              <Text style={styles.statusIconText}>!</Text>
            )}
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.statusTitle, styles[`statusText_${statusTone}`]]}>{statusTitle}</Text>
            <Text style={styles.statusDescription}>{statusDescription}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>확인이 필요해요</Text>
            {unacknowledgedAlerts.length > 0 && <Text style={styles.alertCount}>{unacknowledgedAlerts.length}건</Text>}
          </View>
          {latestAlert ? (
            <View style={styles.alertCard}>
              <View style={styles.alertTopRow}>
                <View style={styles.alertIcon}><Text style={styles.alertIconText}>!</Text></View>
                <Text style={styles.alertMessage}>{latestAlert.message}</Text>
              </View>
              <Text style={styles.alertGuide} numberOfLines={1}>
                {unacknowledgedAlerts.length > 1
                  ? `가장 최근 알림 · 이외 ${unacknowledgedAlerts.length - 1}건`
                  : '기록을 살펴보고 필요한 경우 연락해주세요.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/guardian/alerts')}
                style={({ pressed }) => [styles.alertButton, pressed && styles.pressed]}
              >
                <Text style={styles.alertButtonText}>상세 확인</Text>
                <ChevronIcon size={18} color={colors.onPrimary} />
              </Pressable>
            </View>
          ) : (
            <Card tone="flat" style={styles.emptyAlertCard}>
              <View style={styles.emptyAlertIcon}><CheckIcon size={18} color={colors.good} /></View>
              <View style={styles.flex1}>
                <Text style={styles.emptyAlertTitle}>지금 확인할 알림이 없어요</Text>
                <Text style={styles.emptyAlertDescription}>새로운 변화가 생기면 바로 알려드릴게요.</Text>
              </View>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘 상태</Text>
          <View style={styles.metricRow}>
            <MetricCard label="식사" value={`${todayMeals.length}끼`} description="기록" />
            <MetricCard label="복약" value={`${todayLogs.length}/${medicationCount}`} description="완료" />
            <MetricCard
              label="컨디션"
              value={todayCheckIn ? CONDITION_LABEL[todayCheckIn.condition] : '미확인'}
              description="체크인"
              tone={todayCheckIn?.condition === 'bad' ? 'caution' : 'default'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 활동</Text>
            <Pressable onPress={() => router.push('/guardian/history')} hitSlop={8}>
              <Text style={styles.sectionLink}>전체 보기</Text>
            </Pressable>
          </View>
          <Card style={styles.timelineCard}>
            {timeline.length === 0 ? (
              <Text style={styles.timelineEmpty}>오늘은 아직 남겨진 기록이 없어요.</Text>
            ) : (
              timeline.map((entry, index) => (
                <Pressable
                  key={entry.id}
                  disabled={!entry.mealId}
                  onPress={() => entry.mealId && router.push({ pathname: '/guardian/analysis', params: { mealId: entry.mealId } })}
                  style={({ pressed }) => [styles.timelineRow, pressed && entry.mealId && styles.pressed]}
                >
                  <Text style={styles.timelineTime}>{entry.time}</Text>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, styles[`timelineDot_${entry.tone}`]]} />
                    {index < timeline.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineTitleRow}>
                      <TimelineIcon kind={entry.kind} />
                      <Text style={styles.timelineTitle}>{entry.title}</Text>
                    </View>
                    <Text style={styles.timelineDescription}>{entry.description}</Text>
                  </View>
                  {entry.mealId && <ChevronIcon size={16} color={colors.textFaint} />}
                </Pressable>
              ))
            )}
          </Card>
        </View>

        <Pressable onPress={() => router.push('/guardian/report')} style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}>
          <Text style={styles.reportButtonText}>주간 리포트 보기</Text>
          <ChevronIcon size={18} color={colors.primary} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value, description, tone = 'default' }: { label: string; value: string; description: string; tone?: 'default' | 'caution' }) {
  return (
    <View style={[styles.metricCard, tone === 'caution' && styles.metricCardCaution]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone === 'caution' && styles.metricValueCaution]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.metricDescription}>{description}</Text>
    </View>
  );
}

function TimelineIcon({ kind }: { kind: TimelineEntry['kind'] }) {
  if (kind === 'meal') return <CameraIcon size={16} color={colors.textMuted} />;
  if (kind === 'medication') return <PillIcon size={16} color={colors.textMuted} />;
  return <AlarmIcon size={16} color={colors.textMuted} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex1: { flex: 1 },
  pressed: { opacity: 0.72 },
  loadingText: { ...typeScale.body, color: colors.textMuted, padding: spacing.lg },
  header: { gap: spacing.xs },
  date: { ...typeScale.callout, color: colors.textMuted },
  profileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typeScale.title, color: colors.text },
  relationship: { ...typeScale.callout, color: colors.textMuted, marginTop: spacing.xxs },
  avatar: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typeScale.heading, color: colors.primary },
  statusCard: { borderRadius: radius.xl, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1 },
  statusCard_good: { backgroundColor: colors.goodBg, borderColor: colors.goodBorder },
  statusCard_caution: { backgroundColor: colors.cautionBg, borderColor: colors.cautionBorder },
  statusCard_danger: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
  statusIcon: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  statusIcon_good: { backgroundColor: colors.good },
  statusIcon_caution: { backgroundColor: colors.caution },
  statusIcon_danger: { backgroundColor: colors.danger },
  statusIconText: { ...typeScale.heading, color: colors.onPrimary },
  statusTitle: { ...typeScale.bodyStrong },
  statusText_good: { color: colors.good },
  statusText_caution: { color: colors.caution },
  statusText_danger: { color: colors.danger },
  statusDescription: { ...typeScale.callout, color: colors.textMuted, marginTop: spacing.xxs },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typeScale.heading, color: colors.text },
  sectionLink: { ...typeScale.callout, color: colors.primary, fontFamily: fontFamily.bold },
  alertCount: { ...typeScale.callout, color: colors.danger, fontFamily: fontFamily.bold },
  alertCard: { borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder },
  alertTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  alertIcon: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  alertIconText: { ...typeScale.bodyStrong, color: colors.onPrimary },
  alertMessage: { ...typeScale.bodyStrong, color: colors.danger, flex: 1 },
  alertGuide: { ...typeScale.caption, color: colors.textMuted, marginTop: spacing.xs },
  alertButton: { minHeight: minTouchTarget - spacing.xxs, marginTop: spacing.sm, borderRadius: radius.md, backgroundColor: colors.danger, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertButtonText: { ...typeScale.bodyStrong, color: colors.onPrimary },
  emptyAlertCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emptyAlertIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.goodBg, alignItems: 'center', justifyContent: 'center' },
  emptyAlertTitle: { ...typeScale.bodyStrong, color: colors.text },
  emptyAlertDescription: { ...typeScale.callout, color: colors.textMuted, marginTop: spacing.xxs },
  metricRow: { flexDirection: 'row', gap: spacing.sm },
  metricCard: { flex: 1, minHeight: 118, borderRadius: radius.lg, padding: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  metricCardCaution: { backgroundColor: colors.cautionBg, borderColor: colors.cautionBorder },
  metricLabel: { ...typeScale.caption, color: colors.textMuted },
  metricValue: { ...typeScale.heading, color: colors.text, marginTop: spacing.sm },
  metricValueCaution: { color: colors.caution },
  metricDescription: { ...typeScale.caption, color: colors.textFaint, marginTop: spacing.xxs },
  timelineCard: { paddingVertical: spacing.xs },
  timelineEmpty: { ...typeScale.body, color: colors.textMuted, paddingVertical: spacing.md },
  timelineRow: { minHeight: 78, flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm },
  timelineTime: { ...typeScale.caption, color: colors.textMuted, width: 54, paddingTop: spacing.xxs },
  timelineRail: { width: 18, alignItems: 'center', alignSelf: 'stretch' },
  timelineDot: { width: 10, height: 10, borderRadius: radius.pill, marginTop: spacing.xs },
  timelineDot_good: { backgroundColor: colors.good },
  timelineDot_caution: { backgroundColor: colors.caution },
  timelineDot_neutral: { backgroundColor: colors.textFaint },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.dividerLight, marginTop: spacing.xxs },
  timelineContent: { flex: 1, paddingHorizontal: spacing.sm },
  timelineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  timelineTitle: { ...typeScale.bodyStrong, color: colors.text, flex: 1 },
  timelineDescription: { ...typeScale.callout, color: colors.textMuted, marginTop: spacing.xxs },
  reportButton: { minHeight: minTouchTarget, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportButtonText: { ...typeScale.bodyStrong, color: colors.primary },
});
