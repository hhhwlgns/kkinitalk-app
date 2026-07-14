import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fontFamily, radius, statusColor } from '../../theme/tokens';
import type { NutrientStatus } from '../../domain/nutrientStatus';

interface StatusPillProps {
  status: NutrientStatus;
  label: string;
  size?: 'sm' | 'md';
}

// Tiny status glyph: check for good, "!" for caution, "×"-ish for danger.
function StatusGlyph({ status, color, size }: { status: NutrientStatus; color: string; size: number }) {
  if (status === 'good') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  // caution + danger share the exclamation mark; color conveys severity.
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 6v8" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Path d="M12 18.2v.05" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Status chip with a leading glyph. Color + icon together signal severity at a glance. */
export function StatusPill({ status, label, size = 'md' }: StatusPillProps) {
  const palette = statusColor[status];
  const glyphSize = size === 'sm' ? 13 : 15;
  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <StatusGlyph status={status} color={palette.fg} size={glyphSize} />
      <Text style={[styles.label, size === 'sm' ? styles.labelSm : styles.labelMd, { color: palette.fg }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 5,
  },
  sm: { paddingVertical: 4, paddingHorizontal: 10 },
  md: { paddingVertical: 6, paddingHorizontal: 12 },
  label: { fontFamily: fontFamily.extrabold, color: colors.text },
  labelSm: { fontSize: 12, letterSpacing: 0.2 },
  labelMd: { fontSize: 13, letterSpacing: 0.2 },
});
