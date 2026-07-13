import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { AlarmIcon } from '../../src/components/icons/AlarmIcon';
import { CameraIcon } from '../../src/components/icons/CameraIcon';
import { CheckIcon } from '../../src/components/icons/CheckIcon';
import { ChevronIcon } from '../../src/components/icons/ChevronIcon';
import { PillIcon } from '../../src/components/icons/PillIcon';
import { colors, fontFamily, fontSize, radius, shadow, spacing } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import {
  checkInsCollection,
  healthProfilesCollection,
  medicationLogsCollection,
  medicationsCollection,
  mealsCollection,
} from '../../src/mocks/db/collections';
import type { CheckIn, ConditionLevel, HealthProfile, Meal, Medication, MedicationLog } from '../../src/domain/types';
import { earliestTime, formatDateWithWeekday, formatKoreanTime, todayDate } from '../../src/domain/date';
import { assessMealFitness, inferMealSlot, suggestNextMeal, sumNutrients } from '../../src/mocks/nutritionAnalysis';

const CONDITION_LABEL: Record<ConditionLevel, string> = {
  good: '좋음',
  normal: '보통',
  bad: '좋지 않음',
};

const MEAL_SLOT_GREETING: Record<Meal['slot'], string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

const NEXT_SLOT_TITLE: Record<Meal['slot'], string> = {
  breakfast: '오늘 점심 추천',
  lunch: '오늘 저녁 추천',
  dinner: '내일 아침 추천',
  snack: '다음 식사 추천',
};

const CONDITION_REASON: Record<string, string> = {
  고혈압: '혈압 관리에 도움돼요',
  당뇨: '혈당 관리에 도움돼요',
};

