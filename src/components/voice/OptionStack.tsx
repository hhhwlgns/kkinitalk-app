import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily } from '../../theme/tokens';

export interface VoiceOption {
  key: string;
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function OptionStack({ options }: { options: VoiceOption[] }) {
  return (
    <View style={styles.stack}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          onPress={option.onPress}
          style={({ pressed }) => [
            styles.button,
            (option.selected || pressed) && styles.buttonActive,
          ]}
        >
          <Text style={[styles.label, option.selected && styles.labelActive]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 24,
  },
  button: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 19,
    paddingHorizontal: 22,
    minHeight: 60,
    justifyContent: 'center',
  },
  buttonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryHoverBg,
  },
  label: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: colors.text,
    textAlign: 'left',
  },
  labelActive: {
    color: colors.text,
  },
});
