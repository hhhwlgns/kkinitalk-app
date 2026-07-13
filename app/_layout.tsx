import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { seedMockDb } from '../src/mocks/db/seed';
import { resetAllMockData } from '../src/mocks/db/store';
import { RoleProvider } from '../src/state/RoleContext';
import { ConsentProvider } from '../src/state/ConsentContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
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
      if (__DEV__) {
        const mocksModule = await import('../src/mocks/setup.native');
        await mocksModule.enableMocking();
      }
      await resetAllMockData();
      await seedMockDb();
      if (mounted) {
        setDbReady(true);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

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
