import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type as typeScale } from '../../theme/tokens';

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
}

/** Consistent section label above a group of content. Uppercase-ish overline weight. */
export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  title: {
    ...typeScale.overline,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
});
