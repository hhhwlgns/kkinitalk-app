import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { BigButton } from '../../src/components/BigButton';
import { colors, fontFamily, fontSize, radius, shadow, spacing } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import { healthProfilesCollection, mealsCollection } from '../../src/mocks/db/collections';
import type { FoodItem, HealthProfile, Meal } from '../../src/domain/types';
import { assessMealFitness, nutrientPct, sumNutrients } from '../../src/mocks/nutritionAnalysis';

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
  return `${period} ${hours12}시 ${minutes}분`;
}

function NutrientBar({
  name,
  value,
  unit,
  pct,
  color,
}: {
  name: string;
  value: string;
  unit: string;
  pct: number;
  color: string;
}) {
  return (
    <View>
      <View style={styles.nutrientRow}>
        <Text style={styles.nutrientName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.nutrientValue, { color }]} numberOfLines={1}>
          {value}
          {unit}
        </Text>
      </View>
      <View style={styles.nutrientTrack}>
        <View style={[styles.nutrientFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
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
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>분석 결과</Text>
          <Text style={styles.subtitle}>분석 결과를 찾을 수 없어요</Text>
          <BigButton label="홈으로" onPress={() => router.replace('/elderly/home')} />
        </View>
      </SafeAreaView>
    );
  }

  const isGood = verdict.fitness === 'good';
  const verdictTitle = isGood
    ? '골고루 잘 드셨어요'
    : totals.sodiumMg > 1500
      ? '국이 조금 짜요'
      : '나트륨이 조금 높아요';

  function toggleFood(foodId: string) {
    setRemovedFoodIds((prev) => {
      const next = new Set(prev);
      if (next.has(foodId)) {
        next.delete(foodId);
      } else {
        next.add(foodId);
      }
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

  const displayName = activeFoods.length > 0 ? `${activeFoods[0].name} 등` : '식사';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          {meal.photoUri ? (
            <Image source={{ uri: meal.photoUri }} style={styles.photoStripe} resizeMode="cover" />
          ) : (
            <View style={styles.photoStripe} />
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerMeta}>
              {SLOT_LABEL[meal.slot]} · {formatTime(meal.recordedAt)}
            </Text>
            <Text style={styles.headerTitle}>{displayName}</Text>
          </View>
        </View>

        <View style={styles.chipsRow}>
          {activeFoods.map((food) => (
            <Pressable
              key={food.id}
              onPress={() => isEditFoods && toggleFood(food.id)}
              style={[styles.chip, { borderColor: isEditFoods ? colors.dangerBorder : colors.border }]}
            >
              <Text style={styles.chipLabel}>
                {food.name}
                {isEditFoods ? '  ✕' : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.editHintCard}>
          <Text style={styles.editHintText}>
            {isEditFoods
              ? '잘못 인식된 음식을 누르면 빠져요'
              : 'AI 분석 신뢰도 보통 · 잘못 인식된 음식은 고칠 수 있어요'}
          </Text>
          <Pressable style={styles.editButton} onPress={() => setIsEditFoods((v) => !v)}>
            <Text style={styles.editButtonLabel}>{isEditFoods ? '고치기 완료' : '음식 고치기'}</Text>
          </Pressable>
          <Pressable style={styles.editButton} onPress={() => router.replace('/elderly/camera')}>
            <Text style={styles.editButtonLabelMuted}>다시 찍기</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.verdictCard,
            {
              backgroundColor: isGood ? colors.goodBg : colors.cautionBg,
              borderColor: isGood ? colors.goodBorder : colors.cautionBorder,
            },
          ]}
        >
          <View style={styles.verdictHeader}>
            <View style={[styles.verdictChip, { backgroundColor: isGood ? colors.good : colors.caution }]}>
              <Text style={styles.verdictChipLabel}>{isGood ? '적합' : '주의'}</Text>
            </View>
            <Text style={[styles.verdictTitle, { color: isGood ? colors.good : colors.text }]}>
              {verdictTitle}
            </Text>
          </View>
          <Text style={styles.verdictText}>{verdict.fitnessNote}</Text>
        </View>

        <View style={styles.nutrientsCard}>
          <Text style={styles.nutrientsHeader}>이번 식사 영양</Text>
          <NutrientBar
            name="칼로리"
            value={`${Math.round(totals.calories)}`}
            unit=" kcal"
            pct={nutrientPct(totals.calories, 'calories')}
            color={colors.text}
          />
          <NutrientBar
            name="나트륨"
            value={`${Math.round(totals.sodiumMg).toLocaleString()}`}
            unit=" mg"
            pct={nutrientPct(totals.sodiumMg, 'sodiumMg')}
            color={totals.sodiumMg > 1500 ? colors.danger : colors.good}
          />
          <NutrientBar
            name="단백질"
            value={`${Math.round(totals.proteinG)}`}
            unit=" g"
            pct={nutrientPct(totals.proteinG, 'proteinG')}
            color={colors.good}
          />
          <NutrientBar
            name="탄수화물"
            value={`${Math.round(totals.carbsG)}`}
            unit=" g"
            pct={nutrientPct(totals.carbsG, 'carbsG')}
            color={colors.avatarInitial}
          />
        </View>

        <Pressable style={styles.saveButton} onPress={saveRecord} disabled={saving}>
          <Text style={styles.saveButtonLabel}>기록 저장하기</Text>
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
  content: { padding: spacing.lg },
  title: { fontSize: fontSize.sectionHeader, fontFamily: fontFamily.bold, color: colors.text },
  subtitle: {
    fontSize: fontSize.small,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: spacing.md,
  },
  photoStripe: {
    width: 74,
    height: 74,
    borderRadius: radius.md,
    backgroundColor: colors.dividerLight,
  },
  headerText: { flex: 1 },
  headerMeta: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semibold,
    color: colors.textMuted,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fontFamily.extrabold,
    color: colors.text,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  chipLabel: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  editHintCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  editHintText: {
    flex: 1,
    fontSize: fontSize.small,
    fontFamily: fontFamily.semibold,
    color: colors.textMuted,
    lineHeight: 20,
  },
  editButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  editButtonLabel: {
    fontSize: fontSize.small,
    fontFamily: fontFamily.bold,
    color: colors.secondaryAccent,
  },
  editButtonLabelMuted: {
    fontSize: fontSize.small,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
  },
  verdictCard: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  verdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verdictChip: {
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  verdictChipLabel: {
    color: colors.onPrimary,
    fontSize: fontSize.small,
    fontFamily: fontFamily.extrabold,
  },
  verdictTitle: {
    fontSize: 22,
    fontFamily: fontFamily.extrabold,
  },
  verdictText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
    color: colors.text,
    lineHeight: 26,
    marginTop: spacing.sm,
  },
  nutrientsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 15,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  nutrientsHeader: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.extrabold,
    color: colors.textMuted,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  nutrientName: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  nutrientValue: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.extrabold,
  },
  nutrientTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.dividerLight,
    marginTop: 7,
    overflow: 'hidden',
  },
  nutrientFill: {
    height: '100%',
    borderRadius: 6,
  },
  saveButton: {
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    paddingVertical: 21,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadow.cta,
  },
  saveButtonLabel: {
    color: colors.onPrimary,
    fontSize: 23,
    fontFamily: fontFamily.extrabold,
  },
  disclaimer: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 21,
  },
});
