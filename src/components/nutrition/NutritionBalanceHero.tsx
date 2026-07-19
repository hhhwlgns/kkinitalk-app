import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { DailyNutritionSummary, NutritionBalanceInsight, RangeState } from '../../domain/dailyNutrition';
import type { NutritionGoal, NutrientBreakdown } from '../../domain/types';
import { colors, radius, spacing, statusColor, type, typeElder } from '../../theme/tokens';
import { Card } from '../ui';

const SEGMENTS: { key: keyof NutrientBreakdown; short: string; label: string }[] = [
  { key: 'calories', short: '열', label: '식사량' },
  { key: 'carbsG', short: '탄', label: '탄수화물' },
  { key: 'proteinG', short: '단', label: '단백질' },
  { key: 'fatG', short: '지', label: '지방' },
];

function tone(state: RangeState) {
  if (state === 'good') return statusColor.good.fg;
  if (state === 'high') return statusColor.danger.fg;
  if (state === 'low' || state === 'caution') return statusColor.caution.fg;
  return colors.neutralFill;
}

export function NutritionBalanceHero({ summary, insight, goal, elder = false }: {
  summary: DailyNutritionSummary;
  insight: NutritionBalanceInsight;
  goal: NutritionGoal;
  elder?: boolean;
}) {
  const scale = elder ? typeElder : type;
  const size = elder ? 164 : 144;
  const center = size / 2;
  const radiusValue = size / 2 - 13;
  const circumference = 2 * Math.PI * radiusValue;
  const progress = summary.mealCount === 0 ? 0 : Math.max(0, Math.min(100, insight.score));

  return (
    <Card raised style={styles.card}>
      <Text style={[styles.eyebrow, scale.callout]}>오늘 균형 한눈에</Text>
      <View style={styles.heroRow}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size} style={styles.ring}>
            <Circle cx={center} cy={center} r={radiusValue} fill="none" stroke={colors.neutralFill} strokeWidth={18} />
            <Circle
              cx={center}
              cy={center}
              r={radiusValue}
              fill="none"
              stroke={insight.status === 'balanced' ? colors.good : colors.primary}
              strokeWidth={18}
              strokeLinecap="round"
              strokeDasharray={[circumference * progress / 100, circumference]}
              transform={`rotate(-90 ${center} ${center})`}
            />
          </Svg>
          <View style={styles.scoreCenter}>
            <Text style={[styles.score, scale.display]}>{summary.mealCount === 0 ? '—' : insight.score}</Text>
            <Text style={[styles.scoreLabel, scale.caption]}>{summary.mealCount === 0 ? '기록 전' : '균형 점수'}</Text>
          </View>
        </View>
        <View style={styles.legend}>
          {SEGMENTS.map((item) => (
            <View key={item.key} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: tone(summary.states[item.key]) }]} />
              <Text style={[styles.legendLabel, scale.caption]}>{item.label}</Text>
              <Text style={[styles.legendValue, scale.caption]}>{summary.mealCount === 0 ? '—' : `${Math.round(summary.totals[item.key] / Math.max(1, goal[item.key].target * (insight.expectedProgress ?? 1)) * 100)}%`}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.conclusion}>
        <Text style={[styles.title, scale.subheading]}>{insight.title}</Text>
        <Text style={[styles.description, scale.callout]}>{insight.description}</Text>
        {insight.basisLabel && <Text style={[styles.basis, scale.caption]}>{insight.basisLabel}</Text>}
      </View>
      {summary.mealCount > 0 && (
        <View style={styles.sodiumRow}>
          <Text style={[styles.sodiumLabel, scale.caption]}>나트륨은 상한을 살펴봐요</Text>
          <Text style={[styles.sodiumValue, scale.caption]}>{Math.round(summary.totals.sodiumMg).toLocaleString()} / {goal.sodiumMg.max.toLocaleString()}mg</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  eyebrow: { color: colors.primary },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ring: { position: 'absolute' },
  scoreCenter: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  score: { color: colors.text },
  scoreLabel: { color: colors.textMuted },
  legend: { flex: 1, gap: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: radius.pill },
  legendLabel: { color: colors.textMuted, flex: 1 },
  legendValue: { color: colors.text },
  conclusion: { borderRadius: radius.md, backgroundColor: colors.surfaceSunken, padding: spacing.md },
  title: { color: colors.text },
  description: { color: colors.textMuted, marginTop: spacing.xxs },
  basis: { color: colors.primary, marginTop: spacing.xs },
  sodiumRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.dividerLight, paddingTop: spacing.sm },
  sodiumLabel: { color: colors.textMuted },
  sodiumValue: { color: colors.text },
});
