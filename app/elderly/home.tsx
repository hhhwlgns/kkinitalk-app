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
import type { CheckIn, ConditionLevel, HealthProfile, Meal, Medication, MedicationLog } from '../../src/domain/types';
import { earliestTime, formatDateWithWeekday, formatKoreanTime, isoToLocalDate, todayDate } from '../../src/domain/date';
import {
  checkInsCollection,
  healthProfilesCollection,
  medicationLogsCollection,
  medicationsCollection,
  mealsCollection,
} from '../../src/mocks/db/collections';
import { useRole } from '../../src/state/RoleContext';
import { colors, fontFamily, minTouchTarget, radius, shadow, spacing, typeElder } from '../../src/theme/tokens';

const CONDITION_LABEL: Record<ConditionLevel, string> = {
  good: '좋아요',
  normal: '괜찮아요',
  bad: '좋지 않아요',
};

type MainTask = 'checkin' | 'medication' | 'meal';

export default function ElderlyHomeScreen() {
  const { activeUserId } = useRole();
  const userId = activeUserId ?? 'elderly-self';

  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logsToday, setLogsToday] = useState<MedicationLog[]>([]);
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);

  const load = useCallback(async () => {
    const today = todayDate();
    const [profiles, checkIns, meds, logs, meals] = await Promise.all([
      healthProfilesCollection.query((item) => item.userId === userId),
      checkInsCollection.query((item) => item.userId === userId && item.date === today),
      medicationsCollection.query((item) => item.userId === userId),
      medicationLogsCollection.query((item) => item.userId === userId),
      mealsCollection.query((item) => item.userId === userId),
    ]);

    setProfile(profiles[profiles.length - 1] ?? null);
    setTodayCheckIn(checkIns[0] ?? null);
    setMedications(meds);
    setLogsToday(logs.filter((item) => isoToLocalDate(item.takenAt) === today));
    setTodayMeals(meals.filter((item) => isoToLocalDate(item.recordedAt) === today));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const notTakenMeds = useMemo(
    () => medications.filter((med) => !logsToday.some((log) => log.medicationId === med.id)),
    [medications, logsToday],
  );
  const nextMed = useMemo(
    () => [...notTakenMeds].sort((a, b) => earliestTime(a.timesOfDay).localeCompare(earliestTime(b.timesOfDay)))[0] ?? null,
    [notTakenMeds],
  );

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const medicationIsDue = nextMed ? earliestTime(nextMed.timesOfDay) <= currentTime : false;
  const mainTask: MainTask = !todayCheckIn ? 'checkin' : medicationIsDue ? 'medication' : 'meal';
  const name = profile?.name ?? '회원';
  const medicationDone = medications.length > 0 && notTakenMeds.length === 0;

  const mainTaskContent = {
    checkin: {
      eyebrow: '지금 할 일',
      title: '오늘 상태를 알려주세요',
      description: '몇 가지 질문에 말로 답하면 돼요',
      button: '30초 체크인 시작하기',
      onPress: () => router.push('/elderly/checkin'),
      icon: <AlarmIcon size={30} color={colors.onPrimary} />,
    },
    medication: {
      eyebrow: '약 드실 시간이에요',
      title: nextMed?.name ?? '복용할 약이 있어요',
      description: nextMed ? `${formatKoreanTime(earliestTime(nextMed.timesOfDay))} 복용 예정` : '복약 일정을 확인해주세요',
      button: '복약 확인하기',
      onPress: () => router.push('/elderly/medications'),
      icon: <PillIcon size={30} color={colors.onPrimary} />,
    },
    meal: {
      eyebrow: '지금 할 일',
      title: '드신 식사를 남겨주세요',
      description: '사진만 찍으면 영양을 분석해드려요',
      button: '식사 사진 찍기',
      onPress: () => router.push('/elderly/camera'),
      icon: <CameraIcon size={30} color={colors.onPrimary} />,
    },
  }[mainTask];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.date}>{formatDateWithWeekday(now)}</Text>
          <Text style={styles.greeting}>{name} 님,{`\n`}오늘도 잘 챙겨드릴게요</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>{mainTaskContent.icon}</View>
            <Text style={styles.heroEyebrow}>{mainTaskContent.eyebrow}</Text>
          </View>
          <Text style={styles.heroTitle}>{mainTaskContent.title}</Text>
          <Text style={styles.heroDescription}>{mainTaskContent.description}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mainTaskContent.button}
            onPress={mainTaskContent.onPress}
            style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
          >
            <Text style={styles.heroButtonText}>{mainTaskContent.button}</Text>
            <ChevronIcon size={20} color={colors.primary} />
          </Pressable>
        </View>

        {mainTask !== 'meal' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="식사 사진 찍기"
            onPress={() => router.push('/elderly/camera')}
            style={({ pressed }) => [styles.quickMealButton, pressed && styles.pressed]}
          >
            <View style={styles.quickMealIcon}>
              <CameraIcon size={23} color={colors.secondaryAccent} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.quickMealTitle}>식사 사진 찍기</Text>
              <Text style={styles.quickMealDescription} numberOfLines={1}>언제든 바로 기록할 수 있어요</Text>
            </View>
            <ChevronIcon size={18} color={colors.textFaint} />
          </Pressable>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>오늘 한 일</Text>
            <Pressable onPress={() => router.push('/elderly/history')} hitSlop={8}>
              <Text style={styles.sectionLink}>지난 기록</Text>
            </Pressable>
          </View>

          <Card style={styles.progressCard}>
            <ProgressRow
              icon={<AlarmIcon size={22} color={todayCheckIn ? colors.good : colors.textMuted} />}
              label="오늘 체크인"
              value={todayCheckIn ? `컨디션 ${CONDITION_LABEL[todayCheckIn.condition]}` : '아직 안 했어요'}
              done={Boolean(todayCheckIn)}
              onPress={() => router.push('/elderly/checkin')}
            />
            <View style={styles.divider} />
            <ProgressRow
              icon={<CameraIcon size={22} color={todayMeals.length > 0 ? colors.good : colors.textMuted} />}
              label="식사 기록"
              value={`${todayMeals.length}끼 남겼어요`}
              done={todayMeals.length > 0}
              onPress={() => router.push('/elderly/history')}
            />
            <View style={styles.divider} />
            <ProgressRow
              icon={<PillIcon size={22} color={medicationDone ? colors.good : colors.textMuted} />}
              label="약 챙기기"
              value={medications.length === 0 ? '등록된 약이 없어요' : medicationDone ? '모두 드셨어요' : `${logsToday.length}/${medications.length}회 완료`}
              done={medicationDone}
              onPress={() => router.push('/elderly/medications')}
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ProgressRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  done: boolean;
  onPress: () => void;
}

