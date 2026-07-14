import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '../../src/components/BigButton';
import { DisclaimerBanner } from '../../src/components/DisclaimerBanner';
import { ChevronIcon } from '../../src/components/icons/ChevronIcon';
import { Card, EmptyState, StatusPill } from '../../src/components/ui';
import { colors, fontFamily, fontSize, radius, spacing, type as typeScale } from '../../src/theme/tokens';
import type { NutrientStatus } from '../../src/domain/nutrientStatus';
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

// Severity color per alert type — high-risk & missed medication read as danger,
// the rest as caution, so the list conveys urgency at a glance.
const ALERT_STATUS: Record<GuardianAlert['type'], NutrientStatus> = {
  missed_meal: 'caution',
  nutrition_risk: 'caution',
  missed_medication: 'danger',
  high_risk: 'danger',
};

export default function GuardianAlertsScreen() {
  const { activeUserId } = useRole();
  const guardianUserId = activeUserId ?? 'guardian-self';

  const [alerts, setAlerts] = useState<GuardianAlert[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
          <EmptyState title="새로운 알림이 없어요" description="어르신의 식사·복약에 주의가 필요하면 여기로 알려드려요." />
        ) : (
          alerts.map((alert) => {
            const status = ALERT_STATUS[alert.type];
            const accent = status === 'danger' ? colors.danger : colors.caution;
            const open = openIds.has(alert.id);
            return (
              <Card key={alert.id} padded={false} style={[styles.card, alert.acknowledged && styles.cardAcknowledged]}>
                <View style={[styles.accent, { backgroundColor: accent }]} />
                <View style={styles.cardBody}>
                  <Pressable onPress={() => toggleOpen(alert.id)} style={styles.summaryPressable}>
                    <View style={styles.cardTopRow}>
                      <StatusPill status={status} size="sm" label={ALERT_TYPE_LABEL[alert.type]} />
                      {alert.acknowledged && <Text style={styles.doneTag}>확인함</Text>}
                    </View>
                    <View style={styles.summaryRow}>
                      <View style={styles.flex1}>
                        <Text style={styles.cardMessage} numberOfLines={open ? undefined : 2}>
                          {alert.message}
                        </Text>
                        <Text style={styles.cardDate}>{alert.createdAt.slice(0, 16).replace('T', ' ')}</Text>
                      </View>
                      <View style={[styles.chevronWrap, open && styles.chevronWrapOpen]}>
                        <ChevronIcon size={13} color={colors.textFaint} />
                      </View>
                    </View>
                  </Pressable>

                  {open && (
                    <View style={styles.expandedArea}>
                      <TextInput
                        style={styles.commentInput}
                        value={drafts[alert.id] ?? ''}
                        onChangeText={(text) => setDrafts((prev) => ({ ...prev, [alert.id]: text }))}
                        placeholder="메모를 남겨두면 기록에 함께 저장돼요"
                        placeholderTextColor={colors.textFaint}
                        multiline
                      />
                      <View style={styles.actions}>
                        <BigButton label="메모 저장" variant="secondary" onPress={() => saveComment(alert)} />
                        {!alert.acknowledged && <BigButton label="확인 완료" onPress={() => acknowledge(alert)} />}
                      </View>
                    </View>
                  )}
                </View>
              </Card>
            );
          })
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
  card: {
    marginTop: spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAcknowledged: { opacity: 0.6 },
  accent: { width: 5 },
  cardBody: { flex: 1, padding: spacing.md },
  flex1: { flex: 1 },
  summaryPressable: { gap: spacing.sm },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  chevronWrap: { paddingTop: 4, transform: [{ rotate: '90deg' }] },
  chevronWrapOpen: { transform: [{ rotate: '-90deg' }] },
  doneTag: { ...typeScale.caption, color: colors.good, fontFamily: fontFamily.bold },
  cardMessage: { ...typeScale.body, color: colors.text, marginBottom: 4 },
  cardDate: { ...typeScale.caption, color: colors.textMuted },
  expandedArea: { marginTop: spacing.sm },
  commentInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    backgroundColor: colors.surfaceSunken,
    color: colors.text,
    minHeight: 60,
    marginBottom: spacing.sm,
    textAlignVertical: 'top',
  },
  actions: { gap: spacing.xs },
});
