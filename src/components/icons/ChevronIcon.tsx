import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme/tokens';

interface ChevronIconProps {
  size?: number;
  color?: string;
}

// Design's chevron glyph is not square (viewBox 8x14) — size scales the height, width follows the same aspect ratio.
export function ChevronIcon({ size = 14, color = colors.primary }: ChevronIconProps) {
  const width = (size * 8) / 14;
  return (
    <Svg width={width} height={size} viewBox="0 0 8 14" fill="none">
      <Path d="M1 1l6 6-6 6" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
