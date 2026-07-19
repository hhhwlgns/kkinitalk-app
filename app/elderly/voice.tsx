import { useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DisclaimerBanner } from '../../src/components/DisclaimerBanner';
import { colors, minTouchTarget, radius, shadow, spacing, typeElder } from '../../src/theme/tokens';

type Message = { id: string; role: 'assistant' | 'user'; text: string; action?: 'camera' | 'medication' };

const SUGGESTIONS = ['오늘 저녁 뭐 먹을까?', '아침약 먹었는지 알려줘', '씹기 편한 반찬 추천해줘'];

function answerFor(text: string): Omit<Message, 'id' | 'role'> {
  if (text.includes('약')) return { text: '오늘 복약 기록을 같이 확인해볼게요. 아직 남은 약이 있다면 복약 화면에서 시간대별로 볼 수 있어요.', action: 'medication' };
  if (text.includes('사진') || text.includes('찍')) return { text: '좋아요. 식사 사진을 찍으면 음식과 영양 균형을 살펴보고 다음 메뉴까지 이어서 알려드릴게요.', action: 'camera' };
  if (text.includes('씹') || text.includes('부드')) return { text: '씹기 편하면서 단백질도 챙길 수 있는 순두부 달걀찜이 좋아요. 국물은 많이 드시지 않고, 부드러운 나물을 곁들여보실까요?' };
  return { text: '오늘 기록을 보면 다음 끼니에는 단백질 반찬과 채소를 함께 드시면 좋아요. 두부구이와 부드러운 나물은 어떠세요?' };
}

