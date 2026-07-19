import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, EmptyState } from '../../src/components/ui';
import { findConnectedLink } from '../../src/domain/guardianLink';
import { createId } from '../../src/domain/id';
import type { HealthProfile } from '../../src/domain/types';
import { healthProfileRevisionsCollection, healthProfilesCollection, guardianLinksCollection } from '../../src/mocks/db/collections';
import { useRole } from '../../src/state/RoleContext';
import { colors, minTouchTarget, radius, spacing, type } from '../../src/theme/tokens';

const CONDITIONS = ['고혈압', '당뇨', '심장질환', '관절염'];

export default function GuardianManageScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';
  const [profile, setProfile] = useState<HealthProfile | null>(null);

  const load = useCallback(async () => {
    const links = await guardianLinksCollection.getAll();
    const link = findConnectedLink(links, guardianUserId);
    if (!link) { router.replace('/guardian/connect'); return; }
    const profiles = await healthProfilesCollection.query((item) => item.userId === link.elderlyUserId);
    setProfile(profiles[profiles.length - 1] ?? null);
  }, [guardianUserId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleCondition(condition: string) {
    if (!profile) return;
    const conditions = profile.conditions.includes(condition) ? profile.conditions.filter((item) => item !== condition) : [...profile.conditions, condition];
    const now = new Date().toISOString();
    const updated = { ...profile, conditions, updatedAt: now };
    await healthProfilesCollection.upsert(updated);
    await healthProfileRevisionsCollection.upsert({ id: createId('revision'), userId: profile.userId, changedBy: guardianUserId, changerRole: 'guardian', summary: `${condition} 상태를 ${conditions.includes(condition) ? '추가' : '삭제'}함`, changedAt: now });
    setProfile(updated);
  }

  if (!profile) return <SafeAreaView style={styles.container}><EmptyState title="어르신 정보를 불러오고 있어요" description="연결 상태를 확인해 주세요." /></SafeAreaView>;
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}><View style={styles.avatar}><Text style={styles.avatarText}>{profile.name.charAt(0)}</Text></View><View style={styles.flex1}><Text style={styles.eyebrow}>연결된 어르신</Text><Text style={styles.title}>{profile.name} 님</Text><Text style={styles.subtitle}>{profile.age ? `${profile.age}세 · ` : ''}건강 프로필을 관리합니다</Text></View></View>
        <Card><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>건강 상태</Text><Text style={styles.editHint}>눌러서 수정</Text></View><View style={styles.chips}>{CONDITIONS.map((condition) => { const active = profile.conditions.includes(condition); return <Pressable key={condition} onPress={() => toggleCondition(condition)} style={[styles.chip, active && styles.chipActive]}><Ionicons name={active ? 'checkmark-circle' : 'add-circle-outline'} size={20} color={active ? colors.onPrimary : colors.textMuted} /><Text style={[styles.chipText, active && styles.chipTextActive]}>{condition}</Text></Pressable>; })}</View><Text style={styles.auditNote}>보호자가 수정한 내용은 변경 이력에 기록됩니다.</Text></Card>
        <Card><Text style={styles.sectionTitle}>건강 프로필</Text><InfoRow label="복용약" value={profile.medications.join(', ') || '없음'} /><InfoRow label="알레르기" value={profile.allergies?.join(', ') || '없음'} /><InfoRow label="피하는 음식" value={profile.avoidedFoods.join(', ') || '없음'} /><InfoRow label="삼키기" value={profile.swallowingDifficulty ? '어려움 있음' : '괜찮음'} /><InfoRow label="최근 체중" value={profile.recentWeightKg ? `${profile.recentWeightKg}kg` : '미입력'} /></Card>
        <Pressable onPress={() => router.push('/guardian/medications')} style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}><View style={styles.menuIcon}><Ionicons name="medkit" size={26} color={colors.primary} /></View><View style={styles.flex1}><Text style={styles.menuTitle}>복약 일정 관리</Text><Text style={styles.menuDescription}>약 정보와 시간을 추가하거나 수정해요.</Text></View><Ionicons name="chevron-forward" size={24} color={colors.textFaint} /></Pressable>
        <Pressable onPress={() => router.push('/guardian/report')} style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}><View style={styles.menuIcon}><Ionicons name="stats-chart" size={26} color={colors.primary} /></View><View style={styles.flex1}><Text style={styles.menuTitle}>주간 건강 리포트</Text><Text style={styles.menuDescription}>영양 추이와 복약 이행률을 확인해요.</Text></View><Ionicons name="chevron-forward" size={24} color={colors.textFaint} /></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) { return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }, flex1: { flex: 1 }, pressed: { opacity: 0.72 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, avatar: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { ...type.title, color: colors.primary }, eyebrow: { ...type.callout, color: colors.textMuted }, title: { ...type.title, color: colors.text }, subtitle: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { ...type.heading, color: colors.text }, editHint: { ...type.caption, color: colors.primary }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md }, chip: { minHeight: minTouchTarget - 6, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md }, chipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { ...type.callout, color: colors.textMuted }, chipTextActive: { color: colors.onPrimary }, auditNote: { ...type.caption, color: colors.textFaint, marginTop: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.dividerLight }, infoLabel: { ...type.callout, color: colors.textMuted }, infoValue: { ...type.bodyStrong, color: colors.text, flex: 1, textAlign: 'right' },
  menuCard: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md }, menuIcon: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, menuTitle: { ...type.bodyStrong, color: colors.text }, menuDescription: { ...type.caption, color: colors.textMuted, marginTop: 2 },
});
