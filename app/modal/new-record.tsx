import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Save, Pickaxe, Hammer, ChevronLeft } from 'lucide-react-native';
import { colors, radius, spacing, shadow } from '@/theme/theme';
import { TimePicker } from '@/components/TimePicker';
import { getSettings, getRecordById, insertRecord, updateRecord, type WorkType, type Settings } from '@/db/database';
import { todayString, WORK_TYPE_LABELS, formatMsAsHHMMSS, calcPaymentFromMs } from '@/utils/calculations';
import { DatePickerField } from '@/components/DatePickerField';

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

  const calcMs = () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return mins * 60 * 1000;
  };
  const calcHours = () => calcMs() / 3600000;

  const handleSave = async () => {
    if (!date || !startTime || !endTime) { Alert.alert('Error', 'Completa todos los campos obligatorios.'); return; }
    const ms = calcMs();
    if (ms <= 0) { Alert.alert('Error', 'La hora de fin debe ser mayor que la de inicio.'); return; }
    const rate = workType === 'excavacion' ? rates.excavacion : rates.martillo;
    const payment = calcPaymentFromMs(ms, rate);
    const hours = ms / 3600000;
    const record = { date, startTime, endTime, workType, observation: observation.trim() || null, hours, payment, rate, client: client.trim() || null, project: project.trim() || null, operator: operator.trim() || null };
    setSaving(true);
    try {
      if (editId) await updateRecord(parseInt(editId, 10), record);
      else await insertRecord(record);
      router.back();
    } catch { Alert.alert('Error', 'No se pudo guardar el registro.'); }
    finally { setSaving(false); }
  };

  if (loading) return (<View style={styles.center}><ActivityIndicator size="large" color={colors.orange} /></View>);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.textDark} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{editId ? 'Editar Registro' : 'Nuevo Registro'}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Fecha</Text>
        <DatePickerField label="" value={date} onChange={setDate} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Horario</Text>
        <View style={styles.timeRow}>
          <TimePicker label="Inicio" value={startTime} onChange={setStartTime} />
          <View style={styles.timeDivider} />
          <TimePicker label="Fin" value={endTime} onChange={setEndTime} />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Herramienta</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity style={[styles.typeBtn, workType === 'excavacion' && styles.typeBtnActive]} onPress={() => setWorkType('excavacion')}>
            <Pickaxe size={24} color={workType === 'excavacion' ? colors.white : colors.grayText} strokeWidth={2.5} />
            <Text style={[styles.typeBtnText, workType === 'excavacion' && styles.typeBtnTextActive]}>{WORK_TYPE_LABELS.excavacion}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.typeBtn, workType === 'martillo' && styles.typeBtnActive]} onPress={() => setWorkType('martillo')}>
            <Hammer size={24} color={workType === 'martillo' ? colors.orange : colors.grayText} strokeWidth={2.5} />
            <Text style={[styles.typeBtnText, workType === 'martillo' && styles.typeBtnTextActive]}>{WORK_TYPE_LABELS.martillo}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Información del trabajo (opcional)</Text>
        <Text style={styles.fieldLabel}>Cliente</Text>
        <TextInput style={styles.textInput} value={client} onChangeText={setClient} placeholder="Nombre del cliente" placeholderTextColor={colors.grayText} />
        <Text style={styles.fieldLabel}>Obra / Proyecto</Text>
        <TextInput style={styles.textInput} value={project} onChangeText={setProject} placeholder="Nombre de la obra" placeholderTextColor={colors.grayText} />
        <Text style={styles.fieldLabel}>Operador</Text>
        <TextInput style={styles.textInput} value={operator} onChangeText={setOperator} placeholder="Nombre del operador" placeholderTextColor={colors.grayText} />
        <Text style={styles.fieldLabel}>Observación</Text>
        <TextInput style={styles.observation} value={observation} onChangeText={setObservation} placeholder="Ej: Trabajo en zona norte..." placeholderTextColor={colors.grayText} multiline numberOfLines={3} textAlignVertical="top" />
      </View>

      <View style={styles.previewBox}>
        <Text style={styles.previewTitle}>Resumen</Text>
        <View style={styles.previewRow}><Text style={styles.previewLabel}>Duración</Text><Text style={styles.previewValue}>{formatMsAsHHMMSS(calcMs())}</Text></View>
        <View style={styles.previewRow}><Text style={styles.previewLabel}>Tarifa</Text><Text style={styles.previewValue}>{formatRate(workType === 'excavacion' ? rates.excavacion : rates.martillo)}/h</Text></View>
        <View style={styles.previewDivider} />
        <View style={styles.previewRow}><Text style={styles.previewTotalLabel}>Pago total</Text><Text style={styles.previewTotalValue}>{formatPayment(calcPaymentFromMs(calcMs(), workType === 'excavacion' ? rates.excavacion : rates.martillo))}</Text></View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
        {saving ? <ActivityIndicator size="small" color={colors.orange} /> : <Save size={22} color={colors.orange} strokeWidth={2.5} />}
        <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function formatRate(rate: number): string { return `S/${rate.toFixed(2)}`; }
function formatPayment(amount: number): string { return `S/${amount.toFixed(2)}`; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.grayBg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.grayBorder },
  screenTitle: { fontSize: 24, fontWeight: '900', color: colors.textDark },
  sectionCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 2, borderColor: colors.grayBorder, ...shadow.card },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.grayText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeDivider: { width: 1, height: 40, backgroundColor: colors.grayBorder },
  typeRow: { flexDirection: 'row', gap: spacing.md },
  typeBtn: { flex: 1, flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 2, borderColor: colors.grayBorder },
  typeBtnActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  typeBtnText: { fontSize: 14, fontWeight: '700', color: colors.grayText },
  typeBtnTextActive: { color: colors.white },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textDark, marginBottom: 4, marginTop: spacing.sm },
  textInput: { backgroundColor: colors.grayBg, borderRadius: radius.md, padding: spacing.md, borderWidth: 2, borderColor: colors.grayBorder, fontSize: 16, color: colors.textDark },
  observation: { backgroundColor: colors.grayBg, borderRadius: radius.md, padding: spacing.md, borderWidth: 2, borderColor: colors.grayBorder, fontSize: 16, color: colors.textDark, minHeight: 80 },
  previewBox: { backgroundColor: colors.black, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.cardLg },
  previewTitle: { fontSize: 14, fontWeight: '700', color: colors.orange, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  previewLabel: { fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  previewValue: { fontSize: 15, color: colors.white, fontWeight: '700' },
  previewDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: spacing.sm },
  previewTotalLabel: { fontSize: 18, fontWeight: '900', color: colors.white },
  previewTotalValue: { fontSize: 22, fontWeight: '900', color: colors.orange },
  saveBtn: { flexDirection: 'row', backgroundColor: colors.black, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadow.button },
  saveText: { fontSize: 18, fontWeight: '800', color: colors.orange },
});
