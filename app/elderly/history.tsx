import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateNavigator } from '../../src/components/history/DateNavigator';
import { MealPhotoGrid } from '../../src/components/nutrition/MealPhotoGrid';
import { NutritionOverview } from '../../src/components/nutrition/NutritionOverview';
import { Card } from '../../src/components/ui';
import { buildNextMealAdvice, DEFAULT_NUTRITION_GOAL, summarizeNutritionForDate } from '../../src/domain/dailyNutrition';
import { isoToLocalDate, todayDate } from '../../src/domain/date';
import type { Meal, MealOrder, MealProduct, NutritionGoal } from '../../src/domain/types';
import { mealOrdersCollection, mealProductsCollection, mealsCollection, nutritionGoalsCollection } from '../../src/mocks/db/collections';
import { useRole } from '../../src/state/RoleContext';
import { colors, minTouchTarget, radius, spacing, typeElder } from '../../src/theme/tokens';

type TabKey = 'goal' | 'advice' | 'meals';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'goal', label: '목표 영양소' },
  { key: 'advice', label: '분석·추천' },
  { key: 'meals', label: '끼니 기록' },
];

export default function HistoryScreen() {
  const { activeUserId } = useRole();
  const userId = activeUserId ?? 'elderly-self';
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>('goal');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [goal, setGoal] = useState<NutritionGoal | null>(null);
  const [orders, setOrders] = useState<MealOrder[]>([]);
  const [products, setProducts] = useState<MealProduct[]>([]);

  const load = useCallback(async () => {
    const [loadedMeals, goals, loadedOrders, loadedProducts] = await Promise.all([
      mealsCollection.query((item) => item.userId === userId),
      nutritionGoalsCollection.query((item) => item.userId === userId),
      mealOrdersCollection.query((item) => item.elderlyUserId === userId),
      mealProductsCollection.getAll(),
    ]);
    setMeals(loadedMeals);
    setGoal(goals[0] ?? null);
    setOrders(loadedOrders);
    setProducts(loadedProducts);
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const resolvedGoal = useMemo<NutritionGoal>(() => goal ?? { id: userId, userId, ...DEFAULT_NUTRITION_GOAL, updatedAt: new Date().toISOString() }, [goal, userId]);
  const dayMeals = useMemo(() => meals.filter((meal) => isoToLocalDate(meal.recordedAt) === selectedDate), [meals, selectedDate]);
  const summary = useMemo(() => summarizeNutritionForDate(meals, selectedDate, resolvedGoal), [meals, resolvedGoal, selectedDate]);
  const advice = useMemo(() => buildNextMealAdvice(summary), [summary]);
  const giftOrder = orders.find((order) => order.deliveryDate === selectedDate);
  const giftProduct = giftOrder ? products.find((product) => product.id === giftOrder.productId) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="뒤로 가기"><Ionicons name="arrow-back" size={28} color={colors.text} /></Pressable>
          <Text style={styles.title}>식사 기록</Text>
          <View style={styles.backButton} />
        </View>
        <DateNavigator date={selectedDate} onChange={setSelectedDate} calendarOpen={calendarOpen} onCalendarOpenChange={setCalendarOpen} elder />

        {giftOrder && giftProduct && (
          <Card style={styles.giftCard}>
            <Ionicons name="gift" size={28} color={colors.primary} />
            <View style={styles.flex1}><Text style={styles.giftTitle}>{giftProduct.name}</Text><Text style={styles.giftDescription}>보호자가 보내준 식사 · {giftOrder.status === 'delivered' ? '배송 완료' : '도착 예정'}</Text></View>
          </Card>
        )}

        <View style={styles.tabs}>
          {TABS.map((item) => <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, tab === item.key && styles.tabActive]}><Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text></Pressable>)}
        </View>

        {tab === 'goal' && <NutritionOverview summary={summary} goal={resolvedGoal} elder />}

        {tab === 'advice' && (
          <Card style={styles.adviceCard}>
            <View style={styles.adviceIcon}><Ionicons name="sparkles" size={28} color={colors.onPrimary} /></View>
            <Text style={styles.adviceEyebrow}>{advice.title}</Text>
            <Text style={styles.adviceMenu}>다음 메뉴로{`\n`}{advice.menu}은 어떠세요?</Text>
            <Text style={styles.adviceReason}>{advice.reason}</Text>
            <Pressable onPress={() => router.push('/elderly/voice')} style={styles.aiButton}><Ionicons name="mic" size={23} color={colors.primary} /><Text style={styles.aiButtonText}>AI에게 더 물어보기</Text></Pressable>
          </Card>
        )}

        {tab === 'meals' && (
          <View style={styles.mealSection}>
            <View><Text style={styles.sectionTitle}>아침·점심·저녁</Text><Text style={styles.sectionDescription}>{dayMeals.length === 0 ? '아직 기록한 식사가 없어요.' : `${dayMeals.length}끼 기록했어요.`}</Text></View>
            <MealPhotoGrid
              meals={dayMeals}
              elder
              onMealPress={(meal) => router.push({ pathname: '/elderly/analysis', params: { mealId: meal.id } })}
              onAddPress={(slot) => router.push({ pathname: '/elderly/camera', params: { slot } })}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex1: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  title: { ...typeElder.heading, color: colors.text },
  giftCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.nextMedBg, borderColor: colors.profileHighlightBorder },
  giftTitle: { ...typeElder.bodyStrong, color: colors.text },
  giftDescription: { ...typeElder.caption, color: colors.textMuted },
  tabs: { flexDirection: 'row', gap: spacing.xs, padding: spacing.xxs, borderRadius: radius.lg, backgroundColor: colors.surfaceSunken },
  tab: { flex: 1, minHeight: minTouchTarget, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typeElder.callout, color: colors.textMuted, textAlign: 'center' },
  tabTextActive: { color: colors.onPrimary },
  adviceCard: { backgroundColor: colors.primary, borderColor: colors.primary },
  adviceIcon: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.primaryTranslucent, alignItems: 'center', justifyContent: 'center' },
  adviceEyebrow: { ...typeElder.body, color: colors.onPrimary, opacity: 0.9, marginTop: spacing.md },
  adviceMenu: { ...typeElder.heading, color: colors.onPrimary, marginTop: spacing.xs },
  adviceReason: { ...typeElder.callout, color: colors.onPrimary, opacity: 0.88, marginTop: spacing.sm },
  aiButton: { minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.md, marginTop: spacing.md },
  aiButtonText: { ...typeElder.bodyStrong, color: colors.primary },
  mealSection: { gap: spacing.md },
  sectionTitle: { ...typeElder.heading, color: colors.text },
  sectionDescription: { ...typeElder.callout, color: colors.textMuted, marginTop: 2 },
});
