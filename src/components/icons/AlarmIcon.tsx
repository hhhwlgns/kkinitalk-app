import Svg, { Line, Path, Rect } from 'react-native-svg';

import { colors } from '../../theme/tokens';

interface AlarmIconProps {
  size?: number;
  color?: string;
}

export function AlarmIcon({ size = 22, color = colors.primary }: AlarmIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} fill={color} />
      <Path d="M5.5 11a6.5 6.5 0 0 0 13 0" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Line x1={12} y1={17.5} x2={12} y2={21} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
