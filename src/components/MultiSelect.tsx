import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme/tokens';

export function toggleOption(list: string[], option: string): string[] {
  if (option === '없음') {
    return list.includes('없음') ? [] : ['없음'];
  }
  const withoutNone = list.filter((item) => item !== '없음');
  return withoutNone.includes(option)
    ? withoutNone.filter((item) => item !== option)
    : [...withoutNone, option];
}

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}

export function MultiSelect({ options, selected, onToggle }: MultiSelectProps) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <Pressable
            key={option}
            onPress={() => onToggle(option)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryHoverBg,
  },
  chipText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
  },
});
