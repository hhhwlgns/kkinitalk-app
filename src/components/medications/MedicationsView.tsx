import type { ReactNode } from 'react';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BigButton } from '../BigButton';
import { DisclaimerBanner } from '../DisclaimerBanner';
import { colors, fontFamily, fontSize, radius, shadow, spacing } from '../../theme/tokens';
import type { Medication } from '../../domain/types';
import type { ConflictWarning } from '../../domain/conflictRules';
import { MEDICATION_TIME_PATTERN } from '../../domain/medicationReminders';

export interface MedicationDraft {
  name: string;
  timesOfDay: string[];
  conflictFoods: string[];
}

interface MedicationsViewProps {
  title: string;
  medications: Medication[];
  warnings?: ConflictWarning[];
  onSave: (draft: MedicationDraft) => Promise<void> | void;
  renderAction: (medication: Medication) => ReactNode;
}

export function MedicationsView({ title, medications, warnings, onSave, renderAction }: MedicationsViewProps) {
  const [name, setName] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [conflictFoodInput, setConflictFoodInput] = useState('');
  const [conflictFoods, setConflictFoods] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    setTimes([]);
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
        <Text style={styles.sectionTitle}>새 약 등록</Text>

        <Text style={styles.label}>약 이름</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="예: 혈압약" />

        <Text style={styles.label}>복용 시간 (HH:MM)</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.rowInput]}
            value={timeInput}
            onChangeText={setTimeInput}
            placeholder="08:00"
          />
          <BigButton label="추가" variant="secondary" onPress={addTime} />
        </View>
        {times.map((time) => (
          <Text key={time} style={styles.chip} onPress={() => removeTime(time)}>
            {time} (탭하여 삭제)
          </Text>
        ))}

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
        {conflictFoods.map((food) => (
          <Text key={food} style={styles.chip} onPress={() => removeConflictFood(food)}>
            {food} (탭하여 삭제)
          </Text>
        ))}

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
    fontSize: fontSize.small,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: spacing.sm,
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowInput: { flex: 1 },
  chip: {
    fontSize: fontSize.meta,
    fontFamily: fontFamily.regular,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  error: {
    fontSize: fontSize.meta,
    fontFamily: fontFamily.regular,
    color: colors.danger,
    marginTop: spacing.sm,
  },
});
