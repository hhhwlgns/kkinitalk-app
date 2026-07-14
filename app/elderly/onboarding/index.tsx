import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AiQuestionBubble } from '../../../src/components/voice/AiQuestionBubble';
import { OnboardingDots } from '../../../src/components/voice/OnboardingDots';
import { OptionStack } from '../../../src/components/voice/OptionStack';
import { VoiceListeningIndicator } from '../../../src/components/voice/VoiceListeningIndicator';
import { MultiSelect, toggleOption } from '../../../src/components/MultiSelect';
import { colors, fontFamily, fontSize, radius, spacing } from '../../../src/theme/tokens';
import { useRole } from '../../../src/state/RoleContext';
import { useConsent } from '../../../src/state/ConsentContext';
import { healthProfilesCollection } from '../../../src/mocks/db/collections';
import { createId } from '../../../src/domain/id';
import { elderlyOnboardingDoneKey } from '../../../src/domain/storageKeys';
import type { HealthProfile } from '../../../src/domain/types';

const CONDITION_OPTIONS = ['고혈압', '당뇨', '심장질환', '관절염', '없음'];
const MEDICATION_OPTIONS = ['혈압약', '당뇨약', '관절약', '없음'];
const AVOIDED_FOOD_OPTIONS = ['짠 음식', '매운 음식', '딱딱한 음식', '단 음식', '없음'];
const APPETITE_OPTIONS: { label: string; value: 'low' | 'normal' | 'high' }[] = [
  { label: '입맛이 없어요', value: 'low' },
  { label: '보통이에요', value: 'normal' },
  { label: '입맛이 좋아요', value: 'high' },
];

type Answers = {
  conditions: string[];
  medications: string[];
  swallowingDifficulty: boolean | null;
  avoidedFoods: string[];
  recentWeightKg: string;
  appetiteLevel: 'low' | 'normal' | 'high' | null;
};

const INITIAL_ANSWERS: Answers = {
  conditions: [],
  medications: [],
  swallowingDifficulty: null,
  avoidedFoods: [],
  recentWeightKg: '',
  appetiteLevel: null,
};

const TOTAL_STEPS = 7;

const STEP_QUESTIONS = [
  '안녕하세요! 요즘 앓고 계신 지병이 있으세요?',
  '드시고 계신 약이 있으면 알려주세요.',
  '음식을 삼키기 불편하실 때가 있나요?',
  '피하고 싶은 음식이 있으신가요?',
  '최근 체중은 몇 kg 정도인가요?',
  '요즘 입맛은 어떠세요?',
  '보호자에게 고위험 상태를 알려도 될까요?',
];

