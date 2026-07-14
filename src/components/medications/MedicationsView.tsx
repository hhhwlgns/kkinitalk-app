import type { ReactNode } from 'react';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Pressable } from 'react-native';

import { BigButton } from '../BigButton';
import { DisclaimerBanner } from '../DisclaimerBanner';
import { Card, EmptyState, SectionHeader } from '../ui';
import { PillIcon } from '../icons/PillIcon';
import { MedicationScanCard } from './MedicationScanCard';
import { colors, fontFamily, fontSize, radius, shadow, spacing, type as typeScale } from '../../theme/tokens';
import type { Medication } from '../../domain/types';
import type { ConflictWarning } from '../../domain/conflictRules';
import { MEDICATION_TIME_PATTERN } from '../../domain/medicationReminders';
import { MEDICATION_NAME_OPTIONS, MEDICATION_TIME_OPTIONS } from '../../mocks/medicationScan';

export interface MedicationDraft {
  name: string;
  timesOfDay: string[];
  conflictFoods: string[];
}

interface MedicationsViewProps {
  title: string;
  medications: Medication[];
  warnings?: ConflictWarning[];
  compact?: boolean;
  onSave: (draft: MedicationDraft) => Promise<void> | void;
  renderAction: (medication: Medication) => ReactNode;
}

