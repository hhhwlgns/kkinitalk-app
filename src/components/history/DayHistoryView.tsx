import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AlarmIcon } from '../icons/AlarmIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { StatTile, StatusPill } from '../ui';
import { colors, fontFamily, fontSize, fontSizeCompact, radius, shadow, spacing } from '../../theme/tokens';
import type { CheckIn, ConditionLevel, Meal, MealSlot, Medication, MedicationLog } from '../../domain/types';
import { buildDayHistory, collectRecordDates, getMonthGridDates } from '../../domain/historyView';
import { earliestTime, formatKoreanTime, todayDate } from '../../domain/date';
import { sumNutrients } from '../../mocks/nutritionAnalysis';
import { proteinStatus, sodiumStatus } from '../../domain/nutrientStatus';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const TABS: { key: 'all' | MealSlot; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'breakfast', label: '아침' },
  { key: 'lunch', label: '점심' },
  { key: 'dinner', label: '저녁' },
];

const CONDITION_LABEL: Record<ConditionLevel, string> = {
  good: '좋음',
  normal: '보통',
  bad: '좋지 않음',
};

function formatMealTime(iso: string): string {
  const date = new Date(iso);
  const hour24 = date.getHours();
  const minute = date.getMinutes();
  const period = hour24 < 12 ? '오전' : '오후';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minute === 0 ? `${period} ${hour12}시` : `${period} ${hour12}시 ${minute}분`;
}

interface DayHistoryViewProps {
  variant: 'elderly' | 'guardian';
  title: string;
  meals: Meal[];
  medications: Medication[];
  medicationLogs: MedicationLog[];
  checkIns: CheckIn[];
}