export default function OnboardingScreen() {
  const { activeUserId } = useRole();
  const { setHighRiskSharingConsent } = useConsent();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [highRiskConsent, setHighRiskConsent] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [weightDraft, setWeightDraft] = useState('');

  const userId = activeUserId ?? 'elderly-self';

  function goNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  }

  function skipToDone() {
    router.replace('/elderly/onboarding/done');
  }

  async function finishOnboarding() {
    setSaving(true);
    const now = new Date().toISOString();
    const profile: HealthProfile = {
      id: createId('profile'),
      userId,
      name: '어르신',
      age: null,
      sex: 'unspecified',
      conditions: answers.conditions,
      medications: answers.medications,
      swallowingDifficulty: answers.swallowingDifficulty ?? false,
      avoidedFoods: answers.avoidedFoods,
      recentWeightKg: answers.recentWeightKg ? Number(answers.recentWeightKg) : null,
      appetiteLevel: answers.appetiteLevel,
      createdAt: now,
      updatedAt: now,
    };
    await healthProfilesCollection.upsert(profile);
    await setHighRiskSharingConsent(userId, highRiskConsent ?? false);
    await AsyncStorage.setItem(elderlyOnboardingDoneKey(userId), 'true');
    router.replace('/elderly/onboarding/done');
  }

  const canProceed =
    (step === 0 && answers.conditions.length > 0) ||
    (step === 1 && answers.medications.length > 0) ||
    (step === 2 && answers.swallowingDifficulty !== null) ||
    (step === 3 && answers.avoidedFoods.length > 0) ||
    (step === 4 && answers.recentWeightKg.trim().length > 0) ||
    (step === 5 && answers.appetiteLevel !== null) ||
    (step === 6 && highRiskConsent !== null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Dots are ~250px wide — they get their own centered row; buttons live above. */}
        <View style={styles.header}>
          {step > 0 ? (
            <Pressable
              onPress={() => setStep(step - 1)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="이전 질문으로 돌아가기"
            >
              <Text style={styles.backLabel}>← 이전</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable onPress={skipToDone} accessibilityRole="button" accessibilityLabel="온보딩 건너뛰기">
            <Text style={styles.skipLabel}>건너뛰기</Text>
          </Pressable>
        </View>
        <View style={styles.dotsRow}>
          <OnboardingDots total={TOTAL_STEPS} step={step} />
        </View>

        <View style={styles.body}>
          <View style={styles.indicatorWrap}>
            <VoiceListeningIndicator />
          </View>
          <AiQuestionBubble question={STEP_QUESTIONS[step]} />

          {step === 0 && (
            <MultiSelect
              options={CONDITION_OPTIONS}
              selected={answers.conditions}
              onToggle={(option) =>
                setAnswers((prev) => ({ ...prev, conditions: toggleOption(prev.conditions, option) }))
              }
            />
          )}

          {step === 1 && (
            <MultiSelect
              options={MEDICATION_OPTIONS}
              selected={answers.medications}
              onToggle={(option) =>
                setAnswers((prev) => ({ ...prev, medications: toggleOption(prev.medications, option) }))
              }
            />
          )}

          {step === 2 && (
            <OptionStack
              options={[
                {
                  key: 'yes',
                  label: '자주 있어요',
                  selected: answers.swallowingDifficulty === true,
                  onPress: () => {
                    setAnswers((prev) => ({ ...prev, swallowingDifficulty: true }));
                    goNext();
                  },
                },
                {
                  key: 'no',
                  label: '괜찮아요',
                  selected: answers.swallowingDifficulty === false,
                  onPress: () => {
                    setAnswers((prev) => ({ ...prev, swallowingDifficulty: false }));
                    goNext();
                  },
                },
              ]}
            />
          )}

          {step === 3 && (
            <MultiSelect
              options={AVOIDED_FOOD_OPTIONS}
              selected={answers.avoidedFoods}
              onToggle={(option) =>
                setAnswers((prev) => ({ ...prev, avoidedFoods: toggleOption(prev.avoidedFoods, option) }))
              }
            />
          )}

          {step === 4 && (
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={weightDraft}
              onChangeText={(text) => {
                setWeightDraft(text);
                setAnswers((prev) => ({ ...prev, recentWeightKg: text }));
              }}
              placeholder="예: 54"
              placeholderTextColor={colors.textFaint}
            />
          )}

          {step === 5 && (
            <OptionStack
              options={APPETITE_OPTIONS.map((option) => ({
                key: option.value,
                label: option.label,
                selected: answers.appetiteLevel === option.value,
                onPress: () => {
                  setAnswers((prev) => ({ ...prev, appetiteLevel: option.value }));
                  goNext();
                },
              }))}
            />
          )}

          {step === 6 && (
            <OptionStack
              options={[
                {
                  key: 'agree',
                  label: '네, 동의해요',
                  selected: highRiskConsent === true,
                  onPress: () => {
                    setHighRiskConsent(true);
                    goNext();
                  },
                },
                {
                  key: 'disagree',
                  label: '아니요, 동의하지 않아요',
                  selected: highRiskConsent === false,
                  onPress: () => {
                    setHighRiskConsent(false);
                    goNext();
                  },
                },
              ]}
            />
          )}

          {(step === 0 || step === 1 || step === 3 || step === 4) && (
            <Pressable
              style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
              disabled={!canProceed || saving}
              onPress={goNext}
            >
              <Text style={styles.nextButtonLabel}>{step === TOTAL_STEPS - 1 ? '완료' : '다음'}</Text>
            </Pressable>
          )}
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
  dotsRow: { alignItems: 'center', marginTop: spacing.md },
  backLabel: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semibold,
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
  input: {
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  nextButton: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: colors.neutralFill,
  },
  nextButtonLabel: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.bold,
    color: colors.onPrimary,
  },
  footerHint: {
    marginTop: 'auto',
    alignSelf: 'center',
    fontSize: fontSize.small,
    fontFamily: fontFamily.medium,
    color: colors.textFaint,
  },
});