export function MedicationsView({ title, medications, warnings, compact, onSave, renderAction }: MedicationsViewProps) {
  const [name, setName] = useState('');
  const [nameManual, setNameManual] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [timeManual, setTimeManual] = useState(false);
  const [conflictFoodInput, setConflictFoodInput] = useState('');
  const [conflictFoods, setConflictFoods] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function pickName(option: string) {
    setNameManual(false);
    setName(option);
  }

  function toggleTimeChip(value: string) {
    setError(null);
    setTimes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value].sort()));
  }

  function addTime() {
    if (!MEDICATION_TIME_PATTERN.test(timeInput.trim())) {
      setError('시간은 HH:MM 형식으로 입력해 주세요 (예: 08:00)');
      return;
    }
    setError(null);
    setTimes((prev) => (prev.includes(timeInput.trim()) ? prev : [...prev, timeInput.trim()].sort()));
    setTimeInput('');
  }

  function removeTime(time: string) {
    setTimes((prev) => prev.filter((item) => item !== time));
  }

  function addConflictFood() {
    const trimmed = conflictFoodInput.trim();
    if (!trimmed) return;
    setConflictFoods((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setConflictFoodInput('');
  }

  function removeConflictFood(food: string) {
    setConflictFoods((prev) => prev.filter((item) => item !== food));
  }

  async function saveMedication() {
    if (!name.trim() || times.length === 0) {
      setError('약 이름과 복용 시간을 하나 이상 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(null);

    await onSave({ name: name.trim(), timesOfDay: times, conflictFoods });

    setName('');
    setNameManual(false);
    setTimes([]);
    setTimeManual(false);
    setConflictFoods([]);
    setSaving(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <DisclaimerBanner variant="medication" />

      {warnings && warnings.length > 0 && (
        <Card style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <View style={styles.warningDot} />
            <Text style={styles.warningTitle}>음식과 함께 주의하세요</Text>
          </View>
          {warnings.map((warning, index) => (
            <Text key={`${warning.medicationName}-${warning.foodName}-${index}`} style={styles.warningText}>
              {warning.warning}
            </Text>
          ))}
        </Card>
      )}

      <View style={styles.section}>
        <SectionHeader title="등록된 약" />
        {medications.length === 0 ? (
          <EmptyState
            icon={<PillIcon size={26} color={colors.textFaint} />}
            title="등록된 약이 없어요"
            description="아래에서 사진으로 찍거나 직접 추가해 보세요."
          />
        ) : (
          medications.map((medication) => (
            <Card key={medication.id} style={styles.medicationCard}>
              <View style={styles.medicationTop}>
                <View style={styles.medIconWrap}>
                  <PillIcon size={20} color={colors.onPrimary} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.medicationName}>{medication.name}</Text>
                  <Text style={styles.medicationTimes}>{medication.timesOfDay.join(' · ')}</Text>
                  {medication.conflictFoods.length > 0 && (
                    <Text style={styles.medicationConflicts}>주의 음식: {medication.conflictFoods.join(', ')}</Text>
                  )}
                </View>
              </View>
              {renderAction(medication)}
            </Card>
          ))
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="사진으로 약 등록" />
        <MedicationScanCard compact={compact} onAdd={onSave} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="직접 약 등록" />

        <Text style={styles.label}>무슨 약이에요?</Text>
        <View style={styles.chipRow}>
          {MEDICATION_NAME_OPTIONS.map((option) => {
            const active = !nameManual && name === option;
            return (
              <Pressable
                key={option}
                style={[styles.selectChip, active ? styles.selectChipActive : styles.selectChipInactive]}
                onPress={() => pickName(option)}
              >
                <Text style={[styles.selectChipLabel, active ? styles.selectChipLabelActive : styles.selectChipLabelInactive]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            style={[styles.selectChip, nameManual ? styles.selectChipActive : styles.selectChipInactive]}
            onPress={() => {
              setNameManual(true);
              setName('');
            }}
          >
            <Text style={[styles.selectChipLabel, nameManual ? styles.selectChipLabelActive : styles.selectChipLabelInactive]}>
              직접 입력
            </Text>
          </Pressable>
        </View>
        {nameManual && (
          <TextInput
            style={[styles.input, styles.inputSpaced]}
            value={name}
            onChangeText={setName}
            placeholder="예: 관절약"
          />
        )}

        <Text style={styles.label}>언제 드세요?</Text>
        <View style={styles.chipRow}>
          {MEDICATION_TIME_OPTIONS.map((option) => {
            const active = times.includes(option.value);
            return (
              <Pressable
                key={option.value}
                style={[styles.selectChip, active ? styles.selectChipActive : styles.selectChipInactive]}
                onPress={() => toggleTimeChip(option.value)}
              >
                <Text style={[styles.selectChipLabel, active ? styles.selectChipLabelActive : styles.selectChipLabelInactive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            style={[styles.selectChip, timeManual ? styles.selectChipActive : styles.selectChipInactive]}
            onPress={() => setTimeManual((v) => !v)}
          >
            <Text style={[styles.selectChipLabel, timeManual ? styles.selectChipLabelActive : styles.selectChipLabelInactive]}>
              다른 시간
            </Text>
          </Pressable>
        </View>
        {timeManual && (
          <View style={[styles.row, styles.inputSpaced]}>
            <TextInput
              style={[styles.input, styles.rowInput]}
              value={timeInput}
              onChangeText={setTimeInput}
              placeholder="08:00"
            />
            <BigButton label="추가" variant="secondary" onPress={addTime} />
          </View>
        )}
        {times.length > 0 && (
          <View style={styles.selectedTimesRow}>
            {times.map((time) => (
              <Pressable key={time} style={styles.pickedChip} onPress={() => removeTime(time)}>
                <Text style={styles.pickedChipLabel}>{time} ✕</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>주의 음식 (선택)</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.rowInput]}
            value={conflictFoodInput}
            onChangeText={setConflictFoodInput}
            placeholder="예: 자몽"
          />
          <BigButton label="추가" variant="secondary" onPress={addConflictFood} />
        </View>
        {conflictFoods.length > 0 && (
          <View style={styles.selectedTimesRow}>
            {conflictFoods.map((food) => (
              <Pressable key={food} style={styles.pickedChip} onPress={() => removeConflictFood(food)}>
                <Text style={styles.pickedChipLabel}>{food} ✕</Text>
              </Pressable>
            ))}
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <BigButton label="약 등록하기" onPress={saveMedication} disabled={saving} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  flex1: { flex: 1 },
  title: {
    ...typeScale.title,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  section: { marginTop: spacing.lg },
  medicationCard: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  medicationTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  medIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicationName: { ...typeScale.subheading, color: colors.text },
  medicationTimes: {
    ...typeScale.callout,
    color: colors.textMuted,
    marginTop: 2,
  },
  medicationConflicts: {
    ...typeScale.caption,
    color: colors.caution,
    marginTop: 4,
  },
  warningCard: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  warningDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.danger },
  warningTitle: {
    ...typeScale.bodyStrong,
    color: colors.danger,
  },
  warningText: { ...typeScale.body, color: colors.text },
  label: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  inputSpaced: { marginTop: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowInput: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectChip: {
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  selectChipActive: { backgroundColor: colors.primaryHoverBg, borderColor: colors.primary },
  selectChipInactive: { backgroundColor: colors.surface, borderColor: colors.border },
  selectChipLabel: { fontSize: fontSize.label, fontFamily: fontFamily.extrabold },
  selectChipLabelActive: { color: colors.secondaryAccent },
  selectChipLabelInactive: { color: colors.textMuted },
  selectedTimesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  pickedChip: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pickedChipLabel: { fontSize: fontSize.small, fontFamily: fontFamily.bold, color: colors.onPrimary },
  error: {
    fontSize: fontSize.meta,
    fontFamily: fontFamily.regular,
    color: colors.danger,
    marginTop: spacing.sm,
  },
});
