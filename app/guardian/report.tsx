import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { colors, fontFamily, fontSize, radius, shadow, spacing } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import {
  guardianLinksCollection,
  medicationLogsCollection,
  medicationsCollection,
  mealsCollection,
} from '../../src/mocks/db/collections';
import { findConnectedLink } from '../../src/domain/guardianLink';
import type { Meal, Medication, MedicationLog } from '../../src/domain/types';

interface DayStat {
  date: string;
  label: string;
  sodiumMg: number;
  mealCount: number;
  medicationTakenCount: number;
  medicationScheduledCount: number;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 140;
const BAR_GAP = 8;

function lastNDates(n: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// Composes an elder-friendly weekly summary from the aggregated stats.
// This is a rule-based stand-in for a real AI summary — kept in the "참고용" tone.
function buildWeeklySummary(input: {
  totalMeals: number;
  daysWithMeals: number;
  sodiumExceedDays: number;
  adherenceRate: number | null;
}): string {
  const { totalMeals, daysWithMeals, sodiumExceedDays, adherenceRate } = input;

  if (totalMeals === 0 && adherenceRate === null) {
    return '이번 주에는 기록이 거의 없어요. 어르신께 식사와 복약 기록을 부탁드려 보세요.';
  }

  const parts: string[] = [];

  if (daysWithMeals >= 5) {
    parts.push('이번 주 식사는 꾸준했어요.');
  } else if (daysWithMeals > 0) {
    parts.push(`이번 주 식사 기록이 ${daysWithMeals}일뿐이라 조금 아쉬워요.`);
  }

  if (sodiumExceedDays >= 3) {
    parts.push(`국·찌개로 나트륨이 ${sodiumExceedDays}일이나 기준을 넘었어요. 저염으로 도와주세요.`);
  } else if (sodiumExceedDays > 0) {
    parts.push(`나트륨이 ${sodiumExceedDays}일 기준을 넘었어요.`);
  } else if (daysWithMeals > 0) {
    parts.push('나트륨은 대체로 안정적이었어요.');
  }

  if (adherenceRate !== null) {
    if (adherenceRate >= 80) {
      parts.push(`복약도 ${adherenceRate}%로 잘 챙기셨어요.`);
    } else if (adherenceRate >= 50) {
      parts.push(`복약 이행률은 ${adherenceRate}%예요. 저녁 약을 잊는 날이 있는지 살펴봐 주세요.`);
    } else {
      parts.push(`복약 이행률이 ${adherenceRate}%로 낮아요. 알림 시간을 조정해 보는 것을 권해요.`);
    }
  }

  return parts.join(' ');
}

function buildDayStats(dates: string[], meals: Meal[], medications: Medication[], logs: MedicationLog[]): DayStat[] {
  return dates.map((date) => {
    const dayMeals = meals.filter((meal) => meal.recordedAt.slice(0, 10) === date);
    const sodiumMg = dayMeals.reduce((sum, meal) => sum + meal.totalNutrients.sodiumMg, 0);
    const dayLogs = logs.filter((log) => log.takenAt.slice(0, 10) === date);
    const takenMedicationIds = new Set(dayLogs.map((log) => log.medicationId));
    return {
      date,
      label: date.slice(5),
      sodiumMg,
      mealCount: dayMeals.length,
      medicationTakenCount: takenMedicationIds.size,
      medicationScheduledCount: medications.length,
    };
  });
}

function SodiumChart({ stats }: { stats: DayStat[] }) {
  const maxSodium = Math.max(...stats.map((s) => s.sodiumMg), 1500);
  const barWidth = (CHART_WIDTH - BAR_GAP * (stats.length - 1)) / stats.length;

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 24}>
      {stats.map((stat, index) => {
        const barHeight = Math.max((stat.sodiumMg / maxSodium) * CHART_HEIGHT, 2);
        const x = index * (barWidth + BAR_GAP);
        const y = CHART_HEIGHT - barHeight;
        return (
          <G key={stat.date}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={stat.sodiumMg > 1500 ? colors.danger : colors.primary}
              rx={4}
            />
            <SvgText x={x + barWidth / 2} y={CHART_HEIGHT + 16} fontSize={10} fill={colors.textMuted} textAnchor="middle">
              {stat.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export default function GuardianReportScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';

  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<DayStat[]>([]);

  const load = useCallback(async () => {
    const links = await guardianLinksCollection.getAll();
    const link = findConnectedLink(links, guardianUserId);
    if (!link) {
      setChecking(false);
      router.replace('/guardian/connect');
      return;
    }

    const elderlyUserId = link.elderlyUserId;
    const [meals, medications, medicationLogs] = await Promise.all([
      mealsCollection.query((item) => item.userId === elderlyUserId),
      medicationsCollection.query((item) => item.userId === elderlyUserId),
      medicationLogsCollection.query((item) => item.userId === elderlyUserId),
    ]);

    const dates = lastNDates(7);
    setStats(buildDayStats(dates, meals, medications, medicationLogs));
    setChecking(false);
  }, [guardianUserId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>불러오는 중이에요...</Text>
      </SafeAreaView>
    );
  }

  const totalScheduled = stats.reduce((sum, s) => sum + s.medicationScheduledCount, 0);
  const totalTaken = stats.reduce((sum, s) => sum + s.medicationTakenCount, 0);
  const adherenceRate = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : null;
  const totalMeals = stats.reduce((sum, s) => sum + s.mealCount, 0);
  const avgSodium = Math.round(stats.reduce((sum, s) => sum + s.sodiumMg, 0) / stats.length);
  const sodiumExceedDays = stats.filter((s) => s.sodiumMg > 1500).length;
  const daysWithMeals = stats.filter((s) => s.mealCount > 0).length;
  const hasAnyData = totalMeals > 0 || totalTaken > 0;

  const aiSummary = buildWeeklySummary({
    totalMeals,
    daysWithMeals,
    sodiumExceedDays,
    adherenceRate,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>주간 리포트</Text>

        {!hasAnyData && <Text style={styles.emptyText}>이번 주 기록이 없어요.</Text>}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>나트륨 섭취 추이 (일별, mg)</Text>
          <SodiumChart stats={stats} />
          <Text style={styles.cardSub}>주간 평균: {avgSodium}mg (기준 1500mg 초과 시 빨간색)</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>주간 통계</Text>
          <Text style={styles.statLine}>총 식사 기록: {totalMeals}건</Text>
          <Text style={styles.statLine}>
            복약 이행률: {adherenceRate !== null ? `${adherenceRate}%` : '등록된 약 없음'}
          </Text>
        </View>

        {hasAnyData && (
          <View style={styles.aiCard}>
            <Text style={styles.aiLabel}>AI 요약</Text>
            <Text style={styles.aiText}>{aiSummary}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: {
    fontSize: fontSize.sectionHeader,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadow.card,
  },
  cardLabel: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  cardSub: { fontSize: fontSize.meta, fontFamily: fontFamily.regular, color: colors.textMuted, marginTop: spacing.xs },
  aiCard: {
    backgroundColor: colors.nextMedBg,
    borderWidth: 1.5,
    borderColor: colors.profileHighlightBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  aiLabel: { fontSize: fontSize.small, fontFamily: fontFamily.extrabold, color: colors.secondaryAccent },
  aiText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
    color: colors.text,
    lineHeight: 26,
    marginTop: spacing.xs,
  },
  statLine: { fontSize: fontSize.body, fontFamily: fontFamily.regular, color: colors.text, marginTop: spacing.xs, alignSelf: 'flex-start' },
  loadingText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.small,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
});
