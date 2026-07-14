import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AiQuestionBubble } from '../../src/components/voice/AiQuestionBubble';
import { OptionStack } from '../../src/components/voice/OptionStack';
import { VoiceListeningIndicator } from '../../src/components/voice/VoiceListeningIndicator';
import { colors, fontFamily, fontSize, spacing } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import { checkInsCollection, healthProfilesCollection } from '../../src/mocks/db/collections';
import { createId } from '../../src/domain/id';
import { todayDate } from '../../src/domain/date';
import type { CheckIn, ConditionLevel } from '../../src/domain/types';

interface CheckinQuestion {
  question: string;
  options: { label: string; hadMeal?: boolean; condition?: ConditionLevel }[];
}

const CK_QUESTIONS: CheckinQuestion[] = [
  {
    // Question 0's greeting is personalized at render time with the profile name.
    question: '좋은 아침이에요! 아침 식사 하셨어요?',
    options: [
      { label: '네, 먹었어요', hadMeal: true },
      { label: '아직이요', hadMeal: false },
      { label: '입맛이 없어요', hadMeal: false },
    ],
  },
  {
    question: '오늘 몸 상태는 어떠세요?',
    options: [
      { label: '좋아요', condition: 'good' },
      { label: '그저 그래요', condition: 'normal' },
      { label: '기운이 없어요', condition: 'bad' },
    ],
  },
];

function goHome() {
  router.replace('/elderly/home');
}

export default function CheckInScreen() {
  const { activeUserId } = useRole();
  const userId = activeUserId ?? 'elderly-self';

  const [step, setStep] = useState(0);
  const [hadMeal, setHadMeal] = useState<boolean | null>(null);
  const [profileName, setProfileName] = useState('어르신');

  useEffect(() => {
    let active = true;
    healthProfilesCollection.query((item) => item.userId === userId).then((profiles) => {
      const name = profiles[profiles.length - 1]?.name?.trim();
      if (active && name) setProfileName(name);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const clampedStep = Math.min(step, CK_QUESTIONS.length - 1);
  const current = CK_QUESTIONS[clampedStep];
  const questionText = clampedStep === 0 ? `${profileName} 님, ${current.question}` : current.question;

  async function pickOption(option: CheckinQuestion['options'][number]) {
    if (clampedStep === 0) {
      setHadMeal(option.hadMeal ?? null);
      setStep(1);
      return;
    }

    const today = todayDate();
    // Re-checking in on the same day updates the existing record instead of stacking a duplicate.
    const existing = await checkInsCollection.query((item) => item.userId === userId && item.date === today);
    const checkIn: CheckIn = {
      id: existing[0]?.id ?? createId('checkin'),
      userId,
      date: today,
      condition: option.condition ?? 'normal',
      hadMeal: hadMeal ?? false,
      note: null,
      recordedAt: new Date().toISOString(),
    };
    await checkInsCollection.upsert(checkIn);
    goHome();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>
            아침 체크인 · {clampedStep + 1} / {CK_QUESTIONS.length}
          </Text>
          <Pressable onPress={goHome}>
            <Text style={styles.skipLabel}>다음에 하기</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.indicatorWrap}>
            <VoiceListeningIndicator />
          </View>
          <AiQuestionBubble question={questionText} />
          <OptionStack
            options={current.options.map((option, index) => ({
              key: `${clampedStep}-${index}`,
              label: option.label,
              onPress: () => pickOption(option),
            }))}
          />
        </View>

        <Text style={styles.footerHint}>말씀하시거나, 버튼을 눌러주세요</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.extrabold,
    color: colors.textMuted,
  },
  skipLabel: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semibold,
    color: colors.textFaint,
  },
  body: {
    flex: 1,
    marginTop: spacing.xl,
  },
  indicatorWrap: {
    alignItems: 'center',
  },
  footerHint: {
    marginTop: 'auto',
    alignSelf: 'center',
    fontSize: fontSize.small,
    fontFamily: fontFamily.medium,
    color: colors.textFaint,
  },
});
