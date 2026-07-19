import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDateWithWeekday, localDateString, todayDate } from '../../domain/date';
import { getMonthGridDates } from '../../domain/historyView';
import { colors, minTouchTarget, radius, spacing, type, typeElder } from '../../theme/tokens';

export function shiftDate(date: string, offset: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(year, month - 1, day, 12, 0, 0, 0);
  next.setDate(next.getDate() + offset);
  return localDateString(next);
}

export function DateNavigator({ date, onChange, calendarOpen, onCalendarOpenChange, elder = false }: {
  date: string;
  onChange: (date: string) => void;
  calendarOpen: boolean;
  onCalendarOpenChange: (open: boolean) => void;
  elder?: boolean;
}) {
  const [year, month, day] = date.split('-').map(Number);
  const today = todayDate();
  const scale = elder ? typeElder : type;
  const cells = getMonthGridDates(year, month - 1);

  return (
    <>
      <View style={styles.navigator}>
        <Pressable onPress={() => onChange(shiftDate(date, -1))} style={styles.navButton} accessibilityLabel="전날 보기">
          <Ionicons name="chevron-back" size={25} color={colors.primary} />
          <Text style={[styles.navButtonText, scale.callout]}>전날</Text>
        </Pressable>
        <Pressable onPress={() => onCalendarOpenChange(true)} style={styles.dateButton} accessibilityLabel="달력에서 날짜 선택">
          <Text style={[styles.dateText, scale.subheading]}>{formatDateWithWeekday(new Date(year, month - 1, day, 12))}</Text>
          <Ionicons name="calendar" size={23} color={colors.primary} />
        </Pressable>
        <Pressable disabled={date >= today} onPress={() => onChange(shiftDate(date, 1))} style={[styles.navButton, styles.navButtonRight, date >= today && styles.disabled]} accessibilityLabel="다음날 보기">
          <Text style={[styles.navButtonText, scale.callout]}>다음날</Text>
          <Ionicons name="chevron-forward" size={25} color={colors.primary} />
        </Pressable>
      </View>

      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => onCalendarOpenChange(false)}>
        <Pressable style={styles.scrim} onPress={() => onCalendarOpenChange(false)}>
          <Pressable style={styles.calendarCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => onChange(shiftDate(`${year}-${String(month).padStart(2, '0')}-01`, -1))} style={styles.iconButton}>
                <Ionicons name="chevron-back" size={25} color={colors.text} />
              </Pressable>
              <Text style={styles.calendarTitle}>{year}년 {month}월</Text>
              <Pressable disabled={year === Number(today.slice(0, 4)) && month === Number(today.slice(5, 7))} onPress={() => onChange(localDateString(new Date(year, month, 1, 12)))} style={styles.iconButton}>
                <Ionicons name="chevron-forward" size={25} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.weekRow}>{['일', '월', '화', '수', '목', '금', '토'].map((label) => <Text key={label} style={styles.weekLabel}>{label}</Text>)}</View>
            <View style={styles.calendarGrid}>
              {cells.map((cell, index) => (
                <View key={cell ?? `empty-${index}`} style={styles.dayCell}>
                  {cell && (
                    <Pressable
                      disabled={cell > today}
                      onPress={() => { onChange(cell); onCalendarOpenChange(false); }}
                      style={[styles.dayButton, cell === date && styles.daySelected, cell > today && styles.disabled]}
                    >
                      <Text style={[styles.dayText, cell === date && styles.dayTextSelected]}>{Number(cell.slice(8))}</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  navigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  navButton: { minWidth: 72, minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center' },
  navButtonRight: { justifyContent: 'flex-end' },
  navButtonText: { color: colors.primary },
  dateButton: { flex: 1, minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  dateText: { color: colors.text, textAlign: 'center' },
  disabled: { opacity: 0.3 },
  scrim: { flex: 1, backgroundColor: colors.cameraScrim, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  calendarCard: { width: '100%', maxWidth: 420, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.md },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarTitle: { ...type.heading, color: colors.text },
  iconButton: { width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', marginTop: spacing.sm },
  weekLabel: { ...type.caption, color: colors.textMuted, width: `${100 / 7}%`, textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayButton: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.primary },
  dayText: { ...type.bodyStrong, color: colors.text },
  dayTextSelected: { color: colors.onPrimary },
});
