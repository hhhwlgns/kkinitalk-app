import Svg, { Line, Rect } from 'react-native-svg';

import { colors } from '../../theme/tokens';

interface PillIconProps {
  size?: number;
  color?: string;
}

export function PillIcon({ size = 24, color = colors.iconFillCream }: PillIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={8} width={14} height={8} rx={4} stroke={color} strokeWidth={2} transform="rotate(-45 12 12)" />
      <Line x1={12} y1={8} x2={12} y2={16} stroke={color} strokeWidth={2} transform="rotate(-45 12 12)" />
    </Svg>
  );
}
