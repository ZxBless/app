import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pickaxe, Hammer, Save, RotateCcw, Info, Target } from 'lucide-react-native';
import { colors, radius, spacing, shadow } from '@/theme/theme';
import { getSettings, saveSettings, type Settings } from '@/db/database';
import { formatCurrency } from '@/utils/calculations';

export default function ConfigScreen() {
  const [excavacionRate, setExcavacionRate] = useState('130');
  const [martilloRate, setMartilloRate] = useState('170');
  const [weeklyGoal, setWeeklyGoal] = useState('40');
  const [original, setOriginal] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const s = await getSettings();
    setExcavacionRate(String(s.excavacionRate));
    setMartilloRate(String(s.martilloRate));
    setWeeklyGoal(String(s.weeklyGoalHours));
    setOriginal(s);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  const handleSave = async () => {
    const ex = parseFloat(excavacionRate);
    if (isNaN(ex) || ex < 0) { Alert.alert('Error', 'La tarifa de excavación debe ser un número válido.'); return; }
    const mart = parseFloat(martilloRate);
    if (isNaN(mart) || mart < 0) { Alert.alert('Error', 'La tarifa de martillo debe ser un número válido.'); return; }
    const goal = parseFloat(weeklyGoal);
    if (isNaN(goal) || goal < 0) { Alert.alert('Error', 'El objetivo semanal debe ser un número válido.'); return; }
    setSaving(true);
    await saveSettings({ excavacionRate: ex, martilloRate: mart, weeklyGoalHours: goal });
    setOriginal({ excavacionRate: ex, martilloRate: mart, weeklyGoalHours: goal });
    setSaving(false);
    Alert.alert('Guardado', 'Las tarifas se actualizaron correctamente.');
  };

  const handleReset = () => { setExcavacionRate('130'); setMartilloRate('170'); setWeeklyGoal('40'); };

  const hasChanges = original && (parseFloat(excavacionRate) !== original.excavacionRate || parseFloat(martilloRate) !== original.martilloRate || parseFloat(weeklyGoal) !== original.weeklyGoalHours);

  if (loading) return (<View style={styles.center}><ActivityIndicator size="large" color={colors.orange} /></View>);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Configuración</Text>
      <View style={styles.infoCard}><Info size={20} color={colors.orangeDark} strokeWidth={2.5} /><Text style={styles.infoText}>Las tarifas se aplican a los nuevos registros. Los registros existentes conservan la tarifa con la que fueron creados.</Text></View>
      <View style={styles.rateCard}>
        <View style={styles.rateHeader}><View style={styles.rateIcon}><Pickaxe size={24} color={colors.white} strokeWidth={2.5} /></View><View><Text style={styles.rateTitle}>Excavación</Text><Text style={styles.rateSubtext}>Tarifa por hora</Text></View></View>
        <View style={styles.inputRow}><Text style={styles.currencySymbol}>S/</Text><TextInput style={styles.rateInput} value={excavacionRate} onChangeText={setExcavacionRate} keyboardType="numeric" placeholder="130" placeholderTextColor={colors.grayText} /><Text style={styles.perHour}>/hora</Text></View>
      </View>
      <View style={styles.rateCard}>
        <View style={styles.rateHeader}><View style={[styles.rateIcon, { backgroundColor: colors.black }]}><Hammer size={24} color={colors.orange} strokeWidth={2.5} /></View><View><Text style={styles.rateTitle}>Martillo Hidráulico</Text><Text style={styles.rateSubtext}>Tarifa por hora</Text></View></View>
        <View style={styles.inputRow}><Text style={styles.currencySymbol}>S/</Text><TextInput style={styles.rateInput} value={martilloRate} onChangeText={setMartilloRate} keyboardType="numeric" placeholder="170" placeholderTextColor={colors.grayText} /><Text style={styles.perHour}>/hora</Text></View>
      </View>
      <View style={styles.rateCard}>
        <View style={styles.rateHeader}><View style={[styles.rateIcon, { backgroundColor: colors.orangeDim }]}><Target size={24} color={colors.orange} strokeWidth={2.5} /></View><View><Text style={styles.rateTitle}>Objetivo semanal</Text><Text style={styles.rateSubtext}>Horas meta por semana</Text></View></View>
        <View style={styles.inputRow}><TextInput style={styles.rateInput} value={weeklyGoal} onChangeText={setWeeklyGoal} keyboardType="numeric" placeholder="40" placeholderTextColor={colors.grayText} /><Text style={styles.perHour}>horas/sem</Text></View>
      </View>
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Vista previa</Text>
        <View style={styles.previewRow}><Text style={styles.previewLabel}>1 hora de excavación</Text><Text style={styles.previewValue}>{formatCurrency(parseFloat(excavacionRate) || 0)}</Text></View>
        <View style={styles.previewRow}><Text style={styles.previewLabel}>1 hora de martillo</Text><Text style={styles.previewValue}>{formatCurrency(parseFloat(martilloRate) || 0)}</Text></View>
        <View style={styles.previewRow}><Text style={styles.previewLabel}>8 horas de excavación</Text><Text style={styles.previewValue}>{formatCurrency((parseFloat(excavacionRate) || 0) * 8)}</Text></View>
      </View>
      <TouchableOpacity style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving || !hasChanges} activeOpacity={0.85}>
        {saving ? <ActivityIndicator size="small" color={colors.orange} /> : <Save size={22} color={colors.orange} strokeWidth={2.5} />}
        <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar Tarifas'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.resetBtn} onPress={handleReset}><RotateCcw size={20} color={colors.grayText} strokeWidth={2.5} /><Text style={styles.resetText}>Restablecer valores iniciales</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.grayBg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: 28, fontWeight: '900', color: colors.textDark, marginBottom: spacing.md },
  infoCard: { flexDirection: 'row', backgroundColor: colors.orangeDim, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, gap: spacing.sm, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 14, color: colors.textDark, lineHeight: 20, fontWeight: '500' },
  rateCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 2, borderColor: colors.grayBorder, ...shadow.card },
  rateHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  rateIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orange, justifyContent: 'center', alignItems: 'center' },
  rateTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark },
  rateSubtext: { fontSize: 13, color: colors.grayText, marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: colors.grayBorder, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  currencySymbol: { fontSize: 22, fontWeight: '800', color: colors.orangeDark, marginRight: spacing.xs },
  rateInput: { flex: 1, fontSize: 28, fontWeight: '800', color: colors.textDark, paddingVertical: spacing.sm },
  perHour: { fontSize: 14, fontWeight: '600', color: colors.grayText },
  previewCard: { backgroundColor: colors.black, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.cardLg },
  previewTitle: { fontSize: 14, fontWeight: '700', color: colors.orange, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  previewLabel: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  previewValue: { fontSize: 16, fontWeight: '800', color: colors.white },
  saveBtn: { flexDirection: 'row', backgroundColor: colors.black, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md, ...shadow.button },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: 18, fontWeight: '800', color: colors.orange },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  resetText: { fontSize: 15, fontWeight: '600', color: colors.grayText },
});