export default function ElderlyVoiceScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: '안녕하세요. 오늘 식사와 약에 대해 무엇이든 편하게 물어보세요.' },
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const canSend = useMemo(() => input.trim().length > 0, [input]);

  function send(text: string) {
    const value = text.trim();
    if (!value) return;
    const stamp = Date.now();
    const answer = answerFor(value);
    setMessages((current) => [
      ...current,
      { id: `user-${stamp}`, role: 'user', text: value },
      { id: `ai-${stamp}`, role: 'assistant', ...answer },
    ]);
    setInput('');
    setListening(false);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  function toggleListening() {
    setListening((value) => !value);
    if (!listening) setInput('오늘 저녁 뭐 먹을까?');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.aiAvatar}><Ionicons name="sparkles" size={23} color={colors.onPrimary} /></View>
          <View style={styles.flex1}><Text style={styles.title}>끼니톡 AI</Text><Text style={styles.online}>오늘 기록을 함께 보고 있어요</Text></View>
          <Pressable onPress={() => router.push('/elderly/profile')} style={styles.headerButton}><Ionicons name="ellipsis-horizontal" size={26} color={colors.text} /></Pressable>
        </View>

        <ScrollView ref={scrollRef} style={styles.flex1} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
          <View style={styles.contextCard}>
            <Ionicons name="restaurant-outline" size={22} color={colors.primary} />
            <View style={styles.flex1}><Text style={styles.contextTitle}>오늘 식사 기록을 반영해 답해드려요</Text><Text style={styles.contextText}>식사 2끼 · 복약 기록 확인 가능</Text></View>
          </View>
          {messages.map((message) => (
            <View key={message.id} style={[styles.messageRow, message.role === 'user' && styles.userRow]}>
              {message.role === 'assistant' && <View style={styles.smallAvatar}><Ionicons name="sparkles" size={17} color={colors.primary} /></View>}
              <View style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.messageText, message.role === 'user' && styles.userText]}>{message.text}</Text>
                {message.action && (
                  <Pressable onPress={() => router.push(message.action === 'camera' ? '/elderly/camera' : '/elderly/medications')} style={styles.actionButton}>
                    <Text style={styles.actionText}>{message.action === 'camera' ? '식사 사진 찍기' : '복약 기록 보기'}</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                  </Pressable>
                )}
                {message.role === 'assistant' && <Pressable style={styles.speakButton} accessibilityLabel="답변 소리로 듣기"><Ionicons name="volume-medium" size={21} color={colors.textMuted} /><Text style={styles.speakText}>답변 듣기</Text></Pressable>}
              </View>
            </View>
          ))}
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((suggestion) => <Pressable key={suggestion} onPress={() => send(suggestion)} style={styles.suggestion}><Text style={styles.suggestionText}>{suggestion}</Text></Pressable>)}
          </View>
          <DisclaimerBanner variant="general" />
        </ScrollView>

        {listening && <View style={styles.listeningBanner}><View style={styles.listeningDot} /><Text style={styles.listeningText}>듣고 있어요. 말씀을 마치고 전송을 눌러주세요.</Text></View>}
        <View style={styles.composer}>
          <Pressable onPress={() => router.push('/elderly/camera')} style={styles.attachButton} accessibilityLabel="식사 사진 첨부"><Ionicons name="add" size={28} color={colors.primary} /></Pressable>
          <View style={[styles.inputWrap, listening && styles.inputListening]}>
            <TextInput value={input} onChangeText={setInput} onSubmitEditing={() => send(input)} placeholder="메시지를 입력하거나 말해보세요" placeholderTextColor={colors.textFaint} style={styles.input} multiline />
            <Pressable onPress={toggleListening} style={styles.micButton} accessibilityLabel={listening ? '음성 입력 멈추기' : '음성으로 질문하기'}><Ionicons name={listening ? 'stop-circle' : 'mic'} size={28} color={listening ? colors.danger : colors.primary} /></Pressable>
          </View>
          <Pressable onPress={() => send(input)} disabled={!canSend} style={[styles.sendButton, !canSend && styles.sendDisabled]} accessibilityLabel="메시지 보내기"><Ionicons name="arrow-up" size={25} color={colors.onPrimary} /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, flex1: { flex: 1 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.dividerLight, backgroundColor: colors.surface },
  aiAvatar: { width: 46, height: 46, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  smallAvatar: { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  title: { ...typeElder.subheading, color: colors.text }, online: { ...typeElder.caption, color: colors.good }, headerButton: { width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  messages: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  contextCard: { flexDirection: 'row', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.primarySoft }, contextTitle: { ...typeElder.callout, color: colors.text }, contextText: { ...typeElder.caption, color: colors.textMuted, marginTop: 2 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }, userRow: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '84%', padding: spacing.md }, aiBubble: { borderRadius: radius.lg, borderTopLeftRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadow.card }, userBubble: { borderRadius: radius.lg, borderTopRightRadius: radius.sm, backgroundColor: colors.primary },
  messageText: { ...typeElder.body, color: colors.text }, userText: { color: colors.onPrimary },
  actionButton: { minHeight: minTouchTarget, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.dividerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, actionText: { ...typeElder.callout, color: colors.primary },
  speakButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.sm }, speakText: { ...typeElder.caption, color: colors.textMuted },
  suggestions: { gap: spacing.xs, alignItems: 'flex-start' }, suggestion: { minHeight: 48, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: spacing.md }, suggestionText: { ...typeElder.callout, color: colors.text },
  listeningBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.dangerBg }, listeningDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.danger }, listeningText: { ...typeElder.caption, color: colors.danger, flex: 1 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.dividerLight, backgroundColor: colors.surface }, attachButton: { width: minTouchTarget, height: minTouchTarget, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { minHeight: minTouchTarget, maxHeight: 120, flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: radius.lg, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.border, paddingLeft: spacing.md }, inputListening: { borderColor: colors.danger }, input: { ...typeElder.body, color: colors.text, flex: 1, paddingVertical: spacing.sm }, micButton: { width: 48, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  sendButton: { width: minTouchTarget, height: minTouchTarget, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, sendDisabled: { backgroundColor: colors.textFaint },
});
