import Svg, { Line, Rect } from 'react-native-svg';

import { colors } from '../../theme/tokens';

interface PillIconProps {
  size?: number;
  color?: string;
}

export function PillIcon({ size = 24, color = colors.iconFillCream }: PillIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={8} y={3} width={8} height={18} rx={4} stroke={color} strokeWidth={2} />
      <Line x1={8} y1={12} x2={16} y2={12} stroke={color} strokeWidth={2} />
    </Svg>
  );
}
