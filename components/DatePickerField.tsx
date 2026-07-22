import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme/theme';
import { useState } from 'react';
import { TextInput } from 'react-native';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function DatePickerField({ label, value, onChange }: Props) {
  const [editing, setEditing] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: '2px solid #EEEEEE',
            fontSize: '16px',
            fontFamily: 'inherit',
            backgroundColor: '#FFFFFF',
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {editing ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.grayText}
            keyboardType="numeric"
            autoFocus
            onBlur={() => setEditing(false)}
          />
          <TouchableOpacity style={styles.doneBtn} onPress={() => setEditing(false)}>
            <Text style={styles.doneText}>OK</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.field} onPress={() => setEditing(true)}>
          <Calendar size={20} color={colors.orange} strokeWidth={2.5} />
          <Text style={styles.fieldText}>{value}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', color: colors.grayText, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.grayBorder,
  },
  fieldText: { fontSize: 16, fontWeight: '700', color: colors.textDark },
  inputRow: { flexDirection: 'row', gap: spacing.xs },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.grayBorder,
    fontSize: 16,
    color: colors.textDark,
  },
  doneBtn: {
    backgroundColor: colors.orange,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
