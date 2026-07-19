import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MealPhotoGrid } from '../../src/components/nutrition/MealPhotoGrid';
import { NutritionBalanceHero } from '../../src/components/nutrition/NutritionBalanceHero';
import { NutritionBalanceTrend } from '../../src/components/nutrition/NutritionBalanceTrend';
import { Card } from '../../src/components/ui';
import { buildAlertCandidates } from '../../src/domain/alertRules';
import { buildContextualNutritionBalanceInsight, buildNutritionTrend, DEFAULT_NUTRITION_GOAL, summarizeNutritionForDate } from '../../src/domain/dailyNutrition';
import { formatDateWithWeekday, isoToLocalDate, todayDate } from '../../src/domain/date';
import { findConnectedLink } from '../../src/domain/guardianLink';
import { createId } from '../../src/domain/id';
import type { CheckIn, GuardianAlert, HealthProfile, Meal, Medication, MedicationLog, NutritionGoal } from '../../src/domain/types';
import {
  checkInsCollection, consentRecordsCollection, guardianAlertsCollection, guardianCareActionsCollection, guardianLinksCollection,
  healthProfilesCollection, mealsCollection, medicationLogsCollection, medicationsCollection, nutritionGoalsCollection,
} from '../../src/mocks/db/collections';
import { useRole } from '../../src/state/RoleContext';
import { colors, minTouchTarget, radius, spacing, type } from '../../src/theme/tokens';

