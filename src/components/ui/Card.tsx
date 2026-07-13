import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '../../theme/tokens';

type CardTone = 'default' | 'sunken' | 'flat';

interface CardProps {
  children: ReactNode;
  tone?: CardTone;
  // `raised` reserves the stronger shadow for the single focal card on a screen.
  raised?: boolean;
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/**
 * The one card primitive every screen shares. A hairline border + a whisper of
 * shadow reads as a grouped panel — not another floating white box. Use `sunken`
 * for sub-panels inside a card, `flat` for bordered blocks with no elevation.
 */
export function Card({ children, tone = 'default', raised = false, padded = true, style }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        tone === 'default' && styles.default,
        tone === 'sunken' && styles.sunken,
        tone === 'flat' && styles.flat,
        raised && tone === 'default' && shadow.raised,
        style as ViewStyle,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  padded: {
    padding: spacing.md,
  },
  default: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    ...shadow.card,
  },
  sunken: {
    backgroundColor: colors.surfaceSunken,
    borderColor: 'transparent',
  },
  flat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
});