export function DayHistoryView({ variant, title, meals, medications, medicationLogs, checkIns }: DayHistoryViewProps) {
  const compact = variant === 'guardian';
  const size = compact
    ? { small: fontSizeCompact.small, label: fontSizeCompact.label, sectionHeader: fontSizeCompact.sectionHeader, calendarIcon: 14, alarmIcon: 18 }
    : { small: fontSize.small, label: fontSize.label, sectionHeader: fontSize.sectionHeader, calendarIcon: 16, alarmIcon: 20 };
  const missingMealsLabel = compact ? '기록되지 않은 끼니가 있어요' : '기록하지 않은 끼니가 있어요';

  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [selectedTab, setSelectedTab] = useState<'all' | MealSlot>('all');
  const [calOpen, setCalOpen] = useState(false);

  const recordDates = useMemo(
    () => collectRecordDates(meals, medicationLogs, checkIns),
    [meals, medicationLogs, checkIns],
  );

  const now = new Date();
  const monthCells = useMemo(() => getMonthGridDates(now.getFullYear(), now.getMonth()), [now]);
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  const dayHistory = useMemo(
    () => buildDayHistory(selectedDate, meals, medicationLogs, medications, checkIns),
    [selectedDate, meals, medicationLogs, medications, checkIns],
  );

  const filteredMeals = useMemo(
    () => (selectedTab === 'all' ? dayHistory.meals : dayHistory.meals.filter((meal) => meal.slot === selectedTab)),
    [dayHistory.meals, selectedTab],
  );

  const dayNutrients = useMemo(
    () => sumNutrients(dayHistory.meals.flatMap((meal) => meal.foods)),
    [dayHistory.meals],
  );
  const hasMeals = dayHistory.meals.length > 0;
  const sodiumStat = sodiumStatus(dayNutrients.sodiumMg);
  const proteinStat = proteinStatus(dayNutrients.proteinG);
  const sodiumTile = !hasMeals ? 'default' : sodiumStat === 'good' ? 'default' : sodiumStat === 'caution' ? 'caution' : 'danger';
  const proteinTile = !hasMeals ? 'default' : proteinStat === 'good' ? 'default' : proteinStat === 'caution' ? 'caution' : 'danger';

  const medicationRows = useMemo(
    () =>
      medications.map((medication) => {
        const log = dayHistory.medicationLogs.find((item) => item.medicationId === medication.id);
        return {
          medication,
          taken: Boolean(log),
          time: log ? formatMealTime(log.takenAt) : formatKoreanTime(earliestTime(medication.timesOfDay)),
        };
      }),
    [medications, dayHistory.medicationLogs],
  );

  const selectedDateLabel = `${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8, 10))}일`;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { fontSize: size.sectionHeader }]}>{title}</Text>

      <View style={[styles.tabRow, compact && styles.tabRowCompact]}>
        {TABS.map((tab) => {
          const active = tab.key === selectedTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setSelectedTab(tab.key)}
              style={[styles.tab, compact && styles.tabCompact, active ? styles.tabActive : styles.tabInactive]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { fontSize: size.small },
                  active ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => setCalOpen((v) => !v)}
        style={[styles.calToggle, compact && styles.calToggleCompact, calOpen ? styles.calToggleActive : styles.calToggleInactive]}
      >
        <CalendarIcon size={size.calendarIcon} color={calOpen ? colors.onPrimary : colors.text} />
        <Text style={[styles.calToggleLabel, { fontSize: size.small }, calOpen ? styles.calToggleLabelActive : styles.calToggleLabelInactive]}>
          달력
        </Text>
      </Pressable>

      {calOpen && (
        <View style={styles.calPanel}>
          <Text style={[styles.calMonthLabel, { fontSize: size.label }]}>{monthLabel}</Text>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Text
                key={label}
                style={[styles.weekdayLabel, index === 0 && styles.weekdaySun, index === 6 && styles.weekdaySat]}
              >
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {monthCells.map((date, index) => {
              if (!date) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }
              const isSelected = date === selectedDate;
              const hasRecord = recordDates.has(date);
              const dayNumber = Number(date.slice(8, 10));
              return (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayNumber}일${hasRecord ? ', 기록 있음' : ''}`}
                  onPress={() => setSelectedDate(date)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    hasRecord && !isSelected && styles.dayCellHasRecord,
                  ]}
                >
                  <Text style={[styles.dayNumber, { fontSize: size.small }, isSelected && styles.dayNumberSelected]}>
                    {dayNumber}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <Text style={[styles.dateMeta, { fontSize: size.small }]}>
        {selectedDateLabel} · {dayHistory.meals.length}건
      </Text>

      <View style={styles.summaryRow}>
        <StatTile label="칼로리" value={hasMeals ? `${Math.round(dayNutrients.calories)}kcal` : '–'} />
        <StatTile
          label="나트륨"
          value={hasMeals ? `${Math.round(dayNutrients.sodiumMg).toLocaleString()}mg` : '–'}
          tone={sodiumTile}
        />
        <StatTile
          label="단백질"
          value={hasMeals ? `${Math.round(dayNutrients.proteinG)}g` : '–'}
          tone={proteinTile}
        />
      </View>

      <Text style={[styles.sectionHeader, { fontSize: size.small }]}>식사</Text>
      {filteredMeals.map((meal) => {
        const mealStat = sodiumStatus(meal.totalNutrients.sodiumMg);
        const displayName = meal.foods.length > 0 ? `${meal.foods[0].name} 등` : '식사';
        return (
          <View key={meal.id} style={[styles.mealCard, compact && styles.mealCardCompact]}>
            {meal.photoUri ? (
              <Image
                source={{ uri: meal.photoUri }}
                style={[styles.mealPhoto, compact && styles.mealPhotoCompact]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.mealPhoto, compact && styles.mealPhotoCompact]}>
                <Text style={styles.mealPhotoLabel}>사진</Text>
              </View>
            )}
            <View style={styles.flex1}>
              <Text style={styles.mealTime}>{formatMealTime(meal.recordedAt)}</Text>
              <Text style={[styles.mealName, { fontSize: size.label }]}>{displayName}</Text>
              <Text style={styles.mealFoods} numberOfLines={1}>
                {meal.foods.map((food) => food.name).join(', ')}
              </Text>
            </View>
            <StatusPill
              status={mealStat}
              size="sm"
              label={mealStat === 'good' ? '적합' : mealStat === 'caution' ? '주의' : '위험'}
            />
          </View>
        );
      })}
      {filteredMeals.length === 0 && (
        <View style={styles.missingCard}>
          <Text style={[styles.missingText, { fontSize: size.small }]}>{missingMealsLabel}</Text>
        </View>
      )}

      <Text style={[styles.sectionHeader, { fontSize: size.small }]}>복약</Text>
      {medicationRows.length > 0 && (
        <View style={styles.medCard}>
          {medicationRows.map((row, index) => (
            <View
              key={row.medication.id}
              style={[
                styles.medRow,
                compact && styles.medRowCompact,
                index === medicationRows.length - 1 && styles.medRowLast,
              ]}
            >
              <View style={styles.flex1}>
                <Text style={styles.medTime}>{row.time}</Text>
                <Text style={[styles.medName, { fontSize: size.label }]}>{row.medication.name}</Text>
              </View>
              <View
                style={[
                  styles.medStatusPill,
                  compact && styles.medStatusPillCompact,
                  { backgroundColor: row.taken ? colors.goodBg : colors.dangerBg },
                ]}
              >
                <Text style={[styles.medStatusLabel, { color: row.taken ? colors.good : colors.danger }]}>
                  {row.taken ? '복용함' : '복용 안 함'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.sectionHeader, { fontSize: size.small }]}>체크인</Text>
      <View style={[styles.checkinCard, { backgroundColor: dayHistory.checkIn ? colors.goodBg : colors.cardSubBg }]}>
        <AlarmIcon size={size.alarmIcon} color={dayHistory.checkIn ? colors.good : colors.textFaint} />
        <Text style={[styles.checkinText, { fontSize: size.small }, { color: dayHistory.checkIn ? colors.good : colors.textFaint }]}>
          {dayHistory.checkIn
            ? `체크인 완료 · 컨디션 ${CONDITION_LABEL[dayHistory.checkIn.condition]}`
            : '체크인 기록이 없어요'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  flex1: { flex: 1 },
  title: { fontFamily: fontFamily.extrabold, color: colors.text, letterSpacing: -0.5 },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tabRowCompact: { gap: 6 },
  tab: {
    borderRadius: radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 20,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  tabCompact: { paddingVertical: 9, paddingHorizontal: 16, minHeight: undefined },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabInactive: { backgroundColor: colors.surface, borderColor: colors.border },
  tabLabel: { fontFamily: fontFamily.extrabold },
  tabLabelActive: { color: colors.onPrimary },
  tabLabelInactive: { color: colors.text },
  calToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  calToggleCompact: { paddingVertical: 9, paddingHorizontal: 14 },
  calToggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  calToggleInactive: { backgroundColor: colors.surface, borderColor: colors.border },
  calToggleLabel: { fontFamily: fontFamily.extrabold },
  calToggleLabelActive: { color: colors.onPrimary },
  calToggleLabelInactive: { color: colors.text },
  calPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    ...shadow.card,
  },
  calMonthLabel: {
    fontFamily: fontFamily.extrabold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  weekdayRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.meta,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
    paddingVertical: 3,
  },
  weekdaySun: { color: colors.calendarSun },
  weekdaySat: { color: colors.calendarSat },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    marginBottom: 3,
  },
  dayCellSelected: { backgroundColor: colors.primary },
  dayCellHasRecord: { backgroundColor: colors.goodBg },
  dayNumber: { fontFamily: fontFamily.bold, color: colors.text },
  dayNumberSelected: { color: colors.onPrimary },
  dateMeta: { fontFamily: fontFamily.bold, color: colors.textMuted },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xxs },
  sectionHeader: { fontFamily: fontFamily.extrabold, color: colors.textMuted, marginTop: 4 },
  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadow.card,
  },
  mealCardCompact: { gap: 10 },
  mealPhoto: {
    width: 62,
    height: 62,
    borderRadius: radius.sm,
    backgroundColor: colors.photoStripe,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mealPhotoCompact: { width: 48, height: 48 },
  mealPhotoLabel: { fontSize: fontSize.meta, fontFamily: fontFamily.regular, color: colors.avatarInitial },
  mealTime: { fontSize: fontSize.meta, fontFamily: fontFamily.bold, color: colors.textMuted },
  mealName: { fontFamily: fontFamily.extrabold, color: colors.text, marginTop: 1 },
  mealFoods: { fontSize: fontSize.meta, fontFamily: fontFamily.medium, color: colors.textMuted, marginTop: 1 },
  missingCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  missingText: { fontFamily: fontFamily.semibold, color: colors.textFaint },
  medCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    ...shadow.card,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerLight,
  },
  medRowCompact: { paddingVertical: 10 },
  medRowLast: { borderBottomWidth: 0 },
  medTime: { fontSize: fontSize.meta, fontFamily: fontFamily.bold, color: colors.textMuted },
  medName: { fontFamily: fontFamily.extrabold, color: colors.text, marginTop: 1 },
  medStatusPill: { borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
  medStatusPillCompact: { paddingVertical: 4, paddingHorizontal: 10 },
  medStatusLabel: { fontSize: fontSize.meta, fontFamily: fontFamily.extrabold },
  checkinCard: {
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkinText: { fontFamily: fontFamily.extrabold },
});
