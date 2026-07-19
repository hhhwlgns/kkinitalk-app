import { useCallback, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DisclaimerBanner } from '../../src/components/DisclaimerBanner';
import { buildContextualNutritionBalanceInsight, DEFAULT_NUTRITION_GOAL, summarizeNutritionForDate } from '../../src/domain/dailyNutrition';
import { isoToLocalDate, todayDate } from '../../src/domain/date';
import type { Meal, MealOrder, MealProduct, Medication, MedicationLog, NutritionGoal } from '../../src/domain/types';
import { mealOrdersCollection, mealProductsCollection, mealsCollection, medicationLogsCollection, medicationsCollection, nutritionGoalsCollection } from '../../src/mocks/db/collections';
import { useRole } from '../../src/state/RoleContext';
import { colors, minTouchTarget, radius, shadow, spacing, typeElder } from '../../src/theme/tokens';

type Message = { id: string; role: 'assistant' | 'user'; text: string; action?: 'camera' | 'medication'; source?: string };
type ChatContext = { meals: Meal[]; medications: Medication[]; logs: MedicationLog[]; order: MealOrder | null; product: MealProduct | null; goal: NutritionGoal };

const SUGGESTIONS = ['오늘 뭐 먹었지?', '오늘 영양 균형 알려줘', '아침약 먹었는지 알려줘', '도시락 언제 와?'];

function answerFor(text: string, context: ChatContext | null): Omit<Message, 'id' | 'role'> {
  if (!context) return { text: '기록을 불러오는 중이에요. 잠시 후 다시 물어봐 주세요.' };
  const today = todayDate();
  const todayMeals = context.meals.filter((meal) => isoToLocalDate(meal.recordedAt) === today);
  const summary = summarizeNutritionForDate(context.meals, today, context.goal);
  const insight = buildContextualNutritionBalanceInsight(summary, context.goal, { now: new Date(), isToday: true });
  const foodNames = todayMeals.flatMap((meal) => meal.foods.map((food) => food.name));
  const takenIds = new Set(context.logs.map((log) => log.medicationId));
  const remaining = context.medications.filter((medication) => !takenIds.has(medication.id));
  if (text.includes('뭐 먹') || text.includes('무엇을 먹') || text.includes('먹었')) return {
    text: foodNames.length > 0 ? `오늘은 ${foodNames.slice(0, 5).join(', ')}을 드셨어요. ${todayMeals.length}끼가 기록되어 있어요.` : '오늘은 아직 기록된 식사가 없어요. 사진을 찍어주시면 함께 확인해드릴게요.',
    action: foodNames.length > 0 ? undefined : 'camera', source: `오늘 식사 ${todayMeals.length}끼 기록`,
  };
  if (text.includes('영양') || text.includes('단백질') || text.includes('균형')) return { text: `${insight.title} ${insight.description}`, source: insight.basisLabel ?? '오늘 영양 기록' };
  if (text.includes('약')) return { text: context.medications.length === 0 ? '등록된 복약 일정이 없어요.' : remaining.length === 0 ? '오늘 등록된 약은 모두 복용 기록이 있어요. 참 잘하셨어요.' : `오늘 ${context.medications.length}개 중 ${context.medications.length - remaining.length}개를 드셨어요. 아직 ${remaining.map((item) => item.name).slice(0, 2).join(', ')} 확인이 필요해요.`, action: 'medication', source: `오늘 복약 기록 ${context.logs.length}건` };
  if (text.includes('도시락') || text.includes('배송') || text.includes('보낸')) return { text: context.order && context.product ? `${context.product.name}이 ${context.order.deliveryDate.slice(5).replace('-', '월 ')}일에 도착할 예정이에요. 보호자가 보낸 식사예요.` : '현재 도착 예정인 보호자 식단은 없어요.', source: '보호자 식단 배송 기록' };
  if (text.includes('사진') || text.includes('찍')) return { text: '좋아요. 식사 사진을 찍으면 음식과 영양 균형을 살펴보고 다음 메뉴까지 이어서 알려드릴게요.', action: 'camera' };
  if (text.includes('씹') || text.includes('부드')) return { text: '씹기 편하면서 단백질도 챙길 수 있는 순두부 달걀찜이 좋아요. 국물은 많이 드시지 않고, 부드러운 나물을 곁들여보실까요?', source: '건강 프로필과 오늘 영양 기록' };
  return { text: `${insight.title} 다음 끼니에는 두부나 생선 같은 단백질 반찬과 채소를 함께 드셔보세요.`, source: insight.basisLabel ?? '오늘 영양 기록' };
}

