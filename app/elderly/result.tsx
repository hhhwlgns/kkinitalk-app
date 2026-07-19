import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Card, StatTile, StatusPill } from '../../src/components/ui';
import { colors, fontFamily, radius, shadow, spacing, typeElder } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import { healthProfilesCollection, mealsCollection } from '../../src/mocks/db/collections';
import type { FoodItem, HealthProfile, Meal } from '../../src/domain/types';
import { FOOD_BANK, MEAL_CALORIE_TARGET, assessMealFitness, sumNutrients } from '../../src/mocks/nutritionAnalysis';
import { createId } from '../../src/domain/id';
import { calorieStatus, mealStatus, proteinStatus, sodiumStatus } from '../../src/domain/nutrientStatus';
import { formatIsoTime } from '../../src/domain/date';

const SLOT_LABEL: Record<Meal['slot'], string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

export default function ResultScreen() {
  const { activeUserId } = useRole();
  const userId = activeUserId ?? 'elderly-self';
  const { mealId } = useLocalSearchParams<{ mealId?: string }>();

  const [meal, setMeal] = useState<Meal | null>(null);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [isEditFoods, setIsEditFoods] = useState(false);
  const [editedFoods, setEditedFoods] = useState<FoodItem[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const meals = await mealsCollection.query((item) => item.userId === userId);
    const target = meals.find((item) => item.id === mealId) ?? null;
    setMeal(target);
    setEditedFoods(target?.foods.map((food) => ({ ...food, portion: food.portion ?? 'regular' })) ?? []);
    setIsEditFoods(false);

    const profiles = await healthProfilesCollection.query((item) => item.userId === userId);
    setProfile(profiles[profiles.length - 1] ?? null);
  }, [userId, mealId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const activeFoods = editedFoods;

  const totals = useMemo(() => sumNutrients(activeFoods), [activeFoods]);
  const verdict = useMemo(() => assessMealFitness(totals, profile), [totals, profile]);

  if (!meal) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.missingWrap}>
          <Text style={styles.missingTitle}>분석 결과를 찾을 수 없어요</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/elderly/home')}>
            <Text style={styles.primaryButtonLabel}>홈으로</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const overall = mealStatus(totals);
  const overallWord = overall === 'good' ? '균형 좋음' : overall === 'caution' ? '주의' : '위험';

  function toggleFood(foodId: string) {
    setEditedFoods((current) => current.filter((food) => food.id !== foodId));
  }

  function changePortion(foodId: string, portion: NonNullable<FoodItem['portion']>) {
    const multiplier = { small: 0.65, regular: 1, large: 1.35 }[portion];
    setEditedFoods((current) => current.map((food) => {
      if (food.id !== foodId) return food;
      const previousMultiplier = { small: 0.65, regular: 1, large: 1.35 }[food.portion ?? 'regular'];
      const scale = multiplier / previousMultiplier;
      return {
        ...food,
        portion,
        nutrients: {
          calories: food.nutrients.calories * scale,
          carbsG: food.nutrients.carbsG * scale,
          proteinG: food.nutrients.proteinG * scale,
          fatG: food.nutrients.fatG * scale,
          sodiumMg: food.nutrients.sodiumMg * scale,
        },
      };
    }));
  }

  function addFood(food: FoodItem) {
    setEditedFoods((current) => [...current, { ...food, id: createId('food'), portion: 'regular' }]);
  }

  async function saveRecord() {
    if (!meal) return;
    setSaving(true);
    const updated: Meal = {
      ...meal,
      foods: activeFoods,
      totalNutrients: totals,
      fitness: verdict.fitness,
      fitnessNote: verdict.fitnessNote,
      analysisEdited: JSON.stringify(activeFoods) !== JSON.stringify(meal.foods),
    };
    await mealsCollection.upsert(updated);
    setSaving(false);
    router.replace('/elderly/home');
  }

  // The camera already saved this meal — retaking must discard it or a ghost record remains.
  async function retake() {
    if (meal) {
      await mealsCollection.remove(meal.id);
    }
    router.replace({ pathname: '/elderly/camera', params: { slot: meal?.slot ?? 'lunch' } });
  }

  const displayName = activeFoods.length > 0 ? `${activeFoods[0].name} 등 ${activeFoods.length}가지` : '식사';
  const sodiumTile = sodiumStatus(totals.sodiumMg);
  const proteinStat = proteinStatus(totals.proteinG);
  const proteinTile = proteinStat;
  const proteinLabel = proteinStat === 'good' ? '좋음' : proteinStat === 'caution' ? '보통' : '부족';
  const calorieTile = calorieStatus(totals.calories, MEAL_CALORIE_TARGET);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>이렇게 드셨네요</Text>

        <Card padded={false} style={styles.photoCard}>
          {meal.photoUri ? (
            <Image source={{ uri: meal.photoUri }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoEmpty]}>
              <Text style={styles.photoEmptyText}>사진 없음</Text>
            </View>
          )}
          <View style={styles.photoBody}>
            <Text style={styles.eyebrow}>
              {SLOT_LABEL[meal.slot]} · {formatIsoTime(meal.recordedAt)}
            </Text>
            <Text style={styles.mealName}>{displayName}</Text>
          </View>
        </Card>

        <View>
          <View style={styles.foodsHeader}>
            <Text style={styles.foodsTitle}>인식된 음식</Text>
            <Pressable onPress={() => setIsEditFoods((v) => !v)} hitSlop={8}>
              <Text style={styles.linkLabel}>{isEditFoods ? '완료' : '고치기'}</Text>
            </Pressable>
          </View>
          <View style={styles.foodEditList}>
            {activeFoods.map((food) => (
              <View key={food.id} style={styles.foodEditRow}>
                <View style={styles.foodNameWrap}><Text style={styles.foodChipLabel}>{food.name}</Text><Text style={styles.foodKcal}>{Math.round(food.nutrients.calories)}kcal</Text></View>
                {isEditFoods && <View style={styles.portionRow}>
                  {(['small', 'regular', 'large'] as const).map((portion) => <Pressable key={portion} onPress={() => changePortion(food.id, portion)} style={[styles.portionButton, (food.portion ?? 'regular') === portion && styles.portionButtonActive]}><Text style={[styles.portionText, (food.portion ?? 'regular') === portion && styles.portionTextActive]}>{portion === 'small' ? '조금' : portion === 'regular' ? '보통' : '많이'}</Text></Pressable>)}
                  <Pressable onPress={() => toggleFood(food.id)} style={styles.removeButton}><Text style={styles.removeText}>삭제</Text></Pressable>
                </View>}
              </View>
            ))}
          </View>
          {isEditFoods && <View style={styles.addFoodArea}><Text style={styles.editHint}>빠진 음식이 있나요?</Text><View style={styles.chipsRow}>{FOOD_BANK.filter((candidate) => !activeFoods.some((food) => food.name === candidate.name)).slice(0, 5).map((food) => <Pressable key={food.id} onPress={() => addFood(food)} style={styles.addFoodChip}><Text style={styles.addFoodText}>+ {food.name}</Text></Pressable>)}</View></View>}
        </View>

        <Card
          style={[styles.verdictCard, { backgroundColor: overall === 'good' ? colors.goodBg : overall === 'caution' ? colors.cautionBg : colors.dangerBg, borderColor: overall === 'good' ? colors.goodBorder : overall === 'caution' ? colors.cautionBorder : colors.dangerBorder }]}
        >
          <StatusPill status={overall} label={overallWord} />
          <Text style={styles.verdictText}>{verdict.fitnessNote}</Text>
        </Card>

        <View style={styles.statRow}>
          <StatTile label="칼로리" value={`${Math.round(totals.calories)}kcal`} tone={calorieTile} />
          <StatTile label="나트륨" value={`${Math.round(totals.sodiumMg).toLocaleString()}mg`} tone={sodiumTile} />
          <StatTile label="단백질" value={proteinLabel} tone={proteinTile} />
        </View>

        <Pressable
          style={styles.detailButton}
          onPress={() => router.push({ pathname: '/elderly/analysis', params: { mealId: meal.id } })}
        >
          <Text style={styles.detailButtonLabel}>자세한 분석 보기</Text>
        </Pressable>

        <Pressable style={[styles.primaryButton, activeFoods.length === 0 && styles.primaryButtonDisabled]} onPress={saveRecord} disabled={saving || activeFoods.length === 0}>
          <Text style={styles.primaryButtonLabel}>{activeFoods.length === 0 ? '음식을 하나 이상 추가해 주세요' : '수정한 내용으로 기록 완료'}</Text>
        </Pressable>

        <Pressable style={styles.retakeButton} onPress={retake}>
          <Text style={styles.retakeLabel}>다시 찍기</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          이 안내는 참고용이에요. 진단·처방을 대체하지 않으니{'\n'}궁금한 점은 의사·약사와 상담하세요.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  screenTitle: { ...typeElder.title, color: colors.text },

  photoCard: { overflow: 'hidden' },
  photo: { width: '100%', height: 180, backgroundColor: colors.surfaceSunken },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  photoEmptyText: { ...typeElder.callout, color: colors.textFaint },
  photoBody: { padding: spacing.md, gap: 4 },
  eyebrow: { ...typeElder.caption, color: colors.textMuted, fontFamily: fontFamily.bold },
  mealName: { ...typeElder.heading, color: colors.text },

  foodsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  foodsTitle: { ...typeElder.subheading, color: colors.text },
  linkLabel: { fontSize: 16, fontFamily: fontFamily.bold, color: colors.secondaryAccent },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  foodEditList: { gap: spacing.xs },
  foodEditRow: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.sm, gap: spacing.xs },
  foodNameWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  foodKcal: { ...typeElder.caption, color: colors.textMuted },
  portionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  portionButton: { minHeight: 40, flex: 1, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  portionButtonActive: { backgroundColor: colors.primary }, portionText: { ...typeElder.caption, color: colors.textMuted }, portionTextActive: { color: colors.onPrimary },
  removeButton: { minHeight: 40, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' }, removeText: { ...typeElder.caption, color: colors.danger },
  foodChip: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  foodChipEditing: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg },
  foodChipLabel: { ...typeElder.callout, color: colors.text, fontFamily: fontFamily.bold },
  foodChipLabelEditing: { color: colors.danger },
  editHint: { ...typeElder.caption, color: colors.textMuted, marginTop: spacing.xs },
  addFoodArea: { gap: spacing.xs }, addFoodChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }, addFoodText: { ...typeElder.caption, color: colors.primary },

  verdictCard: { gap: spacing.sm },
  verdictText: { ...typeElder.bodyStrong, color: colors.text },

  statRow: { flexDirection: 'row', gap: spacing.sm },

  detailButton: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    alignItems: 'center',
  },
  detailButtonLabel: { ...typeElder.subheading, color: colors.secondaryAccent },
  primaryButton: {
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    alignItems: 'center',
    ...shadow.cta,
  },
  primaryButtonLabel: { ...typeElder.heading, color: colors.onPrimary },
  primaryButtonDisabled: { backgroundColor: colors.textFaint, shadowOpacity: 0 },
  retakeButton: { paddingVertical: spacing.sm, alignItems: 'center' },
  retakeLabel: { ...typeElder.callout, color: colors.textMuted, fontFamily: fontFamily.bold },

  disclaimer: { ...typeElder.caption, color: colors.textFaint, textAlign: 'center', marginTop: spacing.xs },

  missingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  missingTitle: { ...typeElder.subheading, color: colors.textMuted },
});
