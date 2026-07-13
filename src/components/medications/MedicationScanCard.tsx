import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { AnalyzingSpinner } from '../voice/AnalyzingSpinner';
import { colors, fontFamily, fontSize, radius, shadow, spacing } from '../../theme/tokens';
import {
  analyzeMockMedicationPhoto,
  MEDICATION_TIME_OPTIONS,
  type MedicationScanResult,
} from '../../mocks/medicationScan';
import type { MedicationDraft } from './MedicationsView';

const SCAN_DELAY_MS = 1500;

type ScanStage = 'idle' | 'busy' | 'done';

interface MedicationScanCardProps {
  compact?: boolean;
  onAdd: (draft: MedicationDraft) => Promise<void> | void;
}

export function MedicationScanCard({ compact = false, onAdd }: MedicationScanCardProps) {
  const [stage, setStage] = useState<ScanStage>('idle');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<MedicationScanResult | null>(null);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const title = compact ? '약 사진으로 등록' : '약 사진을 찍어주세요';
  const subtitle = compact ? '약봉투나 알약 포장이 잘 보이게 찍어주세요' : '무슨 약인지 AI가 알려드려요';

  async function pickPhoto(source: 'camera' | 'library') {
    setError(null);
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('사진 접근 권한이 필요해요. 설정에서 권한을 허용해 주세요.');
      return;
    }
    const picker =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (picker.canceled || picker.assets.length === 0) {
      return;
    }
    setPhotoUri(picker.assets[0].uri);
  }

  async function runScan() {
    setError(null);
    setStage('busy');
    await new Promise((resolve) => setTimeout(resolve, SCAN_DELAY_MS));
    const scan = analyzeMockMedicationPhoto();
    setResult(scan);
    setSelectedTimes(scan.suggestedTimes);
    setStage('done');
  }

  function toggleTime(value: string) {
    setSelectedTimes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value].sort(),
    );
  }

  function reset() {
    setStage('idle');
    setResult(null);
    setPhotoUri(null);
    setSelectedTimes([]);
    setError(null);
  }

  async function addScanned() {
    if (!result) return;
    if (selectedTimes.length === 0) {
      setError('복용 시간을 하나 이상 선택해 주세요.');
      return;
    }
    setSaving(true);
    await onAdd({
      name: result.category,
      timesOfDay: selectedTimes,
      conflictFoods: result.conflictFoods,
    });
    setSaving(false);
    reset();
  }

  return (
    <View style={styles.card}>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={[styles.photoSlot, compact && styles.photoSlotCompact]}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoFill} resizeMode="cover" />
        ) : (
          <Text style={styles.photoPlaceholder}>약봉투 사진을 찍어주세요</Text>
        )}
        {stage === 'busy' && (
          <View style={styles.busyOverlay}>
            <AnalyzingSpinner />
            <Text style={styles.busyText}>약을 확인하고 있어요…</Text>
          </View>
        )}
      </View>

      {stage !== 'done' && (
        <>
          <View style={styles.captureRow}>
            <Pressable
              style={[styles.captureButton, styles.captureButtonPrimary]}
              onPress={() => pickPhoto('camera')}
              disabled={stage === 'busy'}
            >
              <Text style={styles.captureButtonPrimaryLabel}>사진 찍기</Text>
            </Pressable>
            <Pressable
              style={[styles.captureButton, styles.captureButtonSecondary]}
              onPress={() => pickPhoto('library')}
              disabled={stage === 'busy'}
            >
              <Text style={styles.captureButtonSecondaryLabel}>갤러리</Text>
            </Pressable>
          </View>
          <Pressable
            style={[styles.scanButton, (!photoUri || stage === 'busy') && styles.scanButtonDisabled]}
            onPress={runScan}
            disabled={!photoUri || stage === 'busy'}
          >
            <Text style={styles.scanButtonLabel}>무슨 약인지 알아보기</Text>
          </Pressable>
        </>
      )}

      {stage === 'done' && result && (
        <>
          <View style={styles.resultBox}>
            <View style={styles.resultBadge}>
              <Text style={styles.resultBadgeLabel}>찾았어요</Text>
            </View>
            <Text style={styles.resultName}>{result.productName}</Text>
            <Text style={styles.resultDosage}>{result.dosageHint}</Text>
            {result.conflictNote && (
              <View style={styles.conflictBox}>
                <Text style={styles.conflictText}>{result.conflictNote}</Text>
              </View>
            )}
          </View>

          <Text style={styles.timeLabel}>언제 드세요?</Text>
          <View style={styles.timeRow}>
            {MEDICATION_TIME_OPTIONS.map((option) => {
              const active = selectedTimes.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  style={[styles.timeChip, active ? styles.timeChipActive : styles.timeChipInactive]}
                  onPress={() => toggleTime(option.value)}
                >
                  <Text style={[styles.timeChipLabel, active ? styles.timeChipLabelActive : styles.timeChipLabelInactive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.scanButton} onPress={addScanned} disabled={saving}>
            <Text style={styles.scanButtonLabel}>이 약 넣기</Text>
          </Pressable>
          <Pressable style={styles.resetButton} onPress={reset} disabled={saving}>
            <Text style={styles.resetButtonLabel}>다시 찍기</Text>
          </Pressable>
        </>
      )}

      {stage !== 'done' && error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.disclaimer}>
        사진으로 찾은 약이 실제와 다를 수 있어요.{'\n'}헷갈리면 가족이나 약사님께 여쭤보세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  title: { fontSize: fontSize.label, fontFamily: fontFamily.extrabold, color: colors.text },
  titleCompact: { fontSize: fontSize.body },
  subtitle: {
    fontSize: fontSize.small,
    fontFamily: fontFamily.semibold,
    color: colors.textMuted,
    marginTop: 3,
  },
  photoSlot: {
    position: 'relative',
    height: 170,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.dividerLight,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotCompact: { height: 210 },
  photoFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  photoPlaceholder: {
    fontSize: fontSize.small,
    fontFamily: fontFamily.medium,
    color: colors.avatarInitial,
  },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.cameraScrim,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  busyText: { color: colors.iconFillCream, fontSize: fontSize.body, fontFamily: fontFamily.bold },
  captureRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  captureButton: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonPrimary: { backgroundColor: colors.primary },
  captureButtonPrimaryLabel: { color: colors.onPrimary, fontSize: fontSize.body, fontFamily: fontFamily.extrabold },
  captureButtonSecondary: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  captureButtonSecondaryLabel: { color: colors.textMuted, fontSize: fontSize.body, fontFamily: fontFamily.bold },
  scanButton: {
    marginTop: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    alignItems: 'center',
    ...shadow.cta,
  },
  scanButtonDisabled: { opacity: 0.45 },
  scanButtonLabel: { color: colors.onPrimary, fontSize: fontSize.label, fontFamily: fontFamily.extrabold },
  resultBox: {
    marginTop: 14,
    backgroundColor: colors.goodBg,
    borderWidth: 1.5,
    borderColor: colors.goodBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  resultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.good,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  resultBadgeLabel: { color: colors.surface, fontSize: fontSize.small, fontFamily: fontFamily.extrabold },
  resultName: { fontSize: fontSize.question, fontFamily: fontFamily.extrabold, color: colors.text, marginTop: 10 },
  resultDosage: { fontSize: fontSize.body, fontFamily: fontFamily.semibold, color: colors.textMuted, marginTop: 3 },
  conflictBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.sm,
    padding: 13,
    marginTop: 12,
  },
  conflictText: { fontSize: fontSize.body, fontFamily: fontFamily.semibold, color: colors.danger, lineHeight: 24 },
  timeLabel: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.extrabold,
    color: colors.textMuted,
    marginTop: 16,
    marginBottom: 8,
  },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  timeChipActive: { backgroundColor: colors.primaryHoverBg, borderColor: colors.primary },
  timeChipInactive: { backgroundColor: colors.surface, borderColor: colors.border },
  timeChipLabel: { fontSize: fontSize.label, fontFamily: fontFamily.extrabold },
  timeChipLabelActive: { color: colors.secondaryAccent },
  timeChipLabelInactive: { color: colors.textMuted },
  resetButton: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  resetButtonLabel: { color: colors.textMuted, fontSize: fontSize.body, fontFamily: fontFamily.extrabold },
  error: {
    fontSize: fontSize.small,
    fontFamily: fontFamily.semibold,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  disclaimer: {
    fontSize: fontSize.meta,
    fontFamily: fontFamily.medium,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 14,
  },
});
