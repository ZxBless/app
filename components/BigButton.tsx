import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { colors, radius, spacing, shadow } from '@/theme/theme';
import type { ReactNode } from 'react';

interface BigButtonProps {
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  onPress: () => void;
  variant?: 'orange' | 'black' | 'white' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

export function BigButton({
  label,
  subtitle,
  icon,
  onPress,
  variant = 'orange',
  loading = false,
  disabled = false,
}: BigButtonProps) {
  const bg =
    variant === 'orange'
      ? colors.orange
      : variant === 'black'
        ? colors.black
        : variant === 'danger'
          ? colors.red
          : colors.white;
  const textColor = variant === 'white' ? colors.textDark : colors.white;
  const subColor = variant === 'orange' ? 'rgba(255,255,255,0.8)' : variant === 'white' ? colors.grayText : 'rgba(255,255,255,0.7)';

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: bg }, variant === 'white' && styles.whiteBorder, shadow.button]}
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
  },
  whiteBorder: {
    borderWidth: 2,
    borderColor: colors.grayBorder,
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
