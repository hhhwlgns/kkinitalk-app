import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { colors, fontFamily, fontSize, radius, shadow, spacing } from '../../../src/theme/tokens';
import { useRole } from '../../../src/state/RoleContext';
import { healthProfilesCollection } from '../../../src/mocks/db/collections';
import type { HealthProfile } from '../../../src/domain/types';

const APPETITE_LABELS: Record<string, string> = {
  low: '입맛이 없어요',
  normal: '보통이에요',
  high: '입맛이 좋아요',
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function CheckBadge() {
  return (
    <View style={styles.badge}>
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 13l4.5 4.5L19 8"
          stroke={colors.surface}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export default function OnboardingDoneScreen() {
  const { activeUserId } = useRole();
  const [profile, setProfile] = useState<HealthProfile | null>(null);

  const userId = activeUserId ?? 'elderly-self';

  useEffect(() => {
    let mounted = true;
    (async () => {
      const profiles = await healthProfilesCollection.query((item) => item.userId === userId);
      if (mounted && profiles.length > 0) {
        setProfile(profiles[profiles.length - 1]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <CheckBadge />
        <Text style={styles.title}>건강 프로필이{'\n'}만들어졌어요</Text>
        <Text style={styles.subtitle}>매일 아침 체크인으로 계속 업데이트돼요</Text>

        {profile ? (
          <View style={styles.card}>
            <SummaryRow label="지병" value={profile.conditions.join(', ') || '없음'} />
            <SummaryRow label="복약" value={profile.medications.join(', ') || '없음'} />
            <SummaryRow label="삼킴(연하)" value={profile.swallowingDifficulty ? '가끔 불편' : '괜찮아요'} />
            <SummaryRow label="기피 음식" value={profile.avoidedFoods.join(', ') || '없음'} />
            <SummaryRow
              label="최근 체중"
              value={profile.recentWeightKg != null ? `${profile.recentWeightKg}kg` : '미입력'}
            />
            <SummaryRow
              label="요즘 입맛"
              value={profile.appetiteLevel ? APPETITE_LABELS[profile.appetiteLevel] : '보통'}
            />
          </View>
        ) : (
          <Text style={styles.loading}>프로필을 불러오는 중이에요...</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={() => router.replace('/elderly/home')}>
          <Text style={styles.ctaLabel}>끼니톡 시작하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, alignItems: 'center' },
  badge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.good,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 30,
    fontFamily: fontFamily.extrabold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerLight,
  },
  rowLabel: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semibold,
    color: colors.textMuted,
  },
  rowValue: {
    fontSize: fontSize.label,
    color: colors.text,
    fontFamily: fontFamily.bold,
    textAlign: 'right',
  },
  loading: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  footer: {
    padding: spacing.lg,
  },
  cta: {
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    paddingVertical: 22,
    alignItems: 'center',
    ...shadow.cta,
  },
  ctaLabel: {
    color: colors.onPrimary,
    fontSize: 24,
    fontFamily: fontFamily.extrabold,
  },
});
