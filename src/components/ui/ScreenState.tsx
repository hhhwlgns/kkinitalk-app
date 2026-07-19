import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, minTouchTarget, radius, spacing, type } from '../../theme/tokens';

export function ScreenState({ kind, title, description, actionLabel, onAction, icon }: {
  kind: 'loading' | 'error' | 'empty';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      {kind === 'loading' ? <ActivityIndicator size="large" color={colors.primary} /> : icon ? <View style={styles.icon}>{icon}</View> : <View style={[styles.dot, kind === 'error' && styles.dotError]} />}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && <Pressable onPress={onAction} style={styles.button}><Text style={styles.buttonText}>{actionLabel}</Text></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  icon: { marginBottom: spacing.xxs }, dot: { width: 18, height: 18, borderRadius: radius.pill, backgroundColor: colors.caution }, dotError: { backgroundColor: colors.danger },
  title: { ...type.heading, color: colors.text, textAlign: 'center' }, description: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  button: { minHeight: minTouchTarget, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.xs }, buttonText: { ...type.callout, color: colors.onPrimary },
});
