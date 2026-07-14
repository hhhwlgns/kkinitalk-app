import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, shadow } from '../../theme/tokens';
import { MascotLogo } from '../MascotLogo';

export function AiQuestionBubble({ question }: { question: string }) {
  return (
    <View style={styles.bubble}>
      <View style={styles.header}>
        <MascotLogo size={22} />
        <Text style={styles.headerLabel}>끼니 AI</Text>
      </View>
      <Text style={styles.question}>{question}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    marginTop: 34,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  question: {
    fontSize: 25,
    fontFamily: fontFamily.bold,
    lineHeight: 36,
    letterSpacing: -0.3,
    color: colors.text,
  },
});
