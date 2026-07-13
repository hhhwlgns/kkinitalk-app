import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '../src/components/BigButton';
import { MascotLogo } from '../src/components/MascotLogo';
import { colors, fontFamily, fontSize, spacing } from '../src/theme/tokens';
import { useRole } from '../src/state/RoleContext';
import { elderlyOnboardingDoneKey } from '../src/domain/storageKeys';

export default function RoleSelectScreen() {
  const { role, activeUserId, isLoading, setRole } = useRole();
  const [checkingRedirect, setCheckingRedirect] = useState(true);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (role === 'elderly' && activeUserId) {
      redirectElderly(activeUserId);
    } else if (role === 'guardian' && activeUserId) {
      router.replace('/guardian/home');
    } else {
      setCheckingRedirect(false);
    }
  }, [isLoading, role, activeUserId]);

  async function redirectElderly(userId: string) {
    const done = await AsyncStorage.getItem(elderlyOnboardingDoneKey(userId));
    if (done === 'true') {
      router.replace('/elderly/home');
    } else {
      router.replace('/elderly/onboarding');
    }
  }

  async function startElderly() {
    await setRole('elderly', 'elderly-self');
    const done = await AsyncStorage.getItem(elderlyOnboardingDoneKey('elderly-self'));
    router.replace(done === 'true' ? '/elderly/home' : '/elderly/onboarding');
  }

  async function startGuardian() {
    await setRole('guardian', 'guardian-self');
    router.replace('/guardian/connect');
  }

  if (isLoading || checkingRedirect) {
    return <View style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <MascotLogo size={104} />
        </View>
        <Text style={styles.title}>끼니톡</Text>
        <Text style={styles.subtitle}>말하고 사진 찍으면, AI가 식단과 복약을 챙겨드려요</Text>
        <View style={styles.buttons}>
          <BigButton label="어르신으로 시작" onPress={startElderly} />
          <BigButton label="보호자로 시작" onPress={startGuardian} variant="secondary" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.hero,
    fontFamily: fontFamily.extrabold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  buttons: {
    marginTop: spacing.md,
  },
});
