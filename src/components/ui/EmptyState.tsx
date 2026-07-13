import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type as typeScale } from '../../theme/tokens';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  compact?: boolean;
}

/** Replaces bare gray placeholders. A dashed panel with a clear message, not an empty box. */
export function EmptyState({ icon, title, description, compact = false }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  wrapCompact: {
    paddingVertical: spacing.lg,
  },
  icon: { marginBottom: spacing.xxs, opacity: 0.9 },
  title: {
    ...typeScale.bodyStrong,
    color: colors.textMuted,
    textAlign: 'center',
  },
  description: {
    ...typeScale.callout,
    color: colors.textFaint,
    textAlign: 'center',
  },
});
