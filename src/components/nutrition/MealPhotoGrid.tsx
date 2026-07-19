import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Meal, MealSlot } from '../../domain/types';
import { colors, minTouchTarget, radius, spacing, type, typeElder } from '../../theme/tokens';
import { CameraIcon } from '../icons/CameraIcon';

const SLOTS: { slot: Exclude<MealSlot, 'snack'>; label: string }[] = [
  { slot: 'breakfast', label: '아침' },
  { slot: 'lunch', label: '점심' },
  { slot: 'dinner', label: '저녁' },
];

export function MealPhotoGrid({ meals, onMealPress, onAddPress, elder = false, recordableSlot = null }: {
  meals: Meal[];
  onMealPress: (meal: Meal) => void;
  onAddPress: (slot: Exclude<MealSlot, 'snack'>) => void;
  elder?: boolean;
  recordableSlot?: Exclude<MealSlot, 'snack'> | null;
}) {
  const scale = elder ? typeElder : type;
  return (
    <View style={styles.grid}>
      {SLOTS.map(({ slot, label }, slotIndex) => {
        const meal = [...meals]
          .filter((item) => item.slot === slot)
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
        const canRecord = !meal && recordableSlot === slot;
        const recordableIndex = recordableSlot ? SLOTS.findIndex((item) => item.slot === recordableSlot) : -1;
        const emptyLabel = recordableIndex < 0 || slotIndex < recordableIndex ? '기록 없음' : '식사 예정';
        return (
          <Pressable
            key={slot}
            onPress={() => meal ? onMealPress(meal) : canRecord ? onAddPress(slot) : undefined}
            disabled={!meal && !canRecord}
            accessibilityRole="button"
            accessibilityLabel={meal ? `${label} 식사 상세 보기` : canRecord ? `${label} 식사 사진 찍기` : `${label} ${emptyLabel}`}
            style={({ pressed }) => [styles.tile, canRecord && styles.emptyTile, !meal && !canRecord && styles.inactiveTile, pressed && styles.pressed]}
          >
            {meal?.photoUri ? (
              <Image source={{ uri: meal.photoUri }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.placeholder, canRecord && styles.emptyPlaceholder]}>
                {canRecord ? <><View style={styles.cameraCircle}><CameraIcon size={28} color={colors.primary} /></View><Text style={[styles.addLabel, scale.caption]}>눌러서 기록</Text></> : <View style={styles.inactiveIcon}><Text style={styles.inactiveIconText}>—</Text></View>}
              </View>
            )}
            <Text style={[styles.slot, scale.callout]}>{label}</Text>
            <Text numberOfLines={1} style={styles.foodName}>
              {meal ? meal.foods.map((food) => food.name).slice(0, 2).join(', ') || '분석 완료' : canRecord ? '사진 찍기' : emptyLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: spacing.xs },
  tile: { flex: 1, minHeight: minTouchTarget * 2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  emptyTile: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary },
  inactiveTile: { opacity: 0.7 },
  pressed: { opacity: 0.72 },
  photo: { width: '100%', aspectRatio: 1.05 },
  placeholder: { backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  emptyPlaceholder: { backgroundColor: colors.primaryHoverBg },
  cameraCircle: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  inactiveIcon: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, inactiveIconText: { ...type.heading, color: colors.textFaint },
  addLabel: { color: colors.primary },
  slot: { color: colors.text, paddingHorizontal: spacing.xs, marginTop: spacing.xs },
  foodName: { ...type.caption, color: colors.textMuted, paddingHorizontal: spacing.xs, paddingBottom: spacing.sm, marginTop: 2 },
});
