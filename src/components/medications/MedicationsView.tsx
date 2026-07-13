import type { ReactNode } from 'react';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Pressable } from 'react-native';

import { BigButton } from '../BigButton';
import { DisclaimerBanner } from '../DisclaimerBanner';
import { MedicationScanCard } from './MedicationScanCard';
import { colors, fontFamily, fontSize, radius, shadow, spacing } from '../../theme/tokens';
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
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>음식 충돌 경고</Text>
          {warnings.map((warning, index) => (
            <Text key={`${warning.medicationName}-${warning.foodName}-${index}`} style={styles.warningText}>
              {warning.warning}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>등록된 약</Text>
        {medications.length === 0 ? (
          <Text style={styles.emptyText}>등록된 약이 없어요</Text>
        ) : (
          medications.map((medication) => (
            <View key={medication.id} style={styles.medicationCard}>
              <Text style={styles.medicationName}>{medication.name}</Text>
              <Text style={styles.medicationTimes}>{medication.timesOfDay.join(', ')}</Text>
              {medication.conflictFoods.length > 0 && (
                <Text style={styles.medicationConflicts}>주의 음식: {medication.conflictFoods.join(', ')}</Text>
              )}
              {renderAction(medication)}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>사진으로 약 등록</Text>
        <MedicationScanCard compact={compact} onAdd={onSave} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>직접 약 등록</Text>

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
  content: { padding: spacing.lg },
  title: {
    fontSize: fontSize.sectionHeader,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  section: { marginTop: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: { fontSize: fontSize.small, fontFamily: fontFamily.regular, color: colors.textMuted },
  medicationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  medicationName: { fontSize: fontSize.body, fontFamily: fontFamily.bold, color: colors.text },
  medicationTimes: {
    fontSize: fontSize.small,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  medicationConflicts: {
    fontSize: fontSize.meta,
    fontFamily: fontFamily.regular,
    color: colors.caution,
    marginTop: spacing.xs,
  },
  warningCard: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  warningTitle: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.bold,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  warningText: { fontSize: fontSize.small, fontFamily: fontFamily.regular, color: colors.text, marginBottom: spacing.xs },
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
