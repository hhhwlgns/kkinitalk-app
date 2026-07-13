import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme/tokens';

interface CheckIconProps {
  size?: number;
  color?: string;
}

export function CheckIcon({ size = 16, color = colors.surface }: CheckIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
