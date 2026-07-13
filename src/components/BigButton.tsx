import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontFamily, fontSize, minTouchTarget, radius, shadow, spacing } from '../theme/tokens';

interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function BigButton({ label, onPress, variant = 'primary', disabled }: BigButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && !disabled && (isPrimary ? styles.primaryPressed : styles.secondaryPressed),
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget + 8,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  primary: {
    backgroundColor: colors.primary,
    ...shadow.cta,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryPressed: {
    backgroundColor: colors.primaryHoverBg,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.bold,
  },
  labelPrimary: {
    color: colors.onPrimary,
  },
  labelSecondary: {
    color: colors.primary,
  },
});
