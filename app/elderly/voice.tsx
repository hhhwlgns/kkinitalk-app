import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DisclaimerBanner } from '../../src/components/DisclaimerBanner';
import { colors, minTouchTarget, radius, shadow, spacing, typeElder } from '../../src/theme/tokens';

const QUESTIONS = [
  { label: '오늘 뭐 먹으면 좋아?', answer: '오늘은 단백질을 보충할 수 있는 생선이나 두부 반찬이 좋아요.' },
  { label: '아침약 먹었는지 알려줘', answer: '복약 화면에서 오늘 드신 약을 함께 확인해볼게요.' },
  { label: '식사 사진 찍을래', answer: '좋아요. 카메라를 열어드릴게요.' },
];

export default function ElderlyVoiceScreen() {
  const [listening, setListening] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState('궁금한 것을 말씀해 주세요. 식사와 약을 함께 챙겨드릴게요.');

  function selectQuestion(label: string, nextAnswer: string) {
    setQuestion(label);
    setAnswer(nextAnswer);
    if (label.includes('사진')) router.push('/elderly/camera');
    if (label.includes('아침약')) router.push('/elderly/medications');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.eyebrow}>끼니톡 AI</Text>
          <Text style={styles.title}>무엇을 도와드릴까요?</Text>
          <Text style={styles.subtitle}>말로 물어보시면 천천히 알려드릴게요.</Text>
        </View>

        <View style={styles.conversation}>
          {question && <View style={styles.userBubble}><Text style={styles.userText}>{question}</Text></View>}
          <View style={styles.aiBubble}>
            <View style={styles.aiLabelRow}><Ionicons name="sparkles" size={20} color={colors.primary} /><Text style={styles.aiLabel}>끼니톡 답변</Text></View>
            <Text style={styles.aiText}>{answer}</Text>
          </View>
        </View>

        <View style={styles.questionList}>
          <Text style={styles.questionTitle}>이렇게 물어보세요</Text>
          {QUESTIONS.map((item) => (
            <Pressable key={item.label} onPress={() => selectQuestion(item.label, item.answer)} style={({ pressed }) => [styles.questionButton, pressed && styles.pressed]}>
              <Text style={styles.questionText}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            </Pressable>
          ))}
        </View>

        <View style={styles.micArea}>
          <Pressable
            onPress={() => {
              setListening((value) => !value);
              if (!listening) setAnswer('듣고 있어요. 편하게 말씀해 주세요.');
            }}
            accessibilityRole="button"
            accessibilityLabel={listening ? '음성 듣기 멈추기' : '음성으로 질문하기'}
            style={[styles.micButton, listening && styles.micButtonListening]}
          >
            <Ionicons name={listening ? 'stop' : 'mic'} size={38} color={colors.onPrimary} />
          </Pressable>
          <Text style={styles.micHint}>{listening ? '듣고 있어요…' : '누르고 말씀하세요'}</Text>
        </View>

        <DisclaimerBanner variant="general" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  eyebrow: { ...typeElder.callout, color: colors.primary },
  title: { ...typeElder.title, color: colors.text, marginTop: spacing.xxs },
  subtitle: { ...typeElder.body, color: colors.textMuted, marginTop: spacing.xs },
  conversation: { gap: spacing.sm },
  userBubble: { alignSelf: 'flex-end', maxWidth: '88%', borderRadius: radius.lg, borderBottomRightRadius: radius.sm, backgroundColor: colors.primary, padding: spacing.md },
  userText: { ...typeElder.body, color: colors.onPrimary },
  aiBubble: { borderRadius: radius.lg, borderBottomLeftRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadow.card },
  aiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  aiLabel: { ...typeElder.callout, color: colors.primary },
  aiText: { ...typeElder.body, color: colors.text, marginTop: spacing.sm },
  questionList: { gap: spacing.xs },
  questionTitle: { ...typeElder.subheading, color: colors.text, marginBottom: spacing.xs },
  questionButton: { minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  questionText: { ...typeElder.bodyStrong, color: colors.text, flex: 1 },
  pressed: { opacity: 0.72 },
  micArea: { alignItems: 'center', gap: spacing.sm },
  micButton: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.micOrb },
  micButtonListening: { backgroundColor: colors.danger },
  micHint: { ...typeElder.callout, color: colors.textMuted },
});