export default function GuardianHomeScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';
  const today = todayDate();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [alerts, setAlerts] = useState<GuardianAlert[]>([]);
  const [goal, setGoal] = useState<NutritionGoal | null>(null);
  const [elderlyUserId, setElderlyUserId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const links = await guardianLinksCollection.getAll();
    const link = findConnectedLink(links, guardianUserId);
    if (!link) { router.replace('/guardian/connect'); return; }
    const elderlyUserId = link.elderlyUserId;
    setElderlyUserId(elderlyUserId);
    const [profiles, checkIns, allMeals, meds, allLogs, consent, goals] = await Promise.all([
      healthProfilesCollection.query((item) => item.userId === elderlyUserId),
      checkInsCollection.query((item) => item.userId === elderlyUserId),
      mealsCollection.query((item) => item.userId === elderlyUserId),
      medicationsCollection.query((item) => item.userId === elderlyUserId && item.active !== false),
      medicationLogsCollection.query((item) => item.userId === elderlyUserId),
      consentRecordsCollection.getById(elderlyUserId),
      nutritionGoalsCollection.query((item) => item.userId === elderlyUserId),
    ]);
    const candidates = buildAlertCandidates(elderlyUserId, new Date(), checkIns, allMeals, meds, allLogs, consent?.highRiskSharingConsent ?? false);
    for (const candidate of candidates) {
      if (!(await guardianAlertsCollection.getById(candidate.id))) {
        await guardianAlertsCollection.upsert({ ...candidate, createdAt: new Date().toISOString(), acknowledged: false, comment: null });
      }
    }
    const loadedAlerts = await guardianAlertsCollection.query((item) => item.elderlyUserId === elderlyUserId && !item.acknowledged);
    setProfile(profiles[profiles.length - 1] ?? null);
    setCheckIn(checkIns.find((item) => item.date === today) ?? null);
    setMeals(allMeals);
    setMedications(meds);
    setLogs(allLogs.filter((item) => isoToLocalDate(item.takenAt) === today && item.status !== 'skipped'));
    setAlerts(loadedAlerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setGoal(goals[0] ?? null);
  }, [guardianUserId, today]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resolvedGoal = useMemo<NutritionGoal>(() => goal ?? { id: profile?.userId ?? 'elderly-self', userId: profile?.userId ?? 'elderly-self', ...DEFAULT_NUTRITION_GOAL, updatedAt: new Date().toISOString() }, [goal, profile]);
  const summary = useMemo(() => summarizeNutritionForDate(meals, today, resolvedGoal), [meals, resolvedGoal, today]);
  const balanceInsight = useMemo(() => buildContextualNutritionBalanceInsight(summary, resolvedGoal, { now: new Date(), isToday: true }), [resolvedGoal, summary]);
  const trend = useMemo(() => buildNutritionTrend(meals, today, 7, resolvedGoal), [meals, resolvedGoal, today]);
  const todayMeals = useMemo(() => meals.filter((meal) => isoToLocalDate(meal.recordedAt) === today), [meals, today]);
  const scheduledDoseCount = medications.reduce((sum, medication) => sum + medication.timesOfDay.length, 0);
  const latestAlert = alerts[0];

  async function recordCareAction(type: 'checkIn' | 'requestMealRecord' | 'requestMedicationCheck', message: string) {
    if (!elderlyUserId) return;
    await guardianCareActionsCollection.upsert({ id: createId('care-action'), guardianUserId, elderlyUserId, type, message, createdAt: new Date().toISOString() });
    setActionMessage(message);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.flex1}><Text style={styles.date}>{formatDateWithWeekday(new Date())}</Text><Text style={styles.title}>{profile?.name ?? '어르신'} 님의 오늘</Text><Text style={styles.subtitle}>{profile?.age ? `${profile.age}세 · ` : ''}{checkIn ? `컨디션 ${checkIn.condition === 'good' ? '좋음' : checkIn.condition === 'normal' ? '보통' : '좋지 않음'}` : '아직 체크인 전'}</Text></View>
          <Pressable onPress={() => router.push('/guardian/alerts')} style={styles.alertBell} accessibilityLabel={`알림 ${alerts.length}개`}>
            <Ionicons name="notifications" size={28} color={colors.primary} />
            {alerts.length > 0 && <View style={styles.alertBadge}><Text style={styles.alertBadgeText}>{alerts.length}</Text></View>}
          </Pressable>
        </View>

        {latestAlert ? (
          <Pressable onPress={() => router.push('/guardian/alerts')} style={({ pressed }) => [styles.alertCard, pressed && styles.pressed]}>
            <View style={styles.alertIcon}><Ionicons name="warning" size={24} color={colors.danger} /></View>
            <View style={styles.flex1}><Text style={styles.alertEyebrow}>확인이 필요해요</Text><Text style={styles.alertMessage}>{latestAlert.message}</Text>{alerts.length > 1 && <Text style={styles.alertMore}>이외 {alerts.length - 1}건의 알림이 있어요</Text>}</View>
            <Ionicons name="chevron-forward" size={24} color={colors.danger} />
          </Pressable>
        ) : (
          <Card style={styles.safeCard}><Ionicons name="checkmark-circle" size={28} color={colors.good} /><Text style={styles.safeText}>지금 확인할 새로운 알림이 없어요.</Text></Card>
        )}

        <View style={styles.statusGrid}>
          <Card style={styles.statusTile}><Text style={styles.statusLabel}>영양 균형</Text><Text style={styles.statusValue}>{summary.mealCount === 0 ? '기록 전' : `${balanceInsight.score}점`}</Text></Card>
          <Card style={styles.statusTile}><Text style={styles.statusLabel}>식사 기록</Text><Text style={styles.statusValue}>{summary.mealCount}/3끼</Text></Card>
          <Card style={styles.statusTile}><Text style={styles.statusLabel}>복약 이행</Text><Text style={styles.statusValue}>{scheduledDoseCount === 0 ? '일정 없음' : `${logs.length}/${scheduledDoseCount}회`}</Text></Card>
          <Card style={styles.statusTile}><Text style={styles.statusLabel}>오늘 상태</Text><Text style={styles.statusValue}>{checkIn ? (checkIn.condition === 'good' ? '좋음' : checkIn.condition === 'normal' ? '보통' : '확인 필요') : '미확인'}</Text></Card>
        </View>

        <NutritionBalanceHero summary={summary} insight={balanceInsight} goal={resolvedGoal} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>오늘 식사</Text><Pressable onPress={() => router.push('/guardian/history')}><Text style={styles.link}>상세 기록</Text></Pressable></View>
          <MealPhotoGrid meals={todayMeals} onMealPress={(meal) => router.push({ pathname: '/guardian/analysis', params: { mealId: meal.id } })} onAddPress={() => {}} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>오늘 복약</Text><Pressable onPress={() => router.push('/guardian/medications')}><Text style={styles.link}>관리</Text></Pressable></View>
          <Pressable onPress={() => router.push('/guardian/medications')} style={({ pressed }) => [pressed && styles.pressed]}>
            <Card style={styles.medicationCard}>
              <View style={styles.medicationIcon}><Ionicons name="medkit" size={29} color={colors.primary} /></View>
              <View style={styles.flex1}><Text style={styles.medicationTitle}>{scheduledDoseCount}회 중 {logs.length}회 복용 기록</Text><Text style={styles.medicationText}>{scheduledDoseCount === 0 ? '등록된 복약 일정이 없습니다.' : logs.length >= scheduledDoseCount ? '오늘 예정된 약을 모두 드셨어요.' : `${Math.max(0, scheduledDoseCount - logs.length)}회 확인이 더 필요해요.`}</Text></View>
              <Ionicons name="chevron-forward" size={24} color={colors.textFaint} />
            </Card>
          </Pressable>
        </View>

        <NutritionBalanceTrend summaries={trend} />
        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>지금 도와드리기</Text><Text style={styles.actionCaption}>요청 내용이 돌봄 기록에 남아요</Text></View>
          <View style={styles.careGrid}>
            <Pressable onPress={() => recordCareAction('checkIn', '안부 확인을 요청했어요.')} style={styles.careButton}><Ionicons name="call" size={23} color={colors.primary} /><Text style={styles.careText}>안부 확인</Text></Pressable>
            <Pressable onPress={() => recordCareAction('requestMealRecord', '식사 기록을 부탁드렸어요.')} style={styles.careButton}><Ionicons name="camera" size={23} color={colors.primary} /><Text style={styles.careText}>식사 기록 요청</Text></Pressable>
            <Pressable onPress={() => recordCareAction('requestMedicationCheck', '복약 확인을 부탁드렸어요.')} style={styles.careButton}><Ionicons name="medkit" size={23} color={colors.primary} /><Text style={styles.careText}>복약 확인 요청</Text></Pressable>
          </View>
          {actionMessage && <View style={styles.actionFeedback}><Ionicons name="checkmark-circle" size={21} color={colors.good} /><Text style={styles.actionFeedbackText}>{actionMessage}</Text></View>}
        </View>
        <View style={styles.actionRow}>
          <Pressable onPress={() => router.push('/guardian/shop')} style={styles.primaryAction}><Ionicons name="gift" size={22} color={colors.onPrimary} /><Text style={styles.primaryActionText}>맞춤 식단 보내기</Text></Pressable>
          <Pressable onPress={() => router.push('/guardian/history')} style={styles.secondaryAction}><Ionicons name="calendar" size={22} color={colors.primary} /><Text style={styles.secondaryActionText}>기록 보기</Text></Pressable>
        </View>
        <Pressable onPress={() => router.push('/guardian/manage')} style={styles.manageButton}><Text style={styles.manageButtonText}>건강 프로필과 주간 리포트 보기</Text><Ionicons name="chevron-forward" size={22} color={colors.primary} /></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }, flex1: { flex: 1 }, pressed: { opacity: 0.72 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, date: { ...type.callout, color: colors.textMuted }, title: { ...type.title, color: colors.text, marginTop: 2 }, subtitle: { ...type.callout, color: colors.textMuted, marginTop: spacing.xs }, alertBell: { width: minTouchTarget, height: minTouchTarget, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, alertBadge: { position: 'absolute', right: -2, top: -2, minWidth: 22, height: 22, borderRadius: radius.pill, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }, alertBadgeText: { ...type.caption, color: colors.onPrimary },
  alertCard: { minHeight: 90, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, alertIcon: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, alertEyebrow: { ...type.caption, color: colors.danger }, alertMessage: { ...type.bodyStrong, color: colors.text, marginTop: 2 }, alertMore: { ...type.caption, color: colors.textMuted, marginTop: 2 }, safeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.goodBg, borderColor: colors.goodBorder }, safeText: { ...type.bodyStrong, color: colors.good },
  section: { gap: spacing.sm }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { ...type.heading, color: colors.text }, link: { ...type.callout, color: colors.primary }, medicationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, medicationIcon: { width: 54, height: 54, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, medicationTitle: { ...type.bodyStrong, color: colors.text }, medicationText: { ...type.caption, color: colors.textMuted, marginTop: 2 }, manageButton: { minHeight: minTouchTarget, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md }, manageButtonText: { ...type.bodyStrong, color: colors.primary },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, statusTile: { width: '48%', gap: spacing.xxs }, statusLabel: { ...type.caption, color: colors.textMuted }, statusValue: { ...type.heading, color: colors.text },
  actionRow: { flexDirection: 'row', gap: spacing.sm }, primaryAction: { minHeight: minTouchTarget, flex: 1, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm }, primaryActionText: { ...type.callout, color: colors.onPrimary }, secondaryAction: { minHeight: minTouchTarget, flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm }, secondaryActionText: { ...type.callout, color: colors.primary },
  actionCaption: { ...type.caption, color: colors.textMuted }, careGrid: { flexDirection: 'row', gap: spacing.xs }, careButton: { minHeight: 84, flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.xs }, careText: { ...type.caption, color: colors.text, textAlign: 'center' }, actionFeedback: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.md, backgroundColor: colors.goodBg, padding: spacing.sm }, actionFeedbackText: { ...type.callout, color: colors.good, flex: 1 },
});
