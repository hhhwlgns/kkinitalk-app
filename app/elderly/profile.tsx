import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { toggleOption } from '../../src/components/MultiSelect';
import { isoToLocalDate, todayDate } from '../../src/domain/date';
import { colors, fontFamily, fontSize, radius, shadow, spacing, typeElder } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import { useConsent } from '../../src/state/ConsentContext';
import { guardianLinksCollection, healthProfilesCollection, usersCollection } from '../../src/mocks/db/collections';
import { createId } from '../../src/domain/id';
import { generateInviteCode } from '../../src/domain/inviteCode';
import type { GuardianLink, HealthProfile } from '../../src/domain/types';

const CONDITION_OPTIONS = ['고혈압', '당뇨', '심장질환', '관절염', '없음'];
const MEDICATION_OPTIONS = ['혈압약', '당뇨약', '관절약', '없음'];
const AVOIDED_FOOD_OPTIONS = ['짠 음식', '매운 음식', '딱딱한 음식', '단 음식', '없음'];
const SWALLOWING_OPTIONS: { label: string; value: boolean }[] = [
  { label: '자주 있어요', value: true },
  { label: '괜찮아요', value: false },
];
const APPETITE_OPTIONS: { label: string; value: 'low' | 'normal' | 'high' }[] = [
  { label: '입맛이 없어요', value: 'low' },
  { label: '보통이에요', value: 'normal' },
  { label: '입맛이 좋아요', value: 'high' },
];

type RowKey = 'basic' | 'conditions' | 'medications' | 'swallowing' | 'avoidedFoods' | 'appetite' | 'consent';

function daysSince(iso: string): number {
  const created = new Date(isoToLocalDate(iso)).getTime();
  const today = new Date(todayDate()).getTime();
  return Math.max(1, Math.round((today - created) / 86400000) + 1);
}

function joinOrNone(list: string[]): string {
  if (list.length === 0 || (list.length === 1 && list[0] === '없음')) return '없음';
  return list.filter((item) => item !== '없음').join(', ');
}

interface ProfileRowProps {
  label: string;
  value: string;
  open: boolean;
  onToggleOpen: () => void;
  children: React.ReactNode;
}

