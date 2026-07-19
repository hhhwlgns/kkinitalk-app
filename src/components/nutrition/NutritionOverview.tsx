import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import type { DailyNutritionSummary, RangeState } from '../../domain/dailyNutrition';
import type { NutritionGoal, NutrientBreakdown } from '../../domain/types';
import { colors, radius, spacing, statusColor, type, typeElder } from '../../theme/tokens';
import { Card } from '../ui';

type NutrientKey = keyof NutrientBreakdown;

const NUTRIENTS: { key: NutrientKey; label: string; unit: string }[] = [
  { key: 'calories', label: '열량', unit: 'kcal' },
  { key: 'proteinG', label: '단백질', unit: 'g' },
  { key: 'sodiumMg', label: '나트륨', unit: 'mg' },
];

const STATE_LABEL: Record<RangeState, string> = {
  missing: '기록 없음',
  low: '조금 부족',
  good: '적정',
  caution: '주의',
  high: '많음',
};

function stateColors(state: RangeState) {
  if (state === 'good') return statusColor.good;
  if (state === 'caution' || state === 'low') return statusColor.caution;
  if (state === 'high') return statusColor.danger;
  return { fg: colors.textFaint, bg: colors.surfaceSunken, border: colors.border, track: colors.neutralFill };
}

export function NutritionOverview({ summary, goal, elder = false }: {
  summary: DailyNutritionSummary;
  goal: NutritionGoal;
  elder?: boolean;
}) {
  const scale = elder ? typeElder : type;
  return (
    <Card raised>
      <View style={styles.headingRow}>
        <View>
          <Text style={[styles.eyebrow, scale.callout]}>하루 목표 영양소</Text>
          <Text style={[styles.heading, scale.subheading]}>
            {summary.mealCount === 0 ? '사진을 찍으면 채워져요' : `${summary.mealCount}끼 기록했어요`}
          </Text>
        </View>
        <View style={styles.mealCountBadge}>
          <Text style={styles.mealCountText}>{summary.mealCount}/3끼</Text>
        </View>
      </View>

      <View style={styles.rows}>
        {NUTRIENTS.map(({ key, label, unit }) => {
          const value = summary.totals[key];
          const target = goal[key].target;
          const state = summary.states[key];
          const tone = stateColors(state);
          const pct = Math.min(100, Math.round((value / Math.max(1, target)) * 100));
          return (
            <View key={key} style={styles.row}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, scale.callout]}>{label}</Text>
                <Text style={[styles.value, scale.callout]}>
                  {summary.mealCount === 0 ? '—' : `${Math.round(value).toLocaleString()} / ${target.toLocaleString()}${unit}`}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: tone.fg }]} />
              </View>
              <Text style={[styles.state, { color: tone.fg }]}>{STATE_LABEL[state]}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export function NutritionTrendChart({ summaries, nutrientKey = 'sodiumMg', elder = false }: {
  summaries: DailyNutritionSummary[];
  nutrientKey?: NutrientKey;
  elder?: boolean;
}) {
  const width = 300;
  const height = 96;
  const max = Math.max(1, ...summaries.map((item) => item.totals[nutrientKey]));
  const barGap = 10;
  const barWidth = (width - barGap * (summaries.length - 1)) / summaries.length;
  const scale = elder ? typeElder : type;

  return (
    <Card>
      <Text style={[styles.trendTitle, scale.subheading]}>최근 7일 나트륨</Text>
      <Text style={[styles.trendSummary, scale.callout]}>
        {summaries.some((item) => item.states[nutrientKey] === 'high' || item.states[nutrientKey] === 'caution')
          ? '높았던 날은 국물을 조금 남겨보세요.'
          : '최근에는 대체로 알맞게 드셨어요.'}
      </Text>
      <View style={styles.chartWrap}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Line x1="0" x2={width} y1={height - 1} y2={height - 1} stroke={colors.border} strokeWidth="1" />
          {summaries.map((item, index) => {
            const value = item.totals[nutrientKey];
            const barHeight = item.mealCount === 0 ? 4 : Math.max(10, (value / max) * (height - 12));
            const tone = stateColors(item.states[nutrientKey]);
            return (
              <Rect
                key={item.date}
                x={index * (barWidth + barGap)}
                y={height - barHeight}
                width={barWidth}
                height={barHeight}
                rx={5}
                fill={item.mealCount === 0 ? colors.neutralFill : tone.fg}
              />
            );
          })}
        </Svg>
        <View style={styles.dayLabels}>
          {summaries.map((item) => (
            <Text key={item.date} style={styles.dayLabel}>{Number(item.date.slice(8))}일</Text>
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  eyebrow: { color: colors.textMuted },
  heading: { color: colors.text, marginTop: spacing.xxs },
  mealCountBadge: { borderRadius: radius.pill, backgroundColor: colors.goodBg, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  mealCountText: { ...type.callout, color: colors.good },
  rows: { marginTop: spacing.md, gap: spacing.md },
  row: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs },
  label: { color: colors.text },
  value: { color: colors.textMuted, textAlign: 'right' },
  track: { height: 12, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.surfaceSunken },
  fill: { height: '100%', borderRadius: radius.pill },
  state: { ...type.caption, alignSelf: 'flex-end' },
  trendTitle: { color: colors.text },
  trendSummary: { color: colors.textMuted, marginTop: spacing.xxs },
  chartWrap: { marginTop: spacing.md },
  dayLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  dayLabel: { ...type.caption, color: colors.textFaint },
});
