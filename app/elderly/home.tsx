import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MealPhotoGrid } from '../../src/components/nutrition/MealPhotoGrid';
import { NutritionBalanceHero } from '../../src/components/nutrition/NutritionBalanceHero';
import { NutritionBalanceTrend } from '../../src/components/nutrition/NutritionBalanceTrend';
import { Card } from '../../src/components/ui';
import { buildNextMealAdvice, buildNutritionBalanceInsight, buildNutritionTrend, DEFAULT_NUTRITION_GOAL, summarizeNutritionForDate } from '../../src/domain/dailyNutrition';
import { formatDateWithWeekday, isoToLocalDate, todayDate } from '../../src/domain/date';
import type { CheckIn, HealthProfile, Meal, MealOrder, MealProduct, Medication, MedicationLog, NutritionGoal } from '../../src/domain/types';
import {
  checkInsCollection,
  healthProfilesCollection,
  mealOrdersCollection,
  mealProductsCollection,
  mealsCollection,
  medicationLogsCollection,
  medicationsCollection,
  nutritionGoalsCollection,
} from '../../src/mocks/db/collections';
import { useRole } from '../../src/state/RoleContext';
import { colors, minTouchTarget, radius, spacing, typeElder } from '../../src/theme/tokens';

export default function ElderlyHomeScreen() {
  const { activeUserId } = useRole();
  const userId = activeUserId ?? 'elderly-self';
  const today = todayDate();

  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [goal, setGoal] = useState<NutritionGoal | null>(null);
  const [giftOrder, setGiftOrder] = useState<MealOrder | null>(null);
  const [giftProduct, setGiftProduct] = useState<MealProduct | null>(null);

  const load = useCallback(async () => {
    const [profiles, checkIns, allMeals, meds, allLogs, goals, orders, products] = await Promise.all([
      healthProfilesCollection.query((item) => item.userId === userId),
      checkInsCollection.query((item) => item.userId === userId && item.date === today),
      mealsCollection.query((item) => item.userId === userId),
      medicationsCollection.query((item) => item.userId === userId && item.active !== false),
      medicationLogsCollection.query((item) => item.userId === userId),
      nutritionGoalsCollection.query((item) => item.userId === userId),
      mealOrdersCollection.query((item) => item.elderlyUserId === userId && item.status !== 'delivered'),
      mealProductsCollection.getAll(),
    ]);

    const order = [...orders].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))[0] ?? null;
    setProfile(profiles[profiles.length - 1] ?? null);
    setCheckIn(checkIns[0] ?? null);
    setMeals(allMeals);
    setMedications(meds);
    setLogs(allLogs.filter((item) => isoToLocalDate(item.takenAt) === today));
    setGoal(goals[0] ?? null);
    setGiftOrder(order);
    setGiftProduct(order ? products.find((item) => item.id === order.productId) ?? null : null);
  }, [today, userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resolvedGoal = useMemo<NutritionGoal>(() => goal ?? {
    id: userId,
    userId,
    ...DEFAULT_NUTRITION_GOAL,
    updatedAt: new Date().toISOString(),
  }, [goal, userId]);
  const summary = useMemo(() => summarizeNutritionForDate(meals, today, resolvedGoal), [meals, resolvedGoal, today]);
  const balanceInsight = useMemo(() => buildNutritionBalanceInsight(summary), [summary]);
  const trend = useMemo(() => buildNutritionTrend(meals, today, 7, resolvedGoal), [meals, resolvedGoal, today]);
  const advice = useMemo(() => buildNextMealAdvice(summary), [summary]);
  const todayMeals = useMemo(() => meals.filter((meal) => isoToLocalDate(meal.recordedAt) === today), [meals, today]);
  const takenMedicationIds = useMemo(() => new Set(logs.map((log) => log.medicationId)), [logs]);
  const takenCount = medications.filter((medication) => takenMedicationIds.has(medication.id)).length;

  function openCamera(slot: 'breakfast' | 'lunch' | 'dinner') {
    router.push({ pathname: '/elderly/camera', params: { slot } });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.flex1}>
            <Text style={styles.date}>{formatDateWithWeekday(new Date())}</Text>
            <Text style={styles.greeting}>{profile?.name ?? '어르신'} 님,{`\n`}오늘도 잘 챙겨드릴게요</Text>
          </View>
          <Pressable
            onPress={() => router.push('/elderly/profile')}
            accessibilityRole="button"
            accessibilityLabel="내 정보 보기"
            style={styles.profileButton}
          >
            <Ionicons name="person" size={28} color={colors.primary} />
          </Pressable>
        </View>

        {giftOrder && giftProduct && (
          <Card style={styles.giftCard}>
            <View style={styles.giftIcon}><Ionicons name="gift" size={27} color={colors.primary} /></View>
            <View style={styles.flex1}>
              <Text style={styles.giftEyebrow}>보호자가 식사를 보냈어요</Text>
              <Text style={styles.giftTitle}>{giftProduct.name}</Text>
              <Text style={styles.giftDescription}>{giftOrder.deliveryDate.slice(5).replace('-', '월 ')}일 도착 예정 · {giftOrder.giftMessage}</Text>
            </View>
          </Card>
        )}

        {!checkIn && (
          <Pressable onPress={() => router.push('/elderly/checkin')} style={({ pressed }) => [styles.checkInBanner, pressed && styles.pressed]}>
            <Ionicons name="chatbubble-ellipses" size={25} color={colors.secondaryAccent} />
            <View style={styles.flex1}>
              <Text style={styles.checkInTitle}>오늘 몸 상태는 어떠세요?</Text>
              <Text style={styles.checkInDescription}>30초만 이야기해 주세요</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.secondaryAccent} />
          </Pressable>
        )}

        <NutritionBalanceHero summary={summary} insight={balanceInsight} goal={resolvedGoal} elder />
        <NutritionBalanceTrend summaries={trend} elder />

        <Pressable onPress={() => router.push('/elderly/voice')} style={({ pressed }) => [pressed && styles.pressed]}>
        <Card style={styles.adviceCard}>
          <View style={styles.adviceTop}>
            <View style={styles.adviceIcon}><Ionicons name="restaurant" size={25} color={colors.onPrimary} /></View>
            <Text style={styles.adviceEyebrow}>다음 메뉴는 어떠세요?</Text>
          </View>
          <Text style={styles.adviceTitle}>{advice.title}</Text>
          <Text style={styles.adviceMenu}>{advice.menu}</Text>
          <Text style={styles.adviceReason}>{advice.reason}</Text>
          <View style={styles.adviceAction}><Text style={styles.adviceActionText}>AI와 메뉴 이야기하기</Text><Ionicons name="arrow-forward" size={22} color={colors.onPrimary} /></View>
        </Card>
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>오늘 복약</Text>
            <Pressable onPress={() => router.push('/elderly/medications')} hitSlop={8}>
              <Text style={styles.sectionLink}>자세히</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => router.push('/elderly/medications')} style={({ pressed }) => [pressed && styles.pressed]}>
            <Card style={styles.medicationCard}>
              <View style={styles.medicationIcon}><Ionicons name="medkit" size={28} color={colors.primary} /></View>
              <View style={styles.flex1}>
                <Text style={styles.medicationTitle}>
                  {medications.length === 0 ? '등록된 약이 없어요' : takenCount === medications.length ? '오늘 약을 모두 드셨어요' : `${medications.length}개 중 ${takenCount}개 드셨어요`}
                </Text>
                <Text style={styles.medicationDescription}>
                  {medications.length === 0 ? '복약 화면에서 약을 등록할 수 있어요.' : medications.filter((item) => !takenMedicationIds.has(item.id)).map((item) => item.name).slice(0, 2).join(', ') || '참 잘하셨어요!'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textFaint} />
            </Card>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View><Text style={styles.sectionTitle}>오늘 식사 기록</Text><Text style={styles.sectionHint}>아침·점심·저녁을 눌러 사진을 남겨주세요</Text></View>
            <Pressable onPress={() => router.push('/elderly/history')} hitSlop={8}>
              <Text style={styles.sectionLink}>지난 기록</Text>
            </Pressable>
          </View>
          <MealPhotoGrid
            meals={todayMeals}
            elder
            onAddPress={openCamera}
            onMealPress={(meal) => router.push({ pathname: '/elderly/analysis', params: { mealId: meal.id } })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl + spacing.lg, gap: spacing.lg },
  flex1: { flex: 1 },
  pressed: { opacity: 0.72 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  date: { ...typeElder.callout, color: colors.textMuted },
  greeting: { ...typeElder.heading, color: colors.text, marginTop: spacing.xxs },
  profileButton: { width: minTouchTarget, height: minTouchTarget, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  giftCard: { flexDirection: 'row', gap: spacing.sm, borderColor: colors.profileHighlightBorder, backgroundColor: colors.nextMedBg },
  giftIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  giftEyebrow: { ...typeElder.callout, color: colors.secondaryAccent },
  giftTitle: { ...typeElder.subheading, color: colors.text, marginTop: 2 },
  giftDescription: { ...typeElder.caption, color: colors.textMuted, marginTop: spacing.xxs },
  checkInBanner: { minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.profileHighlightBorder },
  checkInTitle: { ...typeElder.bodyStrong, color: colors.text },
  checkInDescription: { ...typeElder.caption, color: colors.textMuted },
  adviceCard: { backgroundColor: colors.primary, borderColor: colors.primary },
  adviceTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  adviceIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primaryTranslucent, alignItems: 'center', justifyContent: 'center' },
  adviceEyebrow: { ...typeElder.callout, color: colors.onPrimary },
  adviceTitle: { ...typeElder.body, color: colors.onPrimary, opacity: 0.9, marginTop: spacing.md },
  adviceMenu: { ...typeElder.heading, color: colors.onPrimary, marginTop: spacing.xxs },
  adviceReason: { ...typeElder.callout, color: colors.onPrimary, opacity: 0.86, marginTop: spacing.xs },
  adviceAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.primaryTranslucent },
  adviceActionText: { ...typeElder.callout, color: colors.onPrimary },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typeElder.heading, color: colors.text },
  sectionLink: { ...typeElder.callout, color: colors.primary },
  sectionHint: { ...typeElder.caption, color: colors.textMuted, marginTop: spacing.xxs },
  medicationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  medicationIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  medicationTitle: { ...typeElder.bodyStrong, color: colors.text },
  medicationDescription: { ...typeElder.caption, color: colors.textMuted, marginTop: spacing.xxs },
});
