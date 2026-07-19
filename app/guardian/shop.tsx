import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, EmptyState } from '../../src/components/ui';
import { findConnectedLink } from '../../src/domain/guardianLink';
import type { HealthProfile, MealProduct } from '../../src/domain/types';
import { guardianLinksCollection, healthProfilesCollection, mealProductsCollection } from '../../src/mocks/db/collections';
import { useRole } from '../../src/state/RoleContext';
import { colors, minTouchTarget, radius, spacing, type } from '../../src/theme/tokens';

const CATEGORY_LABEL: Record<MealProduct['category'], string> = {
  lowSodium: '저염식', diabetes: '당뇨 관리식', highProtein: '고단백', softMeal: '부드러운 식단', general: '건강식', porridge: '죽', sideDishes: '반찬',
};

export default function GuardianShopScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';
  const [products, setProducts] = useState<MealProduct[]>([]);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MealProduct['category'] | 'all'>('all');

  const load = useCallback(async () => {
    const links = await guardianLinksCollection.getAll();
    const link = findConnectedLink(links, guardianUserId);
    if (!link) { router.replace('/guardian/connect'); return; }
    const [items, profiles] = await Promise.all([
      mealProductsCollection.getAll(),
      healthProfilesCollection.query((item) => item.userId === link.elderlyUserId),
    ]);
    setProducts(items);
    setProfile(profiles[profiles.length - 1] ?? null);
  }, [guardianUserId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const recommended = useMemo(() => products.filter((product) => product.suitableConditions.length === 0 || product.suitableConditions.some((condition) => profile?.conditions.includes(condition))).sort((a, b) => Number(b.featured) - Number(a.featured)), [products, profile]);
  const visible = selectedCategory === 'all' ? recommended : recommended.filter((product) => product.category === selectedCategory);
  const categories = Array.from(new Set(products.map((product) => product.category)));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View style={styles.flex1}><Text style={styles.eyebrow}>{profile?.name ?? '어르신'} 님을 위한</Text><Text style={styles.title}>맞춤 식단몰</Text><Text style={styles.subtitle}>건강 상태와 최근 영양 기록을 참고해 골랐어요.</Text></View><Ionicons name="basket" size={34} color={colors.primary} /></View>
        <Card style={styles.recommendBanner}>
          <Ionicons name="sparkles" size={26} color={colors.primary} />
          <View style={styles.flex1}><Text style={styles.recommendTitle}>오늘의 추천 기준</Text><Text style={styles.recommendText}>{profile?.conditions.join(', ') || '균형 영양'} · 저염 · 단백질 보충</Text></View>
        </Card>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          <CategoryChip label="전체" active={selectedCategory === 'all'} onPress={() => setSelectedCategory('all')} />
          {categories.map((category) => <CategoryChip key={category} label={CATEGORY_LABEL[category]} active={selectedCategory === category} onPress={() => setSelectedCategory(category)} />)}
        </ScrollView>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>추천 메뉴</Text><Text style={styles.count}>{visible.length}개</Text></View>
        {visible.length === 0 ? <EmptyState title="조건에 맞는 식단이 없어요" description="다른 분류를 선택해 보세요." /> : visible.map((product) => (
          <Pressable key={product.id} onPress={() => router.push({ pathname: '/guardian/product', params: { productId: product.id } })} style={({ pressed }) => [pressed && styles.pressed]}>
            <Card style={styles.productCard}>
              <View style={styles.productImage}><Ionicons name={product.category === 'softMeal' ? 'restaurant' : 'nutrition'} size={38} color={colors.primary} /><Text style={styles.category}>{CATEGORY_LABEL[product.category]}</Text></View>
              <View style={styles.flex1}><Text style={styles.productName}>{product.name}</Text><Text style={styles.description} numberOfLines={2}>{product.description}</Text><Text style={styles.nutrients}>{product.nutrients.calories}kcal · 단백질 {product.nutrients.proteinG}g · 나트륨 {product.nutrients.sodiumMg}mg</Text><Text style={styles.price}>{product.price.toLocaleString()}원</Text></View>
              <Ionicons name="chevron-forward" size={23} color={colors.textFaint} />
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function CategoryChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.categoryChip, active && styles.categoryChipActive]}><Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }, flex1: { flex: 1 }, pressed: { opacity: 0.72 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, eyebrow: { ...type.callout, color: colors.primary }, title: { ...type.title, color: colors.text, marginTop: 2 }, subtitle: { ...type.body, color: colors.textMuted, marginTop: spacing.xs },
  recommendBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.nextMedBg, borderColor: colors.profileHighlightBorder }, recommendTitle: { ...type.bodyStrong, color: colors.text }, recommendText: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  categories: { gap: spacing.xs }, categoryChip: { minHeight: minTouchTarget - 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' }, categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, categoryChipText: { ...type.callout, color: colors.textMuted }, categoryChipTextActive: { color: colors.onPrimary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { ...type.heading, color: colors.text }, count: { ...type.callout, color: colors.textMuted },
  productCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, productImage: { width: 92, height: 106, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }, category: { ...type.caption, color: colors.secondaryAccent }, productName: { ...type.subheading, color: colors.text }, description: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs }, nutrients: { ...type.caption, color: colors.good, marginTop: spacing.xs }, price: { ...type.bodyStrong, color: colors.text, marginTop: spacing.xs },
});
