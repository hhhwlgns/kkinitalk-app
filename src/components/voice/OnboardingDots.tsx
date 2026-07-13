import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme/tokens';

export function OnboardingDots({ total, step }: { total: number; step: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i <= step ? styles.dotActive : styles.dotInactive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 7 },
  dot: { width: 30, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: colors.primary },
  dotInactive: { backgroundColor: colors.border },
});
