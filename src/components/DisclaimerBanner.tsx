import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, spacing } from '../theme/tokens';

type DisclaimerVariant = 'general' | 'emergency' | 'medication';

const MESSAGES: Record<DisclaimerVariant, string> = {
  general: '이 서비스는 의료행위가 아닙니다. 모든 추천과 경고는 참고용입니다.',
  emergency: '호흡곤란, 의식 저하 등 응급 상황이 의심되면 즉시 119에 먼저 연락하세요.',
  medication: '경고만으로 복약을 중단하거나 임의로 변경하지 마세요. 의료진/약사와 상담하세요.',
};

export function DisclaimerBanner({ variant = 'general' }: { variant?: DisclaimerVariant }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{MESSAGES[variant]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    marginVertical: spacing.xs,
  },
  text: {
    fontSize: fontSize.meta,
    fontFamily: fontFamily.regular,
    color: colors.textFaint,
    textAlign: 'center',
  },
});
