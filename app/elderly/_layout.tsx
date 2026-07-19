import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadow } from '../../src/theme/tokens';

const FAB_SIZE = 66;
const TAB_BAR_HEIGHT = 64;

function VoiceFabButton({ onPress }: { onPress?: () => void }) {
  return (
    <View style={styles.fabWrap} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        style={styles.fabButton}
        accessibilityRole="button"
        accessibilityLabel="AI 음성 대화 시작하기"
      >
        <Ionicons name="mic" color={colors.onPrimary} size={32} />
      </Pressable>
    </View>
  );
}

export default function ElderlyLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 16, fontWeight: '700' },
        tabBarStyle: { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom, paddingTop: 7 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: '식사', tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" color={color} size={size} /> }} />
      <Tabs.Screen name="voice" options={{ title: '', tabBarButton: (props) => <VoiceFabButton onPress={props.onPress as (() => void) | undefined} /> }} />
      <Tabs.Screen name="medications" options={{ title: '복약', tabBarIcon: ({ color, size }) => <Ionicons name="medkit" color={color} size={size} /> }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="camera" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="checkin" options={{ href: null }} />
      <Tabs.Screen name="result" options={{ href: null }} />
      <Tabs.Screen name="analysis" options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', marginTop: -(FAB_SIZE / 2 - 8) },
  fabButton: { width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.micOrb },
});
