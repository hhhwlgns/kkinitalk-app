import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, SectionHeader } from '../ui';
import { DisclaimerBanner } from '../DisclaimerBanner';
import { colors, fontFamily, radius, spacing, type as typeScale } from '../../theme/tokens';
import type { HealthProfile, Meal, Medication } from '../../domain/types';
import {
  assessMealFitness,
  buildMealInsights,
  computeFoodContributions,
  nutrientPct,
  sumNutrients,
} from '../../mocks/nutritionAnalysis';
import { findConflicts } from '../../domain/conflictRules';

const SLOT_LABEL: Record<Meal['slot'], string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const h = date.getHours();
  const period = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const m = date.getMinutes();
  return m === 0 ? `${period} ${h12}시` : `${period} ${h12}시 ${m}분`;
}

interface NutrientRow {
  key: string;
  name: string;
  value: string;
  pct: number;
  tone: 'brand' | 'good' | 'danger' | 'neutral';
}

const BAR_COLOR: Record<NutrientRow['tone'], string> = {
  brand: colors.primary,
  good: colors.good,
  danger: colors.danger,
  neutral: colors.avatarInitial,
};

interface MealAnalysisViewProps {
  meal: Meal;
  profile: HealthProfile | null;
  medications: Medication[];
  compact?: boolean;
}

/**
 * The app's core surface: a detailed, human-readable breakdown of one analyzed
 * meal — nutrients with target bars, per-food sodium contribution, medication
 * conflicts, and plain-language suggestions. Shared by elderly & guardian.
 */
