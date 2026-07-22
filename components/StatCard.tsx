import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, shadow } from '@/theme/theme';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  variant?: 'white' | 'orange' | 'black';
  icon?: ReactNode;
}

export function StatCard({ label, value, subValue, variant = 'white', icon }: StatCardProps) {
  const bg =
    variant === 'orange'
      ? colors.orange
      : variant === 'black'
        ? colors.black
        : colors.white;
  const textColor = variant === 'orange' ? colors.black : variant === 'black' ? colors.white : colors.textDark;
  const subColor = variant === 'orange' ? 'rgba(26,26,26,0.7)' : variant === 'black' ? 'rgba(255,255,255,0.7)' : colors.grayText;
  const labelColor = variant === 'orange' ? colors.black : variant === 'black' ? colors.orange : colors.grayText;

  return (
    <View style={[styles.card, { backgroundColor: bg }, variant === 'white' && styles.whiteBorder, shadow.card]}>
      <View style={styles.row}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: textColor }]}>{value}</Text>
      {subValue && <Text style={[styles.subValue, { color: subColor }]}>{subValue}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, flex: 1 },
  whiteBorder: { borderWidth: 2, borderColor: colors.grayBorder },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  iconWrap: { marginRight: spacing.xs },
  label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 26, fontWeight: '900', marginTop: 4 },
  subValue: { fontSize: 14, fontWeight: '500', marginTop: 2 },
});
