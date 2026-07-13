import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../../theme/tokens';

interface CameraIconProps {
  size?: number;
  color?: string;
}

export function CameraIcon({ size = 32, color = colors.onPrimary }: CameraIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2.5} y={6} width={19} height={14} rx={4} stroke={color} strokeWidth={2} />
      <Path d="M8.5 6l1.5-2.5h4L15.5 6" stroke={color} strokeWidth={2} strokeLinejoin="round" fill="none" />
      <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={2} />
    </Svg>
  );
}
