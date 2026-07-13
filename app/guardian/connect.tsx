import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '../../src/components/BigButton';
import { CheckIcon } from '../../src/components/icons/CheckIcon';
import { colors, fontFamily, fontSize, fontSizeCompact, radius, spacing } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import { guardianLinksCollection, healthProfilesCollection } from '../../src/mocks/db/collections';
import { findLinkByInviteCode } from '../../src/domain/guardianLink';
import type { GuardianLink, HealthProfile } from '../../src/domain/types';

const CODE_LENGTH = 6;

export default function GuardianConnectScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';

  const inputRef = useRef<TextInput>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [matchedProfile, setMatchedProfile] = useState<HealthProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    guardianLinksCollection.getAll().then(setLinks);
  }, []);

  const match = useMemo(() => findLinkByInviteCode(links, inviteCode), [links, inviteCode]);

  useEffect(() => {
    if (!match) {
      setMatchedProfile(null);
      return;
    }
    let active = true;
    healthProfilesCollection.query((item) => item.userId === match.elderlyUserId).then((profiles) => {
      if (active) setMatchedProfile(profiles[0] ?? null);
    });
    return () => {
      active = false;
    };
  }, [match]);

  async function connect() {
    if (!match) {
      setError('일치하는 초대코드를 찾을 수 없어요. 다시 확인해 주세요.');
      return;
    }
    setConnecting(true);
    setError(null);
    await guardianLinksCollection.upsert({ ...match, guardianUserId, status: 'connected' });
    setConnecting(false);
    router.replace('/guardian/home');
  }

  const matchedName = matchedProfile?.name || '어르신';
  const initial = matchedName.charAt(0) || '?';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{match ? initial : '?'}</Text>
        </View>
        <Text style={styles.title}>보호자 연결</Text>
        <Text style={styles.subtitle}>어르신에게 받은 6자리 초대코드를 입력해 주세요</Text>

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.codeRow}>
          {Array.from({ length: CODE_LENGTH }).map((_, index) => (
            <View key={index} style={[styles.digitBox, index === inviteCode.length && styles.digitBoxActive]}>
              <Text style={styles.digitText}>{inviteCode[index] ?? ''}</Text>
            </View>
          ))}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={inviteCode}
            onChangeText={(text) => {
              setInviteCode(text.toUpperCase().slice(0, CODE_LENGTH));
              setError(null);
            }}
            autoCapitalize="characters"
            maxLength={CODE_LENGTH}
            autoFocus
          />
        </Pressable>

        {match && (
          <View style={styles.foundBanner}>
            <View style={styles.foundIconWrap}>
              <CheckIcon />
            </View>
            <Text style={styles.foundText}>{matchedName}님을 찾았어요!</Text>
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.spacer} />

        <BigButton label="연결하고 시작하기" onPress={connect} disabled={!match || connecting} />
        <Text style={styles.footerCaption}>초대코드는 어르신의 프로필 화면에서 확인할 수 있어요</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.neutralFill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  avatarInitial: { fontSize: fontSizeCompact.sectionHeader, fontFamily: fontFamily.extrabold, color: colors.avatarInitial },
  title: {
    fontSize: fontSize.sectionHeader,
    fontFamily: fontFamily.extrabold,
    color: colors.text,
    marginTop: spacing.md,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semibold,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.lg,
    alignSelf: 'center',
    position: 'relative',
  },
  digitBox: {
    width: 46,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxActive: { borderColor: colors.primary },
  digitText: { fontSize: fontSize.question, fontFamily: fontFamily.extrabold, color: colors.text },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  foundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.goodBg,
    borderWidth: 1.5,
    borderColor: colors.goodBorder,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginTop: spacing.lg,
  },
  foundIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.good,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundText: { fontSize: fontSize.body, fontFamily: fontFamily.extrabold, color: colors.good },
  error: {
    fontSize: fontSize.small,
    fontFamily: fontFamily.medium,
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  spacer: { flex: 1 },
  footerCaption: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 14 * 1.5,
    marginTop: spacing.sm,
  },
});
