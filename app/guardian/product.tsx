import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DisclaimerBanner } from '../../src/components/DisclaimerBanner';
import { Card, EmptyState } from '../../src/components/ui';
import { localDateString } from '../../src/domain/date';
import { findConnectedLink } from '../../src/domain/guardianLink';
import { createId } from '../../src/domain/id';
import type { HealthProfile, MealProduct } from '../../src/domain/types';
import { guardianLinksCollection, healthProfilesCollection, mealOrdersCollection, mealProductsCollection } from '../../src/mocks/db/collections';
import { useRole } from '../../src/state/RoleContext';
import { colors, minTouchTarget, radius, spacing, type } from '../../src/theme/tokens';

export default function GuardianProductScreen() {
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';
  const [product, setProduct] = useState<MealProduct | null>(null);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [elderlyUserId, setElderlyUserId] = useState<string | null>(null);
  const [ordered, setOrdered] = useState(false);

  const load = useCallback(async () => {
    const links = await guardianLinksCollection.getAll();
    const link = findConnectedLink(links, guardianUserId);
    if (!link) { router.replace('/guardian/connect'); return; }
    const [item, profiles] = await Promise.all([
      productId ? mealProductsCollection.getById(productId) : Promise.resolve(null),
      healthProfilesCollection.query((entry) => entry.userId === link.elderlyUserId),
    ]);
    setProduct(item);
    setProfile(profiles[profiles.length - 1] ?? null);
    setElderlyUserId(link.elderlyUserId);
  }, [guardianUserId, productId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function orderMeal() {
    if (!product || !elderlyUserId) return;
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + 1);
    const now = new Date().toISOString();
    await mealOrdersCollection.upsert({
      id: createId('order'), guardianUserId, elderlyUserId, productId: product.id, quantity: 1,
      deliveryDate: localDateString(delivery), deliveryAddressLabel: `${profile?.name ?? '어르신'} 님 댁`,
      giftMessage: '맛있게 드시고 오늘도 건강하세요!', status: 'confirmed', createdAt: now, updatedAt: now,
    });
    setOrdered(true);
  }

  if (!product) return <SafeAreaView style={styles.container}><EmptyState title="상품을 찾을 수 없어요" description="식단몰에서 다른 메뉴를 골라보세요." /></SafeAreaView>;
  const conditionFit = product.suitableConditions.length === 0 || product.suitableConditions.some((item) => profile?.conditions.includes(item));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}><Pressable onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={28} color={colors.text} /></Pressable><Text style={styles.headerTitle}>식단 상세</Text><View style={styles.iconButton} /></View>
        <View style={styles.hero}><Ionicons name="restaurant" size={64} color={colors.primary} /><Text style={styles.heroCaption}>건강 맞춤 도시락</Text></View>
        <View><Text style={styles.title}>{product.name}</Text><Text style={styles.description}>{product.description}</Text><Text style={styles.price}>{product.price.toLocaleString()}원</Text></View>
        <Card style={styles.fitCard}><Ionicons name={conditionFit ? 'checkmark-circle' : 'information-circle'} size={28} color={conditionFit ? colors.good : colors.caution} /><View style={styles.flex1}><Text style={styles.fitTitle}>{profile?.name ?? '어르신'} 님께 {conditionFit ? '추천해요' : '확인이 필요해요'}</Text><Text style={styles.fitText}>{conditionFit ? `${profile?.conditions.join(', ') || '건강 상태'}과 영양 균형을 고려한 메뉴예요.` : '등록된 건강 정보와 맞는지 한 번 더 확인해 주세요.'}</Text></View></Card>
        <Card><Text style={styles.sectionTitle}>영양정보</Text><View style={styles.nutrientRow}><Nutrient label="열량" value={`${product.nutrients.calories}kcal`} /><Nutrient label="단백질" value={`${product.nutrients.proteinG}g`} /><Nutrient label="나트륨" value={`${product.nutrients.sodiumMg}mg`} /></View></Card>
        <Card><Text style={styles.sectionTitle}>메뉴 구성</Text><Text style={styles.body}>{product.foods.join(' · ')}</Text><Text style={styles.allergen}>알레르기 확인: {product.allergens.join(', ') || '표시 항목 없음'}</Text></Card>
        {ordered ? (
          <Card style={styles.orderedCard}><Ionicons name="gift" size={30} color={colors.good} /><View style={styles.flex1}><Text style={styles.orderedTitle}>내일 식사를 보냈어요</Text><Text style={styles.body}>어르신 홈 상단에 선물로 표시됩니다.</Text></View></Card>
        ) : <Pressable onPress={orderMeal} style={styles.orderButton}><Ionicons name="gift" size={25} color={colors.onPrimary} /><Text style={styles.orderButtonText}>{profile?.name ?? '어르신'} 님 댁으로 보내기</Text></Pressable>}
        <DisclaimerBanner variant="general" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Nutrient({ label, value }: { label: string; value: string }) { return <View style={styles.nutrient}><Text style={styles.nutrientLabel}>{label}</Text><Text style={styles.nutrientValue}>{value}</Text></View>; }
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }, flex1: { flex: 1 }, topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, iconButton: { width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }, headerTitle: { ...type.heading, color: colors.text },
  hero: { height: 230, borderRadius: radius.xl, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, heroCaption: { ...type.callout, color: colors.secondaryAccent }, title: { ...type.title, color: colors.text }, description: { ...type.body, color: colors.textMuted, marginTop: spacing.xs }, price: { ...type.heading, color: colors.primary, marginTop: spacing.sm },
  fitCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.goodBg, borderColor: colors.goodBorder }, fitTitle: { ...type.bodyStrong, color: colors.text }, fitText: { ...type.caption, color: colors.textMuted, marginTop: 2 }, sectionTitle: { ...type.subheading, color: colors.text }, nutrientRow: { flexDirection: 'row', marginTop: spacing.md }, nutrient: { flex: 1 }, nutrientLabel: { ...type.caption, color: colors.textMuted }, nutrientValue: { ...type.bodyStrong, color: colors.text, marginTop: 2 }, body: { ...type.body, color: colors.textMuted, marginTop: spacing.xs }, allergen: { ...type.callout, color: colors.caution, marginTop: spacing.md },
  orderButton: { minHeight: 64, borderRadius: radius.lg, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }, orderButtonText: { ...type.bodyStrong, color: colors.onPrimary }, orderedCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.goodBg, borderColor: colors.goodBorder }, orderedTitle: { ...type.bodyStrong, color: colors.good },
});
