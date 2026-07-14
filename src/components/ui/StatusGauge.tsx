import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, statusColor, type as typeScale } from '../../theme/tokens';
import type { NutrientStatus } from '../../domain/nutrientStatus';

interface StatusGaugeProps {
  label: string;
  value: string;
  pct: number; // 0-100 fill
  status: NutrientStatus;
  caption?: string;
}

/** A labeled progress bar whose fill + value color reflect the status. */
export function StatusGauge({ label, value, pct, status, caption }: StatusGaugeProps) {
  const palette = statusColor[status];
  return (
    <View>
      <View style={styles.top}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: palette.fg }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: palette.track }]}>
        <View style={[styles.fill, { width: `${Math.min(Math.max(pct, 3), 100)}%`, backgroundColor: palette.fg }]} />
      </View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { ...typeScale.bodyStrong, color: colors.text },
  value: { ...typeScale.bodyStrong, fontFamily: fontFamily.extrabold },
  track: { height: 10, borderRadius: radius.pill, marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  caption: { ...typeScale.caption, color: colors.textMuted, marginTop: 5 },
});
