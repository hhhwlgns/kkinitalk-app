import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { animationTiming, colors } from '../../theme/tokens';

export function AnalyzingSpinner() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: animationTiming.spinDurationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />;
}

const styles = StyleSheet.create({
  ring: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 5,
    borderColor: colors.primaryRingTrack,
    borderTopColor: colors.primary,
  },
});
