import { StyleSheet, Text, View } from 'react-native';

import { buildNutritionBalanceInsight, type DailyNutritionSummary } from '../../domain/dailyNutrition';
import { colors, radius, spacing, type, typeElder } from '../../theme/tokens';
import { Card } from '../ui';

export function NutritionBalanceTrend({ summaries, elder = false }: { summaries: DailyNutritionSummary[]; elder?: boolean }) {
  const scale = elder ? typeElder : type;
  const points = summaries.map((summary) => ({ summary, insight: buildNutritionBalanceInsight(summary) }));
  const recorded = points.filter((point) => point.summary.mealCount > 0);
  const average = recorded.length === 0 ? 0 : Math.round(recorded.reduce((sum, point) => sum + point.insight.score, 0) / recorded.length);
  const latest = recorded[recorded.length - 1];
  const first = recorded[0];
  const summaryText = recorded.length < 2
    ? '식사 기록이 쌓이면 균형 변화를 알려드릴게요.'
    : latest.insight.score >= first.insight.score
      ? `이번 주 균형이 처음보다 ${latest.insight.score - first.insight.score}점 좋아졌어요.`
      : '조금 낮아진 날이 있어요. 끼니별 기록을 함께 살펴보세요.';

  return (
    <Card style={styles.card}>
      <View style={styles.headingRow}>
        <View><Text style={[styles.title, scale.subheading]}>지난 7일 균형 추이</Text><Text style={[styles.description, scale.caption]}>{summaryText}</Text></View>
        <View style={styles.averageBadge}><Text style={[styles.average, scale.callout]}>{recorded.length === 0 ? '—' : `평균 ${average}점`}</Text></View>
      </View>
      <View style={styles.chart}>
        {points.map(({ summary, insight }) => (
          <View key={summary.date} style={styles.column}>
            <Text style={[styles.pointScore, scale.caption]}>{summary.mealCount === 0 ? '—' : insight.score}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height: summary.mealCount === 0 ? 4 : `${Math.max(12, insight.score)}%`, backgroundColor: summary.mealCount === 0 ? colors.neutralFill : insight.status === 'balanced' ? colors.good : colors.primary }]} />
            </View>
            <Text style={[styles.day, scale.caption]}>{Number(summary.date.slice(8))}일</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md }, headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }, title: { color: colors.text }, description: { color: colors.textMuted, marginTop: spacing.xxs, flexShrink: 1 }, averageBadge: { borderRadius: radius.pill, backgroundColor: colors.primarySoft, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }, average: { color: colors.primary },
  chart: { height: 150, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }, column: { flex: 1, alignItems: 'center', gap: spacing.xs }, pointScore: { color: colors.text, fontFamily: type.callout.fontFamily }, barTrack: { height: 92, width: '72%', borderRadius: radius.pill, backgroundColor: colors.surfaceSunken, overflow: 'hidden', justifyContent: 'flex-end' }, bar: { width: '100%', borderRadius: radius.pill }, day: { color: colors.textMuted },
});