function ProfileRow({ label, value, open, onToggleOpen, children }: ProfileRowProps) {
  return (
    <View style={styles.card}>
      <View style={styles.rowHeader}>
        <View style={styles.flex1}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue}>{value}</Text>
        </View>
        <Pressable
          style={styles.editButton}
          onPress={onToggleOpen}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${open ? '접기' : '수정하기'}`}
        >
          <Text style={styles.editButtonLabel}>{open ? '접기' : '수정'}</Text>
        </Pressable>
      </View>
      {open && <View style={styles.rowExpand}>{children}</View>}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { activeUserId } = useRole();
  const { highRiskSharingConsent, loadHighRiskSharingConsent, setHighRiskSharingConsent } = useConsent();
  const userId = activeUserId ?? 'elderly-self';

  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [name, setName] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [swallowingDifficulty, setSwallowingDifficulty] = useState(false);
  const [avoidedFoods, setAvoidedFoods] = useState<string[]>([]);
  const [recentWeightKg, setRecentWeightKg] = useState('');
  const [appetiteLevel, setAppetiteLevel] = useState<'low' | 'normal' | 'high' | null>(null);
  const [pendingLinks, setPendingLinks] = useState<GuardianLink[]>([]);
  const [connectedLinks, setConnectedLinks] = useState<GuardianLink[]>([]);
  const [guardianNames, setGuardianNames] = useState<Record<string, string>>({});
  const [openRows, setOpenRows] = useState<Partial<Record<RowKey, boolean>>>({});

  const load = useCallback(async () => {
    const profiles = await healthProfilesCollection.query((item) => item.userId === userId);
    const existing = profiles[0] ?? null;
    setProfile(existing);
    if (existing) {
      setName(existing.name);
      setConditions(existing.conditions);
      setMedications(existing.medications);
      setSwallowingDifficulty(existing.swallowingDifficulty);
      setAvoidedFoods(existing.avoidedFoods);
      setRecentWeightKg(existing.recentWeightKg !== null ? String(existing.recentWeightKg) : '');
      setAppetiteLevel(existing.appetiteLevel);
    }
    const [links, users] = await Promise.all([
      guardianLinksCollection.query((item) => item.elderlyUserId === userId),
      usersCollection.query((item) => item.role === 'guardian'),
    ]);
    setPendingLinks(links.filter((item) => item.status === 'pending'));
    setConnectedLinks(links.filter((item) => item.status === 'connected'));
    setGuardianNames(Object.fromEntries(users.map((user) => [user.id, user.displayName])));
    await loadHighRiskSharingConsent(userId);
  }, [userId, loadHighRiskSharingConsent]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function toggleRow(key: RowKey) {
    setOpenRows((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function persist(overrides: Partial<HealthProfile>) {
    const now = new Date().toISOString();
    const updated: HealthProfile = {
      id: profile?.id ?? createId('profile'),
      userId,
      name: name.trim() || '어르신',
      age: profile?.age ?? null,
      sex: profile?.sex ?? 'unspecified',
      conditions,
      medications,
      swallowingDifficulty,
      avoidedFoods,
      recentWeightKg: recentWeightKg.trim() ? Number(recentWeightKg) : null,
      appetiteLevel,
      createdAt: profile?.createdAt ?? now,
      updatedAt: now,
      ...overrides,
    };
    await healthProfilesCollection.upsert(updated);
    setProfile(updated);
  }

  async function createInviteCode() {
    const link: GuardianLink = {
      id: createId('guardianlink'),
      inviteCode: generateInviteCode(),
      elderlyUserId: userId,
      guardianUserId: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await guardianLinksCollection.upsert(link);
    await load();
  }

  const initial = name.trim().charAt(0) || '나';
  const subtitle = profile ? `끼니톡과 ${daysSince(profile.createdAt)}일째` : '끼니톡과 함께 시작해요';
  const primaryLink = pendingLinks[0] ?? null;
  const displayLink = primaryLink ?? connectedLinks[0] ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.codeCard}>
          <View style={styles.codeHeader}>
            <View style={styles.codeIcon}><Text style={styles.codeIconText}>연결</Text></View>
            <View style={styles.flex1}>
              <Text style={styles.codeLabel}>내 보호자 연결 코드</Text>
              <Text style={styles.codeHelper}>가족에게 이 코드를 알려주세요</Text>
            </View>
          </View>
          <Text style={styles.codeValue}>{displayLink?.inviteCode ?? '코드 없음'}</Text>
          {!displayLink && (
            <Pressable style={styles.codeButton} onPress={createInviteCode}>
              <Text style={styles.codeButtonText}>연결 코드 만들기</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.guardianSection}>
          <Text style={styles.guardianSectionTitle}>연결된 보호자</Text>
          {connectedLinks.length === 0 ? (
            <View style={styles.emptyGuardianCard}>
              <Text style={styles.emptyGuardianTitle}>아직 연결된 보호자가 없어요</Text>
              <Text style={styles.emptyGuardianDescription}>위 코드를 가족에게 알려주시면 건강 기록을 함께 볼 수 있어요.</Text>
            </View>
          ) : connectedLinks.map((link) => (
            <View key={link.id} style={styles.guardianCard}>
              <View style={styles.guardianAvatar}>
                <Text style={styles.guardianAvatarText}>{guardianNames[link.guardianUserId ?? '']?.charAt(0) || '보'}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.guardianName}>{guardianNames[link.guardianUserId ?? ''] ?? '보호자'}</Text>
                <Text style={styles.guardianRelation}>{link.relationship ?? '가족'} · 건강 기록 공유 중</Text>
              </View>
              <View style={styles.connectedBadge}><Text style={styles.connectedBadgeText}>연결됨</Text></View>
            </View>
          ))}
        </View>

        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.name}>{name.trim() || '어르신'}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            아래 내용을 바탕으로 식단을 추천해 드려요. 바뀐 게 있으면 고쳐주세요.
          </Text>
        </View>

        <ProfileRow
          label="기본 정보"
          value={`${name.trim() || '어르신'} · ${recentWeightKg ? `${recentWeightKg}kg` : '체중 미입력'}`}
          open={!!openRows.basic}
          onToggleOpen={() => toggleRow('basic')}
        >
          <Text style={styles.fieldLabel}>이름</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            onBlur={() => persist({ name: name.trim() || '어르신' })}
            placeholder="이름을 입력해 주세요"
          />
          <Text style={styles.fieldLabel}>최근 체중 (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={recentWeightKg}
            onChangeText={setRecentWeightKg}
            onBlur={() => persist({ recentWeightKg: recentWeightKg.trim() ? Number(recentWeightKg) : null })}
            placeholder="예: 54"
          />
        </ProfileRow>

        <ProfileRow
          label="지병"
          value={joinOrNone(conditions)}
          open={!!openRows.conditions}
          onToggleOpen={() => toggleRow('conditions')}
        >
          <View style={styles.chipWrap}>
            {CONDITION_OPTIONS.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={conditions.includes(option)}
                onPress={() => {
                  const next = toggleOption(conditions, option);
                  setConditions(next);
                  persist({ conditions: next });
                }}
              />
            ))}
          </View>
        </ProfileRow>

        <ProfileRow
          label="복용 중인 약"
          value={joinOrNone(medications)}
          open={!!openRows.medications}
          onToggleOpen={() => toggleRow('medications')}
        >
          <View style={styles.chipWrap}>
            {MEDICATION_OPTIONS.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={medications.includes(option)}
                onPress={() => {
                  const next = toggleOption(medications, option);
                  setMedications(next);
                  persist({ medications: next });
                }}
              />
            ))}
          </View>
        </ProfileRow>

        <ProfileRow
          label="삼키기 어려움"
          value={swallowingDifficulty ? '자주 있어요' : '괜찮아요'}
          open={!!openRows.swallowing}
          onToggleOpen={() => toggleRow('swallowing')}
        >
          <View style={styles.chipWrap}>
            {SWALLOWING_OPTIONS.map((option) => (
              <Chip
                key={option.label}
                label={option.label}
                selected={swallowingDifficulty === option.value}
                onPress={() => {
                  setSwallowingDifficulty(option.value);
                  persist({ swallowingDifficulty: option.value });
                }}
              />
            ))}
          </View>
        </ProfileRow>

        <ProfileRow
          label="피하고 싶은 음식"
          value={joinOrNone(avoidedFoods)}
          open={!!openRows.avoidedFoods}
          onToggleOpen={() => toggleRow('avoidedFoods')}
        >
          <View style={styles.chipWrap}>
            {AVOIDED_FOOD_OPTIONS.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={avoidedFoods.includes(option)}
                onPress={() => {
                  const next = toggleOption(avoidedFoods, option);
                  setAvoidedFoods(next);
                  persist({ avoidedFoods: next });
                }}
              />
            ))}
          </View>
        </ProfileRow>

        <ProfileRow
          label="입맛"
          value={APPETITE_OPTIONS.find((option) => option.value === appetiteLevel)?.label ?? '알려주지 않음'}
          open={!!openRows.appetite}
          onToggleOpen={() => toggleRow('appetite')}
        >
          <View style={styles.chipWrap}>
            {APPETITE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={appetiteLevel === option.value}
                onPress={() => {
                  setAppetiteLevel(option.value);
                  persist({ appetiteLevel: option.value });
                }}
              />
            ))}
          </View>
        </ProfileRow>

        <ProfileRow
          label="고위험 상태 공유 동의"
          value={highRiskSharingConsent ? '동의함' : '동의하지 않음'}
          open={!!openRows.consent}
          onToggleOpen={() => toggleRow('consent')}
        >
          <Text style={styles.helperText}>동의하시면 컨디션이 안 좋을 때 보호자 알림으로 전달돼요.</Text>
          <View style={styles.chipWrap}>
            <Chip
              label={highRiskSharingConsent ? '동의함 (누르면 취소)' : '동의하지 않음 (누르면 동의)'}
              selected={!!highRiskSharingConsent}
              onPress={() => setHighRiskSharingConsent(userId, !highRiskSharingConsent)}
            />
          </View>
        </ProfileRow>

        <Text style={styles.footerCaption}>고친 내용은 다음 식단 추천부터 바로 반영돼요.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  flex1: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.neutralFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { ...typeElder.heading, color: colors.avatarInitial },
  name: { ...typeElder.title, color: colors.text },
  subtitle: { ...typeElder.callout, color: colors.textMuted, marginTop: 2 },
  infoBanner: {
    backgroundColor: colors.nextMedBg,
    borderWidth: 1.5,
    borderColor: colors.profileHighlightBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  infoBannerText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semibold,
    color: colors.secondaryAccent,
    lineHeight: fontSize.body * 1.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow.card,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowLabel: { fontSize: fontSize.small, fontFamily: fontFamily.bold, color: colors.textMuted },
  rowValue: { ...typeElder.subheading, color: colors.text, marginTop: 4 },
  editButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 13,
    paddingHorizontal: 18,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonLabel: { fontSize: fontSize.small, fontFamily: fontFamily.extrabold, color: colors.secondaryAccent },
  rowExpand: {
    borderTopWidth: 1,
    borderTopColor: colors.dividerLight,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 18,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryHoverBg },
  chipText: { fontSize: fontSize.body, fontFamily: fontFamily.medium, color: colors.text },
  chipTextSelected: { color: colors.primary, fontFamily: fontFamily.bold },
  fieldLabel: { fontSize: fontSize.small, fontFamily: fontFamily.bold, color: colors.textMuted },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  helperText: { fontSize: fontSize.small, fontFamily: fontFamily.medium, color: colors.textMuted, marginTop: 4 },
  footerCaption: {
    ...typeElder.caption,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 4,
  },
  codeCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.raised,
  },
  codeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  codeIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.primaryTranslucent, alignItems: 'center', justifyContent: 'center' },
  codeIconText: { ...typeElder.caption, color: colors.onPrimary, fontFamily: fontFamily.bold },
  codeLabel: { ...typeElder.bodyStrong, color: colors.onPrimary },
  codeHelper: { ...typeElder.caption, color: colors.onPrimary, opacity: 0.82, marginTop: 2 },
  codeValue: { ...typeElder.display, color: colors.onPrimary, textAlign: 'center', letterSpacing: 5, marginVertical: spacing.md },
  codeButton: { minHeight: 56, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  codeButtonText: { ...typeElder.bodyStrong, color: colors.primary },
  guardianSection: { gap: spacing.sm },
  guardianSectionTitle: { ...typeElder.heading, color: colors.text },
  guardianCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, ...shadow.card },
  guardianAvatar: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.goodBg, alignItems: 'center', justifyContent: 'center' },
  guardianAvatarText: { ...typeElder.bodyStrong, color: colors.good },
  guardianName: { ...typeElder.bodyStrong, color: colors.text },
  guardianRelation: { ...typeElder.caption, color: colors.textMuted, marginTop: 2 },
  connectedBadge: { borderRadius: radius.pill, backgroundColor: colors.goodBg, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  connectedBadgeText: { ...typeElder.caption, color: colors.good },
  emptyGuardianCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  emptyGuardianTitle: { ...typeElder.bodyStrong, color: colors.text },
  emptyGuardianDescription: { ...typeElder.caption, color: colors.textMuted, marginTop: spacing.xs },
});