export default function ElderlyHomeScreen() {
  const { activeUserId } = useRole();
  const userId = activeUserId ?? 'elderly-self';

  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logsToday, setLogsToday] = useState<MedicationLog[]>([]);
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [recentMeals, setRecentMeals] = useState<Meal[]>([]);
  const [recVariant, setRecVariant] = useState(0);

  const load = useCallback(async () => {
    const today = todayDate();

    const profiles = await healthProfilesCollection.query((item) => item.userId === userId);
    setProfile(profiles[profiles.length - 1] ?? null);

    const checkIns = await checkInsCollection.query((item) => item.userId === userId && item.date === today);
    setTodayCheckIn(checkIns[0] ?? null);

    const meds = await medicationsCollection.query((item) => item.userId === userId);
    setMedications(meds);

    const allLogs = await medicationLogsCollection.query((item) => item.userId === userId);
    setLogsToday(allLogs.filter((item) => item.takenAt.slice(0, 10) === today));

    const meals = await mealsCollection.query((item) => item.userId === userId);
    setTodayMeals(meals.filter((item) => item.recordedAt.slice(0, 10) === today));
    const sorted = [...meals].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    setRecentMeals(sorted.slice(0, 3));
    setRecVariant(0);
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
  const hasNextMed = medications.length > 0 && notTakenMeds.length > 0;
  const homeMedsAllDone = medications.length > 0 && notTakenMeds.length === 0;
  const nextMed = useMemo(() => {
    if (notTakenMeds.length === 0) return null;
    return [...notTakenMeds].sort((a, b) => earliestTime(a.timesOfDay).localeCompare(earliestTime(b.timesOfDay)))[0];
  }, [notTakenMeds]);

  const totalNutrients = useMemo(() => sumNutrients(todayMeals.flatMap((meal) => meal.foods)), [todayMeals]);
  const verdict = useMemo(() => assessMealFitness(totalNutrients, profile), [totalNutrients, profile]);

  const now = new Date();
  const currentSlot = inferMealSlot(now);
  const name = profile?.name ?? '회원';
  const recText = suggestNextMeal(currentSlot, profile, recentMeals, recVariant);
  const matchedCondition = profile?.conditions.find((c) => CONDITION_REASON[c]);
  const recWhy = matchedCondition
    ? CONDITION_REASON[matchedCondition]
    : (profile?.avoidedFoods.length ?? 0) > 0
      ? '피해야 할 음식은 제외했어요'
      : '균형 잡힌 식사예요';
  const recBasis = profile ? '건강 프로필 기반 추천' : '최근 식사 기록 기반 추천';

  const isSodiumCaution = verdict.fitness === 'caution';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.dateLabel}>{formatDateWithWeekday(now)}</Text>
          <Text style={styles.greeting}>
            {name} 님,{'\n'}
            {MEAL_SLOT_GREETING[currentSlot]} 잘 드셨어요?
          </Text>
        </View>

        {!todayCheckIn && (
          <Pressable style={styles.checkinCard} onPress={() => router.push('/elderly/checkin')}>
            <View style={styles.checkinIconWrap}>
              <AlarmIcon />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.checkinTitle}>아침 체크인 하기</Text>
              <Text style={styles.checkinSub}>30초면 돼요 · 말로 대답하세요</Text>
            </View>
            <ChevronIcon />
          </Pressable>
        )}
        {todayCheckIn && (
          <View style={styles.doneBanner}>
            <View style={styles.doneIconWrap}>
              <CheckIcon />
            </View>
            <Text style={styles.doneText}>오늘 체크인 완료 — 컨디션 {CONDITION_LABEL[todayCheckIn.condition]}</Text>
          </View>
        )}

        {hasNextMed && nextMed && (
          <View style={styles.nextMedCard}>
            <View style={styles.nextMedIconWrap}>
              <PillIcon />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.nextMedTime}>다음 약 · {formatKoreanTime(earliestTime(nextMed.timesOfDay))}</Text>
              <Text style={styles.nextMedName}>{nextMed.name}</Text>
            </View>
            <Pressable style={styles.nextMedButton} onPress={() => router.push('/elderly/medications')}>
              <Text style={styles.nextMedButtonLabel}>보기</Text>
            </Pressable>
          </View>
        )}
        {homeMedsAllDone && (
          <View style={styles.doneBanner}>
            <View style={styles.doneIconWrap}>
              <CheckIcon />
            </View>
            <Text style={styles.doneText}>오늘 약을 모두 드셨어요</Text>
          </View>
        )}

        <Pressable style={styles.cameraCta} onPress={() => router.push('/elderly/camera')}>
          <CameraIcon />
          <Text style={styles.cameraCtaLabel}>식사 사진 찍기</Text>
        </Pressable>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>오늘 드신 것</Text>
            <Text style={styles.summaryCount}>{todayMeals.length}건</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryBoxLabel}>칼로리</Text>
              <Text style={styles.summaryBoxValue}>{Math.round(totalNutrients.calories)}kcal</Text>
            </View>
            <View
              style={[
                styles.summaryBox,
                isSodiumCaution && { backgroundColor: colors.dangerBg },
              ]}
            >
              <Text style={styles.summaryBoxLabel}>나트륨</Text>
              <Text
                style={[
                  styles.summaryBoxValue,
                  isSodiumCaution && { color: colors.danger },
                ]}
              >
                {Math.round(totalNutrients.sodiumMg).toLocaleString()}mg
              </Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryBoxLabel}>단백질</Text>
              <Text style={styles.summaryBoxValue}>좋음</Text>
            </View>
          </View>
        </View>

        <View style={styles.recCard}>
          <Text style={styles.recTitle}>{NEXT_SLOT_TITLE[currentSlot]}</Text>
          <Text style={styles.recName}>{recText}</Text>
          <Text style={styles.recWhy}>{recWhy}</Text>
          <View style={styles.recPhotoPlaceholder}>
            <Text style={styles.recPhotoLabel}>추천 식단 사진</Text>
          </View>
          <Text style={styles.recBasis}>{recBasis}</Text>
          <Pressable style={styles.recButton} onPress={() => setRecVariant((v) => v + 1)}>
            <Text style={styles.recButtonLabel}>다른 추천 받기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  flex1: { flex: 1 },
  dateLabel: { fontSize: fontSize.body, fontFamily: fontFamily.semibold, color: colors.textMuted },
  greeting: {
    fontSize: fontSize.sectionHeader,
    fontFamily: fontFamily.extrabold,
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  checkinCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkinIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryHoverBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinTitle: { fontSize: fontSize.label, fontFamily: fontFamily.extrabold, color: colors.text },
  checkinSub: { fontSize: fontSize.small, fontFamily: fontFamily.semibold, color: colors.textMuted, marginTop: 2 },
  doneBanner: {
    borderRadius: radius.lg,
    backgroundColor: colors.goodBg,
    borderWidth: 1.5,
    borderColor: colors.goodBorder,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doneIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.good,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { fontSize: fontSize.label, fontFamily: fontFamily.extrabold, color: colors.good },
  nextMedCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.nextMedBg,
    borderWidth: 1.5,
    borderColor: colors.profileHighlightBorder,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  nextMedIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextMedTime: { fontSize: fontSize.small, fontFamily: fontFamily.bold, color: colors.secondaryAccent },
  nextMedName: { fontSize: fontSize.label, fontFamily: fontFamily.extrabold, color: colors.text, marginTop: 2 },
  nextMedButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  nextMedButtonLabel: { color: colors.onPrimary, fontSize: fontSize.body, fontFamily: fontFamily.extrabold },
  cameraCta: {
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    paddingVertical: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    ...shadow.cta,
  },
  cameraCtaLabel: { color: colors.onPrimary, fontSize: 26, fontFamily: fontFamily.extrabold },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTitle: { fontSize: fontSize.body, fontFamily: fontFamily.extrabold, color: colors.textMuted },
  summaryCount: { fontSize: fontSize.small, fontFamily: fontFamily.bold, color: colors.good },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  summaryBox: {
    flex: 1,
    backgroundColor: colors.cardSubBg,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  summaryBoxLabel: { fontSize: fontSize.small, fontFamily: fontFamily.semibold, color: colors.textMuted },
  summaryBoxValue: { fontSize: 21, fontFamily: fontFamily.extrabold, color: colors.text, marginTop: 3 },
  recCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadow.card,
  },
  recTitle: { fontSize: fontSize.body, fontFamily: fontFamily.extrabold, color: colors.textMuted },
  recName: { fontSize: 23, fontFamily: fontFamily.extrabold, color: colors.text, marginTop: 6 },
  recWhy: { fontSize: fontSize.body, fontFamily: fontFamily.bold, color: colors.good, marginTop: 4 },
  recPhotoPlaceholder: {
    marginTop: 14,
    height: 86,
    borderRadius: radius.md,
    backgroundColor: colors.photoStripe,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recPhotoLabel: { fontSize: fontSize.meta, fontFamily: fontFamily.regular, color: colors.avatarInitial },
  recBasis: { fontSize: 14, fontFamily: fontFamily.semibold, color: colors.textFaint, marginTop: 12 },
  recButton: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  recButtonLabel: { fontSize: fontSize.label, fontFamily: fontFamily.extrabold, color: colors.text },
});
