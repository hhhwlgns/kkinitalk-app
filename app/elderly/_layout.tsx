import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow } from '../../src/theme/tokens';

const FAB_SIZE = 60;
const TAB_BAR_HEIGHT = 58;

function CameraFabButton({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return (
    <View style={styles.fabWrap} pointerEvents="box-none">
      <Pressable onPress={onPress} style={styles.fabButton}>
        {children}
      </Pressable>
    </View>
  );
}

export default function ElderlyLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: {
          height: tabBarHeight,
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
        name="history"
        options={{ title: '기록', tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: '',
          tabBarIcon: () => <Ionicons name="camera" color={colors.onPrimary} size={28} />,
          tabBarButton: (props) => (
            <CameraFabButton onPress={props.onPress as (() => void) | undefined}>
              {props.children}
            </CameraFabButton>
          ),
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{ title: '복약', tabBarIcon: ({ color, size }) => <Ionicons name="medkit" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: '내 정보', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
      <Tabs.Screen name="checkin" options={{ href: null }} />
      <Tabs.Screen name="result" options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    top: -26,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabButton: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.cta,
  },
});
