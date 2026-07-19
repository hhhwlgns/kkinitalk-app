import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { seedMockDb } from '../src/mocks/db/seed';
import { resetAllMockData } from '../src/mocks/db/store';
import { RoleProvider } from '../src/state/RoleContext';
import { ConsentProvider } from '../src/state/ConsentContext';
import { colors, spacing, type } from '../src/theme/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  if (process.env.EXPO_PUBLIC_DIAGNOSTIC_MODE === 'true') {
    return (
      <View style={styles.diagnosticContainer}>
        <Text style={styles.diagnosticTitle}>끼니톡 진단 화면</Text>
        <Text style={styles.diagnosticDescription}>Expo Go와 기본 React Native 화면은 정상적으로 실행됐어요.</Text>
      </View>
    );
  }

  return <AppRootLayout />;
}

function AppRootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.ttf'),
    'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.ttf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.ttf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.ttf'),
    'Pretendard-ExtraBold': require('../assets/fonts/Pretendard-ExtraBold.ttf'),
  });

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      // Screens currently read the AsyncStorage mock DB directly. MSW is only
      // needed for explicit API-handler development and can make Expo Go exit
      // during native startup on unsupported runtimes, so keep it opt-in.
      if (__DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
        const mocksModule = await import('../src/mocks/setup.native');
        await mocksModule.enableMocking();
      }
      await resetAllMockData();
      await seedMockDb();
      if (mounted) {
        setDbReady(true);
      }
    }

    bootstrap().catch((error: unknown) => {
      if (!mounted) return;
      const message = error instanceof Error ? error.message : String(error);
      console.error('끼니톡 초기화 실패', error);
      setBootstrapError(message);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (bootstrapError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>앱을 준비하지 못했어요</Text>
        <Text style={styles.errorDescription}>{bootstrapError}</Text>
        <Text style={styles.errorHint}>Expo 터미널의 “끼니톡 초기화 실패” 로그를 확인해 주세요.</Text>
      </View>
    );
  }

  if (!dbReady || (!fontsLoaded && !fontError)) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RoleProvider>
          <ConsentProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </ConsentProvider>
        </RoleProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  diagnosticContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  diagnosticTitle: { ...type.heading, color: colors.primary, textAlign: 'center' },
  diagnosticDescription: { ...type.body, color: colors.text, textAlign: 'center', marginTop: spacing.sm },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  errorTitle: { ...type.heading, color: colors.danger, textAlign: 'center' },
  errorDescription: { ...type.body, color: colors.text, textAlign: 'center', marginTop: spacing.sm },
  errorHint: { ...type.callout, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
