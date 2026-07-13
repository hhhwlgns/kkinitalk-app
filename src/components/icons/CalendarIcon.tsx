import Svg, { Line, Rect } from 'react-native-svg';

import { colors } from '../../theme/tokens';

interface CalendarIconProps {
  size?: number;
  color?: string;
}

export function CalendarIcon({ size = 16, color = colors.text }: CalendarIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={16} rx={3} stroke={color} strokeWidth={2} />
      <Line x1={3} y1={10} x2={21} y2={10} stroke={color} strokeWidth={2} />
      <Line x1={8} y1={3} x2={8} y2={7} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={16} y1={3} x2={16} y2={7} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
