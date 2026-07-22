import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { colors, radius, spacing } from '@/theme/theme';
import type { ReactNode } from 'react';

interface BigButtonProps {
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  onPress: () => void;
  variant?: 'yellow' | 'black' | 'white';
  loading?: boolean;
  disabled?: boolean;
}

export function BigButton({
  label,
  subtitle,
  icon,
  onPress,
  variant = 'yellow',
  loading = false,
  disabled = false,
}: BigButtonProps) {
  const bg =
    variant === 'yellow'
      ? colors.yellow
      : variant === 'black'
        ? colors.black
        : colors.white;
  const textColor = variant === 'yellow' ? colors.black : colors.white;
  const subColor = variant === 'yellow' ? 'rgba(26,26,26,0.7)' : 'rgba(255,255,255,0.7)';

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: bg }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="large" />
      ) : (
        <View style={styles.row}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <View style={styles.textWrap}>
            <Text style={[styles.label, { color: textColor }]}>{label}</Text>
            {subtitle && <Text style={[styles.subtitle, { color: subColor }]}>{subtitle}</Text>}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 80,
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    marginRight: spacing.md,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
});
