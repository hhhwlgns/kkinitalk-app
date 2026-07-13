import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { animationTiming, colors, fontFamily, shadow } from '../../theme/tokens';

// Matches the design's mic-orb dimension exactly (108x108).
const CIRCLE_SIZE = 108;

function usePulseAnim(delayMs: number) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: animationTiming.pulseDurationMs,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
      loop.start();
    }, delayMs);
    return () => {
      clearTimeout(timer);
      loop?.stop();
    };
  }, [anim, delayMs]);

  return anim;
}

function useBlinkAnim() {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const half = animationTiming.blinkDurationMs / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.25, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return anim;
}

function PulseCircle({ delayMs }: { delayMs: number }) {
  const anim = usePulseAnim(delayMs);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.85] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  return <Animated.View style={[styles.pulseCircle, { opacity, transform: [{ scale }] }]} />;
}

export function VoiceListeningIndicator() {
  const blink = useBlinkAnim();

  return (
    <View style={styles.wrap}>
      <View style={styles.circleStack}>
        <PulseCircle delayMs={0} />
        <PulseCircle delayMs={600} />
        <View style={styles.micCircle}>
          <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
            <Rect x={9} y={3} width={6} height={11} rx={3} fill={colors.iconFillCream} />
            <Path
              d="M5.5 11a6.5 6.5 0 0 0 13 0"
              stroke={colors.iconFillCream}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
            />
            <Line x1={12} y1={17.5} x2={12} y2={21} stroke={colors.iconFillCream} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </View>
      </View>
      <Animated.Text style={[styles.label, { opacity: blink }]}>듣고 있어요</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  circleStack: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.primary,
  },
  micCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.micOrb,
  },
  label: {
    marginTop: 18,
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    letterSpacing: 2,
  },
});
