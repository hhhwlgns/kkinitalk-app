import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { AlarmIcon } from '../../src/components/icons/AlarmIcon';
import { CameraIcon } from '../../src/components/icons/CameraIcon';
import { CheckIcon } from '../../src/components/icons/CheckIcon';
import { ChevronIcon } from '../../src/components/icons/ChevronIcon';
import { PillIcon } from '../../src/components/icons/PillIcon';
import { Badge, Card, SectionHeader, StatTile } from '../../src/components/ui';
import { colors, fontFamily, radius, shadow, spacing, typeElder } from '../../src/theme/tokens';
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
import { assessMealFitness, inferMealSlot, nutrientPct, suggestNextMeal, sumNutrients } from '../../src/mocks/nutritionAnalysis';

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

  const isSodiumCaution = verdict.fitness === 'caution';
  const hasMealsToday = todayMeals.length > 0;
  const proteinTone = !hasMealsToday
    ? 'default'
    : nutrientPct(totalNutrients.proteinG, 'proteinG') >= 50
      ? 'default'
      : 'caution';
  const proteinLabel = !hasMealsToday ? '–' : proteinTone === 'default' ? '좋음' : '부족';
  const latestMeal = recentMeals[0] ?? null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingBlock}>
          <Text style={styles.dateLabel}>{formatDateWithWeekday(now)}</Text>
          <Text style={styles.greeting}>
            {name} 님,{'\n'}
            {MEAL_SLOT_GREETING[currentSlot]} 잘 드셨어요?
          </Text>
        </View>

        {!todayCheckIn ? (
          <Pressable onPress={() => router.push('/elderly/checkin')}>
            <Card style={styles.actionRow}>
              <View style={styles.actionIconBrand}>
                <AlarmIcon size={22} color={colors.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.actionTitle}>오늘 체크인하기</Text>
                <Text style={styles.actionSub}>30초면 돼요 · 말로 대답하세요</Text>
              </View>
              <ChevronIcon size={16} color={colors.textFaint} />
            </Card>
          </Pressable>
        ) : (
          <View style={styles.statusStrip}>
            <View style={styles.statusDotWrap}>
              <CheckIcon size={14} color={colors.surface} />
            </View>
            <Text style={styles.statusStripText}>
              오늘 체크인 완료 · 컨디션 {CONDITION_LABEL[todayCheckIn.condition]}
            </Text>
          </View>
        )}

        {/* Focal action: log a meal — the app's core loop. */}
        <Pressable onPress={() => router.push('/elderly/camera')} style={({ pressed }) => pressed && styles.pressed}>
          <View style={styles.cameraCta}>
            <View style={styles.cameraIconWrap}>
              <CameraIcon size={26} color={colors.onPrimary} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.cameraCtaLabel}>식사 사진 찍기</Text>
              <Text style={styles.cameraCtaSub}>찍으면 영양을 바로 분석해드려요</Text>
            </View>
            <ChevronIcon size={18} color={colors.onPrimary} />
          </View>
        </Pressable>

        {hasNextMed && nextMed ? (
          <Card style={styles.actionRow}>
            <View style={styles.actionIconPill}>
              <PillIcon size={22} color={colors.onPrimary} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.actionEyebrow}>다음 약 · {formatKoreanTime(earliestTime(nextMed.timesOfDay))}</Text>
              <Text style={styles.actionTitle}>{nextMed.name}</Text>
            </View>
            <Pressable style={styles.smallButton} onPress={() => router.push('/elderly/medications')}>
              <Text style={styles.smallButtonLabel}>보기</Text>
            </Pressable>
          </Card>
        ) : homeMedsAllDone ? (
          <View style={styles.statusStrip}>
            <View style={styles.statusDotWrap}>
              <CheckIcon size={14} color={colors.surface} />
            </View>
            <Text style={styles.statusStripText}>오늘 약을 모두 드셨어요</Text>
          </View>
        ) : null}

        <View>
          <SectionHeader
            title="오늘 드신 것"
            action={
              hasMealsToday ? (
                <Pressable onPress={() => router.push('/elderly/history')} hitSlop={8}>
                  <Text style={styles.linkLabel}>기록 보기</Text>
                </Pressable>
              ) : undefined
            }
          />
          <Card>
            <View style={styles.summaryTopRow}>
              <Text style={styles.summaryCount}>{todayMeals.length}끼 기록</Text>
              {hasMealsToday ? (
                <Badge label={isSodiumCaution ? '나트륨 주의' : '균형 좋음'} tone={isSodiumCaution ? 'caution' : 'good'} />
              ) : null}
            </View>
            <View style={styles.statRow}>
              <StatTile label="칼로리" value={hasMealsToday ? `${Math.round(totalNutrients.calories)}kcal` : '–'} />
              <StatTile
                label="나트륨"
                value={hasMealsToday ? `${Math.round(totalNutrients.sodiumMg).toLocaleString()}mg` : '–'}
                tone={isSodiumCaution ? 'danger' : 'default'}
              />
              <StatTile label="단백질" value={proteinLabel} tone={proteinTone} />
            </View>
            {latestMeal ? (
              <Pressable
                style={styles.detailLink}
                onPress={() => router.push({ pathname: '/elderly/analysis', params: { mealId: latestMeal.id } })}
              >
                <Text style={styles.detailLinkLabel}>가장 최근 식사 자세히 보기</Text>
                <ChevronIcon size={14} color={colors.secondaryAccent} />
              </Pressable>
            ) : (
              <Text style={styles.summaryHint}>사진을 찍으면 오늘 영양이 여기에 쌓여요.</Text>
            )}
          </Card>
        </View>

        <View>
          <SectionHeader title={NEXT_SLOT_TITLE[currentSlot]} />
          <Card>
            <Text style={styles.recName}>{recText}</Text>
            <View style={styles.recWhyRow}>
              <View style={styles.recDot} />
              <Text style={styles.recWhy}>{recWhy}</Text>
            </View>
            <Pressable style={styles.recButton} onPress={() => setRecVariant((v) => v + 1)}>
              <Text style={styles.recButtonLabel}>다른 추천 받기</Text>
            </Pressable>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  flex1: { flex: 1 },
  pressed: { opacity: 0.85 },

  greetingBlock: { marginBottom: spacing.xxs },
  dateLabel: { ...typeElder.callout, color: colors.textMuted },
  greeting: { ...typeElder.title, color: colors.text, marginTop: spacing.xxs },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionIconBrand: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconPill: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEyebrow: { ...typeElder.caption, color: colors.secondaryAccent, fontFamily: fontFamily.bold },
  actionTitle: { ...typeElder.subheading, color: colors.text },
  actionSub: { ...typeElder.callout, color: colors.textMuted, marginTop: 2 },

  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.goodBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goodBorder,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statusDotWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.good,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusStripText: { ...typeElder.callout, color: colors.good, fontFamily: fontFamily.bold, flex: 1 },

  cameraCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadow.cta,
  },
  cameraIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCtaLabel: { ...typeElder.heading, color: colors.onPrimary },
  cameraCtaSub: { ...typeElder.callout, color: colors.onPrimary, opacity: 0.85, marginTop: 2 },

  smallButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  smallButtonLabel: { ...typeElder.callout, color: colors.onPrimary, fontFamily: fontFamily.bold },

  linkLabel: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.bold, color: colors.secondaryAccent },

  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryCount: { ...typeElder.bodyStrong, color: colors.text },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  summaryHint: { ...typeElder.callout, color: colors.textFaint, marginTop: spacing.sm },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.dividerLight,
  },
  detailLinkLabel: { ...typeElder.callout, color: colors.secondaryAccent, fontFamily: fontFamily.bold },

  recName: { ...typeElder.subheading, color: colors.text },
  recWhyRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.xs },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.good },
  recWhy: { ...typeElder.callout, color: colors.good, fontFamily: fontFamily.bold },
  recButton: {
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  recButtonLabel: { ...typeElder.callout, color: colors.text, fontFamily: fontFamily.bold },
});
