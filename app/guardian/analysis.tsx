import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { MealAnalysisView } from '../../src/components/analysis/MealAnalysisView';
import { ChevronIcon } from '../../src/components/icons/ChevronIcon';
import { EmptyState, ScreenState } from '../../src/components/ui';
import { colors, spacing, type as typeScale } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import {
  guardianLinksCollection,
  healthProfilesCollection,
  mealsCollection,
  medicationsCollection,
} from '../../src/mocks/db/collections';
import { findConnectedLink } from '../../src/domain/guardianLink';
import type { HealthProfile, Meal, Medication } from '../../src/domain/types';

export default function GuardianAnalysisScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';
  const { mealId } = useLocalSearchParams<{ mealId?: string }>();

  const [meal, setMeal] = useState<Meal | null>(null);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const links = await guardianLinksCollection.getAll();
    const link = findConnectedLink(links, guardianUserId);
    if (!link) {
      router.replace('/guardian/connect');
      return;
    }
    const elderlyUserId = link.elderlyUserId;

    const meals = await mealsCollection.query((item) => item.userId === elderlyUserId);
    const target = mealId
      ? meals.find((item) => item.id === mealId) ?? null
      : [...meals].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;
    setMeal(target);

    const profiles = await healthProfilesCollection.query((item) => item.userId === elderlyUserId);
    setProfile(profiles[profiles.length - 1] ?? null);

    const meds = await medicationsCollection.query((item) => item.userId === elderlyUserId);
    setMedications(meds);
    setLoading(false);
  }, [guardianUserId, mealId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8} accessibilityLabel="뒤로">
          <View style={styles.backChevron}>
            <ChevronIcon size={15} color={colors.text} />
          </View>
        </Pressable>
        <Text style={styles.headerTitle}>식단 분석</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? <ScreenState kind="loading" title="식사 기록을 살펴보고 있어요" description="잠시만 기다려 주세요." /> : meal ? (
        <MealAnalysisView meal={meal} profile={profile} medications={medications} compact />
      ) : (
        <View style={styles.emptyWrap}>
          <EmptyState title="분석할 식사가 없어요" description="어르신이 식사를 기록하면 여기서 볼 수 있어요." />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerTitle: { ...typeScale.heading, color: colors.text },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backChevron: { transform: [{ scaleX: -1 }] },
  emptyWrap: { padding: spacing.lg },
});