export default function ElderlyVoiceScreen() {
  const { activeUserId } = useRole();
  const userId = activeUserId ?? 'elderly-self';
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: '안녕하세요. 오늘 식사와 약에 대해 무엇이든 편하게 물어보세요.' },
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const loadContext = useCallback(async () => {
    const [meals, medications, logs, orders, products, goals] = await Promise.all([
      mealsCollection.query((item) => item.userId === userId),
      medicationsCollection.query((item) => item.userId === userId && item.active !== false),
      medicationLogsCollection.query((item) => item.userId === userId && isoToLocalDate(item.takenAt) === todayDate() && item.status !== 'skipped'),
      mealOrdersCollection.query((item) => item.elderlyUserId === userId && item.status !== 'delivered'),
      mealProductsCollection.getAll(),
      nutritionGoalsCollection.query((item) => item.userId === userId),
    ]);
    const order = [...orders].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))[0] ?? null;
    setChatContext({ meals, medications, logs, order, product: order ? products.find((item) => item.id === order.productId) ?? null : null, goal: goals[0] ?? { id: userId, userId, ...DEFAULT_NUTRITION_GOAL, updatedAt: new Date().toISOString() } });
  }, [userId]);
  useFocusEffect(useCallback(() => { loadContext(); }, [loadContext]));

  function send(text: string) {
    const value = text.trim();
    if (!value) return;
    const stamp = Date.now();
    const answer = answerFor(value, chatContext);
    setThinking(true);
    setMessages((current) => [...current, { id: `user-${stamp}`, role: 'user', text: value }]);
    setInput('');
    setListening(false);
    setTimeout(() => {
      setMessages((current) => [...current, { id: `ai-${stamp}`, role: 'assistant', ...answer }]);
      setThinking(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }, 450);
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
            <View style={styles.flex1}><Text style={styles.contextTitle}>오늘 기록을 반영해 답해드려요</Text><Text style={styles.contextText}>{chatContext ? `식사 ${chatContext.meals.filter((meal) => isoToLocalDate(meal.recordedAt) === todayDate()).length}끼 · 복약 ${chatContext.logs.length}건` : '기록을 불러오는 중이에요'}</Text></View>
          </View>
          {messages.map((message) => (
            <View key={message.id} style={[styles.messageRow, message.role === 'user' && styles.userRow]}>
              {message.role === 'assistant' && <View style={styles.smallAvatar}><Ionicons name="sparkles" size={17} color={colors.primary} /></View>}
              <View style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.messageText, message.role === 'user' && styles.userText]}>{message.text}</Text>
                {message.source && <View style={styles.sourceRow}><Ionicons name="document-text-outline" size={17} color={colors.textMuted} /><Text style={styles.sourceText}>{message.source}</Text></View>}
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
          {thinking && <View style={styles.thinkingBubble}><View style={styles.thinkingDot} /><View style={styles.thinkingDot} /><View style={styles.thinkingDot} /><Text style={styles.thinkingText}>기록을 살펴보고 있어요</Text></View>}
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
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.dividerLight, paddingTop: spacing.xs }, sourceText: { ...typeElder.caption, color: colors.textMuted, flex: 1 },
  thinkingBubble: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.md }, thinkingDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.primary }, thinkingText: { ...typeElder.caption, color: colors.textMuted, marginLeft: spacing.xs },
  actionButton: { minHeight: minTouchTarget, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.dividerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, actionText: { ...typeElder.callout, color: colors.primary },
  speakButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.sm }, speakText: { ...typeElder.caption, color: colors.textMuted },
  suggestions: { gap: spacing.xs, alignItems: 'flex-start' }, suggestion: { minHeight: 48, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: spacing.md }, suggestionText: { ...typeElder.callout, color: colors.text },
  listeningBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.dangerBg }, listeningDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.danger }, listeningText: { ...typeElder.caption, color: colors.danger, flex: 1 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.dividerLight, backgroundColor: colors.surface }, attachButton: { width: minTouchTarget, height: minTouchTarget, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { minHeight: minTouchTarget, maxHeight: 120, flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: radius.lg, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.border, paddingLeft: spacing.md }, inputListening: { borderColor: colors.danger }, input: { ...typeElder.body, color: colors.text, flex: 1, paddingVertical: spacing.sm }, micButton: { width: 48, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  sendButton: { width: minTouchTarget, height: minTouchTarget, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, sendDisabled: { backgroundColor: colors.textFaint },
});