function ProgressRow({ icon, label, value, done, onPress }: ProgressRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.progressRow, pressed && styles.pressed]}>
      <View style={[styles.progressIcon, done && styles.progressIconDone]}>{icon}</View>
      <View style={styles.flex1}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressValue, done && styles.progressValueDone]}>{value}</Text>
      </View>
      {done ? (
        <View style={styles.checkCircle}>
          <CheckIcon size={14} color={colors.onPrimary} />
        </View>
      ) : (
        <ChevronIcon size={18} color={colors.textFaint} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex1: { flex: 1 },
  pressed: { opacity: 0.72 },
  header: { gap: spacing.xxs },
  date: { ...typeElder.callout, color: colors.textMuted },
  greeting: { ...typeElder.heading, color: colors.text },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadow.raised,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTranslucent,
  },
  heroEyebrow: { ...typeElder.callout, color: colors.onPrimary, fontFamily: fontFamily.bold },
  heroTitle: { ...typeElder.subheading, color: colors.onPrimary, marginTop: spacing.md },
  heroDescription: { ...typeElder.callout, color: colors.onPrimary, opacity: 0.88, marginTop: spacing.xxs },
  heroButton: {
    minHeight: minTouchTarget,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroButtonText: { ...typeElder.bodyStrong, color: colors.primary },
  quickMealButton: {
    minHeight: minTouchTarget,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickMealIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickMealTitle: { ...typeElder.bodyStrong, color: colors.text },
  quickMealDescription: { ...typeElder.caption, color: colors.textMuted, marginTop: spacing.xxs },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typeElder.heading, color: colors.text },
  sectionLink: { ...typeElder.callout, color: colors.primary, fontFamily: fontFamily.bold },
  progressCard: { paddingVertical: spacing.xs },
  progressRow: {
    minHeight: minTouchTarget + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  progressIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressIconDone: { backgroundColor: colors.goodBg },
  progressLabel: { ...typeElder.bodyStrong, color: colors.text },
  progressValue: { ...typeElder.callout, color: colors.textMuted, marginTop: spacing.xxs },
  progressValueDone: { color: colors.good },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.good,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: colors.dividerLight, marginLeft: 56 },
});
