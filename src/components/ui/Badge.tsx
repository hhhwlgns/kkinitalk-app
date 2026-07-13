import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius } from '../../theme/tokens';

export type BadgeTone = 'good' | 'caution' | 'danger' | 'neutral' | 'brand';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
}

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  good: { bg: colors.goodBg, fg: colors.good },
  caution: { bg: colors.cautionBg, fg: colors.caution },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  neutral: { bg: colors.surfaceSunken, fg: colors.textMuted },
  brand: { bg: colors.primarySoft, fg: colors.secondaryAccent },
};

/** Compact status pill. Color carries meaning — reserve `brand` for emphasis, not decoration. */
export function Badge({ label, tone = 'neutral', size = 'md' }: BadgeProps) {
  const palette = TONES[tone];
  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: palette.bg },
      ]}
    >
      <Text style={[styles.label, size === 'sm' ? styles.labelSm : styles.labelMd, { color: palette.fg }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  sm: { paddingVertical: 4, paddingHorizontal: 10 },
  md: { paddingVertical: 6, paddingHorizontal: 13 },
  label: { fontFamily: fontFamily.extrabold, includeFontPadding: false },
  labelSm: { fontSize: 12, letterSpacing: 0.2 },
  labelMd: { fontSize: 13, letterSpacing: 0.2 },
});