export function MealAnalysisView({ meal, profile, medications, compact = false }: MealAnalysisViewProps) {
  const totals = useMemo(() => sumNutrients(meal.foods), [meal.foods]);
  const verdict = useMemo(() => assessMealFitness(totals, profile), [totals, profile]);
  const contributions = useMemo(() => computeFoodContributions(meal.foods), [meal.foods]);
  const insights = useMemo(() => buildMealInsights(totals, meal.foods, profile), [totals, meal.foods, profile]);
  const conflicts = useMemo(
    () => findConflicts(medications, meal.foods.map((f) => f.name)),
    [medications, meal.foods],
  );

  const isGood = verdict.fitness === 'good';

  const nutrientRows: NutrientRow[] = [
    {
      key: 'cal',
      name: '칼로리',
      value: `${Math.round(totals.calories)} kcal`,
      pct: nutrientPct(totals.calories, 'calories'),
      tone: 'brand',
    },
    {
      key: 'sodium',
      name: '나트륨',
      value: `${Math.round(totals.sodiumMg).toLocaleString()} mg`,
      pct: nutrientPct(totals.sodiumMg, 'sodiumMg'),
      tone: totals.sodiumMg > 1500 ? 'danger' : 'good',
    },
    {
      key: 'protein',
      name: '단백질',
      value: `${Math.round(totals.proteinG)} g`,
      pct: nutrientPct(totals.proteinG, 'proteinG'),
      tone: 'good',
    },
    {
      key: 'carbs',
      name: '탄수화물',
      value: `${Math.round(totals.carbsG)} g`,
      pct: nutrientPct(totals.carbsG, 'carbsG'),
      tone: 'neutral',
    },
  ];

  const displayName = meal.foods.length > 0 ? `${meal.foods[0].name} 등 ${meal.foods.length}가지` : '식사';

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Photo + heading */}
      <Card padded={false} style={styles.headerCard}>
        {meal.photoUri ? (
          <Image source={{ uri: meal.photoUri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <Text style={styles.photoEmptyText}>사진 없음</Text>
          </View>
        )}
        <View style={styles.headerBody}>
          <Text style={styles.eyebrow}>
            {SLOT_LABEL[meal.slot]} · {formatTime(meal.recordedAt)}
          </Text>
          <Text style={styles.headerTitle}>{displayName}</Text>
          <View style={styles.chipRow}>
            {meal.foods.map((food) => (
              <View key={food.id} style={styles.foodChip}>
                <Text style={styles.foodChipLabel}>{food.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      {/* Verdict */}
      <Card
        style={[styles.verdictCard, { backgroundColor: isGood ? colors.goodBg : colors.cautionBg, borderColor: isGood ? colors.goodBorder : colors.cautionBorder }]}
      >
        <Badge label={isGood ? '균형 좋음' : '주의'} tone={isGood ? 'good' : 'caution'} />
        <Text style={[styles.verdictText, { color: isGood ? colors.good : colors.text }]}>{verdict.fitnessNote}</Text>
      </Card>

      {/* Nutrients with target bars */}
      <View>
        <SectionHeader title="영양 상세" />
        <Card>
          {nutrientRows.map((row, index) => (
            <View key={row.key} style={[styles.nutrientBlock, index === nutrientRows.length - 1 && styles.nutrientBlockLast]}>
              <View style={styles.nutrientTop}>
                <Text style={styles.nutrientName}>{row.name}</Text>
                <Text style={[styles.nutrientValue, { color: BAR_COLOR[row.tone] }]} numberOfLines={1}>
                  {row.value}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(row.pct, 3)}%`, backgroundColor: BAR_COLOR[row.tone] }]} />
              </View>
              <Text style={styles.nutrientPct}>하루 권장의 {row.pct}%</Text>
            </View>
          ))}
        </Card>
      </View>

      {/* Per-food sodium contribution */}
      <View>
        <SectionHeader title="무엇이 나트륨을 높였나" />
        <Card>
          {contributions.map((c, index) => (
            <View key={c.food.id} style={[styles.foodRow, index === contributions.length - 1 && styles.foodRowLast]}>
              <View style={styles.flex1}>
                <Text style={styles.foodName}>{c.food.name}</Text>
                <View style={styles.miniTrack}>
                  <View style={[styles.miniFill, { width: `${Math.max(c.sodiumShare, 2)}%` }]} />
                </View>
              </View>
              <Text style={styles.foodSodium}>{Math.round(c.sodiumMg).toLocaleString()}mg</Text>
            </View>
          ))}
        </Card>
      </View>

      {/* Medication conflicts */}
      {conflicts.length > 0 && (
        <View>
          <SectionHeader title="약과 함께 볼 점" />
          <Card style={styles.conflictCard}>
            {conflicts.map((w, index) => (
              <View key={`${w.medicationName}-${w.foodName}-${index}`} style={styles.conflictRow}>
                <View style={styles.conflictDot} />
                <Text style={styles.conflictText}>{w.warning}</Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* Insights */}
      <View>
        <SectionHeader title="이렇게 해보세요" />
        <Card>
          {insights.map((insight, index) => (
            <View key={index} style={[styles.insightRow, index === insights.length - 1 && styles.insightRowLast]}>
              <View style={styles.insightNumber}>
                <Text style={styles.insightNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </Card>
      </View>

      <DisclaimerBanner variant="general" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  flex1: { flex: 1 },

  headerCard: { overflow: 'hidden' },
  photo: { width: '100%', height: 180, backgroundColor: colors.surfaceSunken },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  photoEmptyText: { ...typeScale.callout, color: colors.textFaint },
  headerBody: { padding: spacing.md, gap: spacing.xs },
  eyebrow: { ...typeScale.caption, color: colors.textMuted, fontFamily: fontFamily.bold },
  headerTitle: { ...typeScale.title, color: colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xxs },
  foodChip: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  foodChipLabel: { ...typeScale.callout, color: colors.text, fontFamily: fontFamily.semibold },

  verdictCard: { gap: spacing.sm },
  verdictText: { ...typeScale.bodyStrong },

  nutrientBlock: {
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerLight,
  },
  nutrientBlockLast: { paddingBottom: 0, marginBottom: 0, borderBottomWidth: 0 },
  nutrientTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nutrientName: { ...typeScale.bodyStrong, color: colors.text },
  nutrientValue: { ...typeScale.bodyStrong, fontFamily: fontFamily.extrabold },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceSunken, marginTop: spacing.xs, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  nutrientPct: { ...typeScale.caption, color: colors.textMuted, marginTop: 5 },

  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerLight,
  },
  foodRowLast: { paddingBottom: 0, marginBottom: 0, borderBottomWidth: 0 },
  foodName: { ...typeScale.body, color: colors.text, fontFamily: fontFamily.semibold },
  miniTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceSunken, marginTop: 6, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 3, backgroundColor: colors.caution },
  foodSodium: { ...typeScale.callout, color: colors.textMuted, fontFamily: fontFamily.bold, minWidth: 64, textAlign: 'right' },

  conflictCard: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder, gap: spacing.sm },
  conflictRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  conflictDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.danger, marginTop: 8 },
  conflictText: { ...typeScale.body, color: colors.danger, fontFamily: fontFamily.semibold, flex: 1 },

  insightRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerLight,
  },
  insightRowLast: { paddingBottom: 0, marginBottom: 0, borderBottomWidth: 0 },
  insightNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightNumberText: { ...typeScale.caption, color: colors.secondaryAccent, fontFamily: fontFamily.extrabold },
  insightText: { ...typeScale.body, color: colors.text, flex: 1 },
});
