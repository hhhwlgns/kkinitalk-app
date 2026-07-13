import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fontFamily, radius, spacing, type as typeScale } from '../../theme/tokens';

type StatTone = 'default' | 'caution' | 'danger';

interface StatTileProps {
  label: string;
  value: string;
  tone?: StatTone;
  emphasis?: boolean;
  style?: ViewStyle;
}

const VALUE_COLOR: Record<StatTone, string> = {
  default: colors.text,
  caution: colors.caution,
  danger: colors.danger,
};

const BG_COLOR: Record<StatTone, string> = {
  default: colors.surfaceSunken,
  caution: colors.cautionBg,
  danger: colors.dangerBg,
};

/** One nutrient/metric tile. Used in 3-up rows on home, history, guardian. */
export function StatTile({ label, value, tone = 'default', emphasis = false, style }: StatTileProps) {
  return (
    <View style={[styles.tile, { backgroundColor: BG_COLOR[tone] }, style]}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.value, emphasis && styles.valueLarge, { color: VALUE_COLOR[tone] }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    ...typeScale.caption,
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
  },
  value: {
    ...typeScale.heading,
    color: colors.text,
  },
  valueLarge: {
    ...typeScale.title,
  },
});
