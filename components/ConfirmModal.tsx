import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { colors, radius, spacing, shadow } from '@/theme/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ visible, title, message, confirmText = 'Confirmar', onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.7}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: spacing.lg },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, width: '100%', maxWidth: 360, ...shadow.cardLg },
  title: { fontSize: 20, fontWeight: '800', color: colors.textDark, marginBottom: spacing.sm },
  message: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 22 },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 2, borderColor: colors.grayBorder, alignItems: 'center' },
  cancelText: { fontSize: 16, fontWeight: '700', color: colors.grayText },
  confirmBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.red, alignItems: 'center' },
  confirmText: { fontSize: 16, fontWeight: '800', color: colors.white },
});
