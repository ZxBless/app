import { StyleSheet, Text, View, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { colors, radius, spacing } from '@/theme/theme';
import { useState } from 'react';

interface TimePickerProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export function TimePicker({ label, value, onChange }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [selH, setSelH] = useState(value.split(':')[0] ?? '08');
  const [selM, setSelM] = useState(value.split(':')[1] ?? '00');

  const confirm = () => {
    onChange(`${selH}:${selM}`);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.picker}
        onPress={() => {
          setSelH(value.split(':')[0] ?? '08');
          setSelM(value.split(':')[1] ?? '00');
          setOpen(true);
        }}
      >
        <Text style={styles.value}>{value}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <View style={styles.columns}>
              <View style={styles.column}>
                <Text style={styles.colLabel}>Hora</Text>
                <FlatList
                  data={HOURS}
                  keyExtractor={(i) => i}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.opt, selH === item && styles.optSel]} onPress={() => setSelH(item)}>
                      <Text style={[styles.optText, selH === item && styles.optTextSel]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  style={styles.scroll}
                  showsVerticalScrollIndicator={false}
                  initialScrollIndex={parseInt(selH, 10)}
                  getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
                />
              </View>
              <View style={styles.column}>
                <Text style={styles.colLabel}>Minuto</Text>
                <FlatList
                  data={MINUTES}
                  keyExtractor={(i) => i}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.opt, selM === item && styles.optSel]} onPress={() => setSelM(item)}>
                      <Text style={[styles.optText, selM === item && styles.optTextSel]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  style={styles.scroll}
                  showsVerticalScrollIndicator={false}
                  initialScrollIndex={parseInt(selM, 10)}
                  getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
              <Text style={styles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: colors.grayText, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  picker: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.grayBorder,
    alignItems: 'center',
  },
  value: { fontSize: 22, fontWeight: '800', color: colors.textDark },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.textDark, textAlign: 'center', marginBottom: spacing.md },
  columns: { flexDirection: 'row', height: 260 },
  column: { flex: 1, alignItems: 'center' },
  colLabel: { fontSize: 16, fontWeight: '700', color: colors.orangeDark, marginBottom: spacing.sm },
  scroll: { width: '100%' },
  opt: { paddingVertical: spacing.sm + 4, alignItems: 'center', borderRadius: radius.sm, marginHorizontal: spacing.sm },
  optSel: { backgroundColor: colors.orange },
  optText: { fontSize: 20, fontWeight: '700', color: colors.textDark },
  optTextSel: { color: colors.black, fontWeight: '800' },
  confirmBtn: { backgroundColor: colors.black, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  confirmText: { fontSize: 18, fontWeight: '800', color: colors.orange },
});
