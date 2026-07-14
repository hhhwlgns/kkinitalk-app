import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Card, StatTile, StatusPill } from '../../src/components/ui';
import { colors, fontFamily, radius, shadow, spacing, typeElder } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import { healthProfilesCollection, mealsCollection } from '../../src/mocks/db/collections';
import type { FoodItem, HealthProfile, Meal } from '../../src/domain/types';
import { assessMealFitness, sumNutrients } from '../../src/mocks/nutritionAnalysis';
import { mealStatus, proteinStatus, sodiumStatus } from '../../src/domain/nutrientStatus';

const SLOT_LABEL: Record<Meal['slot'], string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const hours24 = date.getHours();
  const period = hours24 < 12 ? '오전' : '오후';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = date.getMinutes();
  return minutes === 0 ? `${period} ${hours12}시` : `${period} ${hours12}시 ${minutes}분`;
}

export default function ResultScreen() {
  const { activeUserId } = useRole();
  const userId = activeUserId ?? 'elderly-self';
  const { mealId } = useLocalSearchParams<{ mealId?: string }>();

  const [meal, setMeal] = useState<Meal | null>(null);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [isEditFoods, setIsEditFoods] = useState(false);
  const [removedFoodIds, setRemovedFoodIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const meals = await mealsCollection.query((item) => item.userId === userId);
    const target = meals.find((item) => item.id === mealId) ?? null;
    setMeal(target);
    setRemovedFoodIds(new Set());
    setIsEditFoods(false);

    const profiles = await healthProfilesCollection.query((item) => item.userId === userId);
    setProfile(profiles[profiles.length - 1] ?? null);
  }, [userId, mealId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const activeFoods: FoodItem[] = useMemo(
    () => meal?.foods.filter((food) => !removedFoodIds.has(food.id)) ?? [],
    [meal, removedFoodIds],
  );

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
    setRemovedFoodIds((prev) => {
      const next = new Set(prev);
      if (next.has(foodId)) next.delete(foodId);
      else next.add(foodId);
      return next;
    });
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
    };
    await mealsCollection.upsert(updated);
    setSaving(false);
    router.replace('/elderly/home');
  }

  const displayName = activeFoods.length > 0 ? `${activeFoods[0].name} 등 ${activeFoods.length}가지` : '식사';
  const sodiumTile = sodiumStatus(totals.sodiumMg) === 'good' ? 'default' : sodiumStatus(totals.sodiumMg) === 'caution' ? 'caution' : 'danger';
  const proteinStat = proteinStatus(totals.proteinG);
  const proteinTile = proteinStat === 'good' ? 'default' : proteinStat === 'caution' ? 'caution' : 'danger';
  const proteinLabel = proteinStat === 'good' ? '좋음' : proteinStat === 'caution' ? '보통' : '부족';

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
              {SLOT_LABEL[meal.slot]} · {formatTime(meal.recordedAt)}
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
          <View style={styles.chipsRow}>
            {activeFoods.map((food) => (
              <Pressable
                key={food.id}
                onPress={() => isEditFoods && toggleFood(food.id)}
                style={[styles.foodChip, isEditFoods && styles.foodChipEditing]}
              >
                <Text style={[styles.foodChipLabel, isEditFoods && styles.foodChipLabelEditing]}>
                  {food.name}
                  {isEditFoods ? '  ✕' : ''}
                </Text>
              </Pressable>
            ))}
          </View>
          {isEditFoods && <Text style={styles.editHint}>잘못 인식된 음식을 누르면 빠져요</Text>}
        </View>

        <Card
          style={[styles.verdictCard, { backgroundColor: overall === 'good' ? colors.goodBg : overall === 'caution' ? colors.cautionBg : colors.dangerBg, borderColor: overall === 'good' ? colors.goodBorder : overall === 'caution' ? colors.cautionBorder : colors.dangerBorder }]}
        >
          <StatusPill status={overall} label={overallWord} />
          <Text style={styles.verdictText}>{verdict.fitnessNote}</Text>
        </Card>

        <View style={styles.statRow}>
          <StatTile label="칼로리" value={`${Math.round(totals.calories)}kcal`} />
          <StatTile label="나트륨" value={`${Math.round(totals.sodiumMg).toLocaleString()}mg`} tone={sodiumTile} />
          <StatTile label="단백질" value={proteinLabel} tone={proteinTile} />
        </View>

        <Pressable
          style={styles.detailButton}
          onPress={() => router.push({ pathname: '/elderly/analysis', params: { mealId: meal.id } })}
        >
          <Text style={styles.detailButtonLabel}>자세한 분석 보기</Text>
        </Pressable>

        <Pressable style={styles.primaryButton} onPress={saveRecord} disabled={saving}>
          <Text style={styles.primaryButtonLabel}>기록 저장하기</Text>
        </Pressable>

        <Pressable style={styles.retakeButton} onPress={() => router.replace('/elderly/camera')}>
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
  retakeButton: { paddingVertical: spacing.sm, alignItems: 'center' },
  retakeLabel: { ...typeElder.callout, color: colors.textMuted, fontFamily: fontFamily.bold },

  disclaimer: { ...typeElder.caption, color: colors.textFaint, textAlign: 'center', marginTop: spacing.xs },

  missingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  missingTitle: { ...typeElder.subheading, color: colors.textMuted },
});
