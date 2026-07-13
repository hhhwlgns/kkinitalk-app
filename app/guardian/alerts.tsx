import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '../../src/components/BigButton';
import { DisclaimerBanner } from '../../src/components/DisclaimerBanner';
import { colors, fontFamily, fontSize, radius, shadow, spacing } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import { guardianAlertsCollection, guardianLinksCollection } from '../../src/mocks/db/collections';
import { findConnectedLink } from '../../src/domain/guardianLink';
import type { GuardianAlert } from '../../src/domain/types';

const ALERT_TYPE_LABEL: Record<GuardianAlert['type'], string> = {
  missed_meal: '식사 누락',
  nutrition_risk: '영양 주의',
  missed_medication: '복약 누락',
  high_risk: '고위험',
};

export default function GuardianAlertsScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';

  const [alerts, setAlerts] = useState<GuardianAlert[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const links = await guardianLinksCollection.getAll();
    const link = findConnectedLink(links, guardianUserId);
    if (!link) {
      router.replace('/guardian/connect');
      return;
    }

    const items = await guardianAlertsCollection.query((item) => item.elderlyUserId === link.elderlyUserId);
    const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setAlerts(sorted);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const alert of sorted) {
        if (next[alert.id] === undefined) {
          next[alert.id] = alert.comment ?? '';
        }
      }
      return next;
    });
  }, [guardianUserId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function acknowledge(alert: GuardianAlert) {
    await guardianAlertsCollection.upsert({ ...alert, acknowledged: true });
    await load();
  }

  async function saveComment(alert: GuardianAlert) {
    const comment = drafts[alert.id]?.trim() || null;
    await guardianAlertsCollection.upsert({ ...alert, comment });
    await load();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>알림</Text>
        <DisclaimerBanner variant="general" />

        {alerts.length === 0 ? (
          <Text style={styles.emptyText}>알림이 없어요</Text>
        ) : (
          alerts.map((alert) => (
            <View key={alert.id} style={[styles.card, alert.acknowledged && styles.cardAcknowledged]}>
              <Text style={styles.cardType}>{ALERT_TYPE_LABEL[alert.type]}</Text>
              <Text style={styles.cardMessage}>{alert.message}</Text>
              <Text style={styles.cardDate}>{alert.createdAt.slice(0, 16).replace('T', ' ')}</Text>

              <TextInput
                style={styles.commentInput}
                value={drafts[alert.id] ?? ''}
                onChangeText={(text) => setDrafts((prev) => ({ ...prev, [alert.id]: text }))}
                placeholder="코멘트를 입력하세요"
                multiline
              />
              <View style={styles.actions}>
                <BigButton label="코멘트 저장" variant="secondary" onPress={() => saveComment(alert)} />
                {!alert.acknowledged && <BigButton label="확인 완료" onPress={() => acknowledge(alert)} />}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: {
    fontSize: fontSize.sectionHeader,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: { fontSize: fontSize.small, fontFamily: fontFamily.regular, color: colors.textMuted, marginTop: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.card,
  },
  cardAcknowledged: {
    opacity: 0.7,
  },
  cardType: {
    fontSize: fontSize.meta,
    fontFamily: fontFamily.bold,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  cardMessage: { fontSize: fontSize.body, fontFamily: fontFamily.regular, color: colors.text, marginBottom: spacing.xs },
  cardDate: { fontSize: fontSize.meta, fontFamily: fontFamily.regular, color: colors.textMuted, marginBottom: spacing.sm },
  commentInput: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: fontSize.meta,
    fontFamily: fontFamily.regular,
    backgroundColor: colors.background,
    color: colors.text,
    minHeight: 60,
    marginBottom: spacing.sm,
  },
  actions: { gap: spacing.xs },
});
