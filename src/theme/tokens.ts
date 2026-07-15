export const colors = {
  background: '#F5EEE2',
  backgroundGradientEnd: '#FDF8EF',
  surface: '#FFFFFF',
  // Sunken surface for insets/sub-panels — gives cards internal hierarchy
  // instead of every block being a floating white card.
  surfaceSunken: '#F3ECDF',
  cardSubBg: '#F7F1E6',

  text: '#2E251C',
  textMuted: '#7C6E5E',
  textFaint: '#A99A86',

  primary: '#E15B26',
  primaryPressed: '#C74A17',
  onPrimary: '#FFFFFF',
  iconFillCream: '#FFF6EC',
  primaryHoverBg: '#FBEADE',
  primarySoft: '#F7E4D5',
  primaryTranslucent: 'rgba(255,255,255,0.18)',

  secondaryAccent: '#A54A08',
  secondaryAccentHover: '#8C3F06',
  linkHover: '#8C3F06',

  neutralFill: '#EBE1D0',
  border: '#E4D8C6',
  borderStrong: '#D4C4AC',
  dividerLight: '#EFE7D9',
  photoStripe: '#F1E9DB',

  good: '#2E7D5B',
  goodBg: '#EAF4EE',
  goodBorder: '#BFDCCB',
  goodBgAlt: '#E3F0E9',
  goodBorderAlt: '#CBE3D6',

  danger: '#B03A21',
  dangerBg: '#FDEBE6',
  dangerBorder: '#EFB4A3',
  caution: '#B4540A',
  cautionBg: '#FDF0E2',
  cautionBorder: '#EFCB9E',

  calendarSun: '#C0453A',
  calendarSat: '#4A6FA5',
  calendarDisabled: '#DCD2C0',
  avatarInitial: '#A6947C',

  chartMedium: '#E8A462',
  chartLow: '#D8C9AF',
  dotInactive: '#E7DCCB',

  cameraDark: '#17130E',
  cameraDark2: '#221C14',
  cameraStripe: '#2A2318',
  cameraScrim: 'rgba(23,19,14,0.88)',
  cameraBorderFaint: 'rgba(255,246,236,0.35)',
  cameraTextFaint: 'rgba(255,246,236,0.7)',
  cameraHint: '#8C7E68',

  primaryRingTrack: 'rgba(232,98,44,0.25)',

  profileHighlightBorder: '#F5D9C4',
  nextMedBg: '#FFF3E9',
};

export const fontFamily = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extrabold: 'Pretendard-ExtraBold',
};

export const fontSize = {
  meta: 13,
  small: 15,
  body: 17,
  label: 19,
  question: 25,
  sectionHeader: 31,
  hero: 44,
};

export const fontSizeCompact = {
  small: 14,
  body: 16,
  label: 18,
  sectionHeader: 26,
};

// Coherent type scale: size + lineHeight + weight bundled so screens don't
// hand-pick mismatched numbers. Use `type.*` for new/redesigned screens.
export const type = {
  display: { fontSize: 34, lineHeight: 42, fontFamily: fontFamily.extrabold, letterSpacing: -0.6 },
  title: { fontSize: 27, lineHeight: 36, fontFamily: fontFamily.extrabold, letterSpacing: -0.4 },
  heading: { fontSize: 21, lineHeight: 29, fontFamily: fontFamily.bold, letterSpacing: -0.2 },
  subheading: { fontSize: 18, lineHeight: 26, fontFamily: fontFamily.bold, letterSpacing: -0.1 },
  body: { fontSize: 16, lineHeight: 25, fontFamily: fontFamily.medium, letterSpacing: 0 },
  bodyStrong: { fontSize: 16, lineHeight: 25, fontFamily: fontFamily.bold, letterSpacing: 0 },
  callout: { fontSize: 15, lineHeight: 22, fontFamily: fontFamily.semibold, letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.medium, letterSpacing: 0.1 },
  overline: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.bold, letterSpacing: 0.4 },
} as const;

// Elder-facing type scale — larger minimums for the elderly role's primary flows.
export const typeElder = {
  display: { fontSize: 40, lineHeight: 50, fontFamily: fontFamily.extrabold, letterSpacing: -0.6 },
  title: { fontSize: 30, lineHeight: 40, fontFamily: fontFamily.extrabold, letterSpacing: -0.4 },
  heading: { fontSize: 24, lineHeight: 33, fontFamily: fontFamily.extrabold, letterSpacing: -0.2 },
  subheading: { fontSize: 20, lineHeight: 29, fontFamily: fontFamily.bold, letterSpacing: -0.1 },
  body: { fontSize: 18, lineHeight: 28, fontFamily: fontFamily.medium, letterSpacing: 0 },
  bodyStrong: { fontSize: 18, lineHeight: 28, fontFamily: fontFamily.bold, letterSpacing: 0 },
  callout: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.semibold, letterSpacing: 0 },
  caption: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.medium, letterSpacing: 0.1 },
} as const;

// 4pt grid. Existing keys kept; values snapped to the grid so every screen
// shares one rhythm instead of ad-hoc 8/12/20/28/40 jumps.
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
};

export const radius = {
  sm: 12,
  smd: 14,
  md: 18,
  lg: 22,
  xl: 24,
  pill: 999,
};

export const shadow = {
  // Subtle resting elevation for standard cards — pairs with a hairline border
  // so cards read as grouped panels, not a pile of floating white boxes.
  card: {
    shadowColor: '#2E251C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  // Slightly raised — for the one focal card on a screen.
  raised: {
    shadowColor: '#2E251C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cta: {
    shadowColor: '#E15B26',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 5,
  },
  micOrb: {
    shadowColor: '#E15B26',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const animationTiming = {
  pulseDurationMs: 1800,
  spinDurationMs: 900,
  blinkDurationMs: 1600,
};

// Status → color set. Keyed by the domain's NutrientStatus so any screen can
// turn a good/caution/danger verdict into fg/bg/border/track colors uniformly.
export const statusColor = {
  good: { fg: colors.good, bg: colors.goodBg, border: colors.goodBorder, track: colors.goodBgAlt },
  caution: { fg: colors.caution, bg: colors.cautionBg, border: colors.cautionBorder, track: '#F6E4CB' },
  danger: { fg: colors.danger, bg: colors.dangerBg, border: colors.dangerBorder, track: '#F7D6CC' },
} as const;

export const minTouchTarget = 56;
