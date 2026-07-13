import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../src/theme/tokens';

const TAB_BAR_HEIGHT = 58;

export default function GuardianLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: '홈', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="alerts"
        options={{ title: '알림', tabBarIcon: ({ color, size }) => <Ionicons name="notifications" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: '기록', tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="medications"
        options={{ title: '복약', tabBarIcon: ({ color, size }) => <Ionicons name="medkit" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="report"
        options={{ title: '리포트', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} /> }}
      />
      <Tabs.Screen name="connect" options={{ href: null }} />
      <Tabs.Screen name="analysis" options={{ href: null }} />
    </Tabs>
  );
}
