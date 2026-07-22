import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/theme/theme';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'No encontrado' }} />
      <View style={styles.container}>
        <Text style={styles.title}>404</Text>
        <Text style={styles.text}>Esta página no existe.</Text>
        <Link href="/" style={styles.link}>Volver al inicio</Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.grayBg, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  title: { fontSize: 48, fontWeight: '900', color: colors.orange },
  text: { fontSize: 18, color: colors.grayText, marginTop: spacing.sm, marginBottom: spacing.lg },
  link: { backgroundColor: colors.black, color: colors.orange, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md, fontWeight: '800', fontSize: 16 },
});
