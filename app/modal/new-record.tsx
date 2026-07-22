import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Save, Pickaxe, Hammer } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme/theme';
import { getSettings, getRecordById, insertRecord, updateRecord, type WorkType, type Settings } from '@/db/database';
import { todayString, nowTimeString, WORK_TYPE_LABELS } from '@/utils/calculations';

export default function NewRecordScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const [date, setDate] = useState(todayString());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [workType, setWorkType] = useState<WorkType>('excavacion');
  const [observation, setObservation] = useState('');
  const [client, setClient] = useState('');
  const [project, setProject] = useState('');
  const [operator, setOperator] = useState('');
  const [rates, setRates] = useState({ excavacion: 130, martillo: 170 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((s: Settings) => setRates({ excavacion: s.excavacionRate, martillo: s.martilloRate }));
  }, []);

  const loadRecord = useCallback(async () => {
    if (!editId) return;
    setLoading(true);
    const rec = await getRecordById(parseInt(editId, 10));
    if (rec) {
      setDate(rec.date); setStartTime(rec.startTime); setEndTime(rec.endTime);
      setWorkType(rec.workType); setObservation(rec.observation ?? '');
 setClient(rec.client ?? ''); setProject(rec.project ?? ''); setOperator(rec.operator ?? '');
    }
    setLoading(false);
  }, [editId]);

  useEffect(() => { loadRecord(); }, [loadRecord]);

  const calcHours = () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return mins / 60;
  };

  const handleSave = async () => {
    if (!date || !startTime || !endTime) { Alert.alert('Error', 'Completa todos los campos obligatorios.'); return; }
    const hours = calcHours();
    if (hours <= 0) { Alert.alert('Error', 'La hora de fin debe ser mayor que la de inicio.'); return; }
    const rate = workType === 'excavacion' ? rates.excavacion : rates.martillo;
    const payment = Math.round(hours * rate * 100) / 100;
    const record = { date, startTime, endTime, workType, observation: observation.trim() || null, hours, payment, rate, client: client.trim() || null, project: project.trim() || null, operator: operator.trim() || null };
    setSaving(true);
    try {
      if (editId) await updateRecord(parseInt(editId, 10), record);
      else await insertRecord(record);
      router.back();
    } catch { Alert.alert('Error', 'No se pudo guardar el registro.'); }
    finally { setSaving(false); }
  };

  if (loading) return (<View style={styles.center}><ActivityIndicator size="large" color={colors.yellow} /></View>);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>{editId ? 'Editar Registro' : 'Nuevo Registro'}</Text>
      <Text style={styles.sectionLabel}>Fecha</Text>
      <TextInput style={styles.textInput} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.grayText} />
      <Text style={styles.sectionLabel}>Hora de inicio</Text>
      <TextInput style={styles.textInput} value={startTime} onChangeText={setStartTime} placeholder="HH:MM" placeholderTextColor={colors.grayText} keyboardType="numeric" />
      <Text style={styles.sectionLabel}>Hora de fin</Text>
      <TextInput style={styles.textInput} value={endTime} onChangeText={setEndTime} placeholder="HH:MM" placeholderTextColor={colors.grayText} keyboardType="numeric" />
      <Text style={styles.sectionLabel}>Herramienta</Text>
      <View style={styles.typeRow}>
        <TouchableOpacity style={[styles.typeBtn, workType === 'excavacion' && styles.typeBtnActive]} onPress={() => setWorkType('excavacion')}>
          <Pickaxe size={24} color={workType === 'excavacion' ? colors.black : colors.grayText} strokeWidth={2.5} />
          <Text style={[styles.typeBtnText, workType === 'excavacion' && styles.typeBtnTextActive]}>{WORK_TYPE_LABELS.excavacion}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.typeBtn, workType === 'martillo' && styles.typeBtnActive]} onPress={() => setWorkType('martillo')}>
          <Hammer size={24} color={workType === 'martillo' ? colors.black : colors.grayText} strokeWidth={2.5} />
          <Text style={[styles.typeBtnText, workType === 'martillo' && styles.typeBtnTextActive]}>{WORK_TYPE_LABELS.martillo}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionLabel}>Cliente (opcional)</Text>
      <TextInput style={styles.textInput} value={client} onChangeText={setClient} placeholder="Nombre del cliente" placeholderTextColor={colors.grayText} />
      <Text style={styles.sectionLabel}>Obra / Proyecto (opcional)</Text>
      <TextInput style={styles.textInput} value={project} onChangeText={setProject} placeholder="Nombre de la obra" placeholderTextColor={colors.grayText} />
      <Text style={styles.sectionLabel}>Operador (opcional)</Text>
      <TextInput style={styles.textInput} value={operator} onChangeText={setOperator} placeholder="Nombre del operador" placeholderTextColor={colors.grayText} />
      <Text style={styles.sectionLabel}>Observación (opcional)</Text>
      <TextInput style={styles.observation} value={observation} onChangeText={setObservation} placeholder="Ej: Trabajo en zona norte..." placeholderTextColor={colors.grayText} multiline numberOfLines={3} textAlignVertical="top" />
      <View style={styles.previewBox}>
        <Text style={styles.previewTitle}>Resumen</Text>
        <Text style={styles.previewText}>Horas: {calcHours().toFixed(2)} h</Text>
        <Text style={styles.previewText}>Tarifa: S/{(workType === 'excavacion' ? rates.excavacion : rates.martillo).toFixed(2)}/h</Text>
        <Text style={styles.previewPayment}>Pago: S/{(calcHours() * (workType === 'excavacion' ? rates.excavacion : rates.martillo)).toFixed(2)}</Text>
      </View>
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color={colors.yellow} /> : <Save size={22} color={colors.yellow} strokeWidth={2.5} />}
        <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.grayBg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: 26, fontWeight: '800', color: colors.textDark, marginBottom: spacing.md },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.textDark, marginBottom: spacing.xs, marginTop: spacing.md },
  textInput: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, borderWidth: 2, borderColor: colors.grayBorder, fontSize: 16, color: colors.textDark, marginBottom: spacing.sm },
  observation: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, borderWidth: 2, borderColor: colors.grayBorder, fontSize: 16, color: colors.textDark, minHeight: 80, marginBottom: spacing.md },
  typeRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  typeBtn: { flex: 1, flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 2, borderColor: colors.grayBorder },
  typeBtnActive: { backgroundColor: colors.yellow, borderColor: colors.yellowDark },
  typeBtnText: { fontSize: 15, fontWeight: '700', color: colors.grayText },
  typeBtnTextActive: { color: colors.black },
  previewBox: { backgroundColor: colors.black, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg, marginTop: spacing.md },
  previewTitle: { fontSize: 14, fontWeight: '700', color: colors.yellow, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  previewText: { fontSize: 16, color: colors.white, fontWeight: '500', paddingVertical: 2 },
  previewPayment: { fontSize: 20, fontWeight: '900', color: colors.yellow, marginTop: spacing.sm },
  saveBtn: { flexDirection: 'row', backgroundColor: colors.black, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  saveText: { fontSize: 18, fontWeight: '800', color: colors.yellow },
});
