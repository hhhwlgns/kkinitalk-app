import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../theme/tokens';

interface MascotLogoProps {
  size?: number;
}

export function MascotLogo({ size = 54 }: MascotLogoProps) {
  const shadowRadius = size >= 100 ? 20 : 10;
  const shadowOffset = size >= 100 ? 10 : 5;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          shadowOffset: { width: 0, height: shadowOffset },
          shadowRadius,
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Rect x={3} y={6} width={42} height={32} rx={15} fill={colors.primary} />
        <Path d="M13 36l-3.5 9.5 12-8z" fill={colors.primary} />
        <Circle cx={17.5} cy={19.5} r={3} fill={colors.iconFillCream} />
        <Circle cx={30.5} cy={19.5} r={3} fill={colors.iconFillCream} />
        <Path
          d="M17.5 26.5c3 3.4 10 3.4 13 0"
          stroke={colors.iconFillCream}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    elevation: 6,
  },
});
