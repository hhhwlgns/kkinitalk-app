import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Meal, MealSlot } from '../../domain/types';
import { colors, minTouchTarget, radius, spacing, type, typeElder } from '../../theme/tokens';
import { CameraIcon } from '../icons/CameraIcon';

const SLOTS: { slot: Exclude<MealSlot, 'snack'>; label: string }[] = [
  { slot: 'breakfast', label: '아침' },
  { slot: 'lunch', label: '점심' },
  { slot: 'dinner', label: '저녁' },
];

export function MealPhotoGrid({ meals, onMealPress, onAddPress, elder = false }: {
  meals: Meal[];
  onMealPress: (meal: Meal) => void;
  onAddPress: (slot: Exclude<MealSlot, 'snack'>) => void;
  elder?: boolean;
}) {
  const scale = elder ? typeElder : type;
  return (
    <View style={styles.grid}>
      {SLOTS.map(({ slot, label }) => {
        const meal = [...meals]
          .filter((item) => item.slot === slot)
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
        return (
          <Pressable
            key={slot}
            onPress={() => meal ? onMealPress(meal) : onAddPress(slot)}
            accessibilityRole="button"
            accessibilityLabel={meal ? `${label} 식사 상세 보기` : `${label} 식사 사진 찍기`}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            {meal?.photoUri ? (
              <Image source={{ uri: meal.photoUri }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.placeholder]}>
                <CameraIcon size={25} color={meal ? colors.primary : colors.textFaint} />
              </View>
            )}
            <Text style={[styles.slot, scale.callout]}>{label}</Text>
            <Text numberOfLines={1} style={styles.foodName}>
              {meal ? meal.foods.map((food) => food.name).slice(0, 2).join(', ') || '분석 완료' : '사진 찍기'}
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
  pressed: { opacity: 0.72 },
  photo: { width: '100%', aspectRatio: 1.05 },
  placeholder: { backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  slot: { color: colors.text, paddingHorizontal: spacing.xs, marginTop: spacing.xs },
  foodName: { ...type.caption, color: colors.textMuted, paddingHorizontal: spacing.xs, paddingBottom: spacing.sm, marginTop: 2 },
});
