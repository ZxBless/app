import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { FileText, FileSpreadsheet, Calendar, Pickaxe, Hammer, TrendingUp } from 'lucide-react-native';
import { colors, radius, spacing, shadow } from '@/theme/theme';
import { DatePickerField } from '@/components/DatePickerField';
import { getRecordsByDateRange, type WorkRecord } from '@/db/database';
import { buildMultiDaySummary, formatDate, formatHours, formatCurrency, WORK_TYPE_LABELS, type DaySummary } from '@/utils/calculations';
import { exportPDF, exportExcel } from '@/utils/exports';
import { todayString } from '@/utils/calculations';

type FilterPreset = 'today' | 'week' | 'month' | 'custom';

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function ReportsScreen() {
  const [filter, setFilter] = useState<FilterPreset>('week');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<null | 'pdf' | 'excel'>(null);

  const applyPreset = (preset: FilterPreset) => {
    setFilter(preset);
    const now = new Date();
    if (preset === 'today') {
      setFromDate(todayString());
      setToDate(todayString());
    } else if (preset === 'week') {
      setFromDate(fmtDate(getWeekStart(now)));
      setToDate(fmtDate(now));
    } else if (preset === 'month') {
      setFromDate(fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)));
      setToDate(fmtDate(now));
    }
  };

  const loadData = useCallback(async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    const recs = await getRecordsByDateRange(fromDate, toDate);
    recs.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
    setRecords(recs);
    setSummaries(buildMultiDaySummary(recs));
    setLoading(false);
  }, [fromDate, toDate]);

  useFocusEffect(useCallback(() => {
    if (!fromDate) applyPreset('week');
    else loadData();
  }, [loadData, fromDate]));

  const totalExcavacion = summaries.reduce((s, d) => s + d.excavacionHours, 0);
  const totalMartillo = summaries.reduce((s, d) => s + d.martilloHours, 0);
  const totalExcavacionPayment = summaries.reduce((s, d) => s + d.excavacionPayment, 0);
  const totalMartilloPayment = summaries.reduce((s, d) => s + d.martilloPayment, 0);
  const grandTotal = summaries.reduce((s, d) => s + d.totalPayment, 0);
  const totalHours = totalExcavacion + totalMartillo;

  const handlePDF = async () => {
    if (records.length === 0) { Alert.alert('Sin datos', 'No hay registros en el rango seleccionado.'); return; }
    setExporting('pdf');
    try { await exportPDF(records, { from: fromDate, to: toDate }); }
    catch { Alert.alert('Error', 'No se pudo generar el PDF.'); }
    finally { setExporting(null); }
  };

  const handleExcel = async () => {
    if (records.length === 0) { Alert.alert('Sin datos', 'No hay registros en el rango seleccionado.'); return; }
    setExporting('excel');
    try { await exportExcel(records, { from: fromDate, to: toDate }); }
    catch { Alert.alert('Error', 'No se pudo generar el Excel.'); }
    finally { setExporting(null); }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Reportes</Text>

      <View style={styles.presetRow}>
        <TouchableOpacity style={[styles.presetBtn, filter === 'today' && styles.presetBtnActive]} onPress={() => applyPreset('today')}>
          <Text style={[styles.presetText, filter === 'today' && styles.presetTextActive]}>Hoy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.presetBtn, filter === 'week' && styles.presetBtnActive]} onPress={() => applyPreset('week')}>
          <Text style={[styles.presetText, filter === 'week' && styles.presetTextActive]}>Semana</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.presetBtn, filter === 'month' && styles.presetBtnActive]} onPress={() => applyPreset('month')}>
          <Text style={[styles.presetText, filter === 'month' && styles.presetTextActive]}>Mes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.presetBtn, filter === 'custom' && styles.presetBtnActive]} onPress={() => setFilter('custom')}>
          <Text style={[styles.presetText, filter === 'custom' && styles.presetTextActive]}>Custom</Text>
        </TouchableOpacity>
      </View>

      {(filter === 'custom' || !filter) && (
        <View style={styles.dateRange}>
          <DatePickerField label="Desde" value={fromDate || todayString()} onChange={setFromDate} />
          <DatePickerField label="Hasta" value={toDate || todayString()} onChange={setToDate} />
        </View>
      )}

      {(filter !== 'custom' && fromDate && toDate) && (
        <View style={styles.rangeDisplay}>
          <Calendar size={16} color={colors.orangeDark} strokeWidth={2.5} />
          <Text style={styles.rangeText}>{formatDate(fromDate)} - {formatDate(toDate)}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.applyBtn} onPress={loadData}>
        <Text style={styles.applyText}>Aplicar filtro</Text>
      </TouchableOpacity>

      <View style={styles.exportRow}>
        <TouchableOpacity style={styles.exportBtnPdf} onPress={handlePDF} disabled={exporting !== null} activeOpacity={0.85}>
          {exporting === 'pdf' ? <ActivityIndicator size="small" color={colors.white} /> : <FileText size={24} color={colors.white} strokeWidth={2.5} />}
          <Text style={styles.exportText}>Exportar PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtnExcel} onPress={handleExcel} disabled={exporting !== null} activeOpacity={0.85}>
          {exporting === 'excel' ? <ActivityIndicator size="small" color={colors.white} /> : <FileSpreadsheet size={24} color={colors.white} strokeWidth={2.5} />}
          <Text style={styles.exportText}>Exportar Excel</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.orange} style={{ marginTop: spacing.xl }} />
      ) : records.length === 0 ? (
        <View style={styles.empty}>
          <Calendar size={48} color={colors.grayBorder} strokeWidth={2} />
          <Text style={styles.emptyText}>No hay registros en este periodo.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Resumen general</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Pickaxe size={22} color={colors.orange} strokeWidth={2.5} />
              <Text style={styles.summaryCardLabel}>Excavación</Text>
              <Text style={styles.summaryCardHours}>{formatHours(totalExcavacion)}</Text>
              <Text style={styles.summaryCardPayment}>{formatCurrency(totalExcavacionPayment)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Hammer size={22} color={colors.black} strokeWidth={2.5} />
              <Text style={styles.summaryCardLabel}>Martillo</Text>
              <Text style={styles.summaryCardHours}>{formatHours(totalMartillo)}</Text>
              <Text style={styles.summaryCardPayment}>{formatCurrency(totalMartilloPayment)}</Text>
            </View>
          </View>

          <View style={styles.grandTotalCard}>
            <View style={styles.grandTotalLeft}>
              <TrendingUp size={24} color={colors.white} strokeWidth={2.5} />
              <View>
                <Text style={styles.grandTotalLabel}>Total general</Text>
                <Text style={styles.grandTotalHours}>{formatHours(totalHours)} trabajadas</Text>
              </View>
            </View>
            <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
          </View>

          <Text style={styles.sectionTitle}>Detalle de tramos</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Herramienta</Text>
            <Text style={[styles.tableHeaderText, styles.colSmall]}>Inicio</Text>
            <Text style={[styles.tableHeaderText, styles.colSmall]}>Fin</Text>
            <Text style={[styles.tableHeaderText, styles.colMed]}>Duración</Text>
            <Text style={[styles.tableHeaderText, styles.rightCol]}>Pago</Text>
          </View>
          {records.map((r) => (
            <View key={r.id} style={styles.tableRow}>
              <View style={styles.tableToolCell}>
                {r.workType === 'excavacion'
                  ? <Pickaxe size={14} color={colors.orange} strokeWidth={2.5} />
                  : <Hammer size={14} color={colors.black} strokeWidth={2.5} />}
                <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>{WORK_TYPE_LABELS[r.workType]}</Text>
              </View>
              <Text style={[styles.tableCell, styles.colSmall]}>{r.startTime}</Text>
              <Text style={[styles.tableCell, styles.colSmall]}>{r.endTime}</Text>
              <Text style={[styles.tableCell, styles.colMed]}>{formatHours(r.hours)}</Text>
              <Text style={[styles.tableCell, styles.rightCol, styles.paymentCell]}>{formatCurrency(r.payment)}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Resumen por día</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Fecha</Text>
            <Text style={[styles.tableHeaderText, styles.rightCol]}>Excav.</Text>
            <Text style={[styles.tableHeaderText, styles.rightCol]}>Martillo</Text>
            <Text style={[styles.tableHeaderText, styles.rightCol]}>Total</Text>
          </View>
          {summaries.map((s) => (
            <View key={s.date} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(s.date)}</Text>
              <Text style={[styles.tableCell, styles.rightCol]}>{formatHours(s.excavacionHours)}</Text>
              <Text style={[styles.tableCell, styles.rightCol]}>{formatHours(s.martilloHours)}</Text>
              <Text style={[styles.tableCell, styles.rightCol, styles.paymentCell]}>{formatCurrency(s.totalPayment)}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.grayBg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  screenTitle: { fontSize: 28, fontWeight: '900', color: colors.textDark, marginBottom: spacing.md },
  presetRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  presetBtn: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center', borderWidth: 2, borderColor: colors.grayBorder },
  presetBtnActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  presetText: { fontSize: 13, fontWeight: '700', color: colors.grayText },
  presetTextActive: { color: colors.white },
  dateRange: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  rangeDisplay: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, backgroundColor: colors.orangeDim, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignSelf: 'flex-start' },
  rangeText: { fontSize: 14, fontWeight: '700', color: colors.orangeDark },
  applyBtn: { backgroundColor: colors.black, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.lg, ...shadow.button },
  applyText: { fontSize: 16, fontWeight: '800', color: colors.orange },
  exportRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  exportBtnPdf: { flex: 1, flexDirection: 'row', backgroundColor: colors.orange, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadow.button },
  exportBtnExcel: { flex: 1, flexDirection: 'row', backgroundColor: colors.black, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadow.button },
  exportText: { fontSize: 15, fontWeight: '800', color: colors.white },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emptyText: { fontSize: 16, color: colors.grayText, fontWeight: '500' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.textDark, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm },
  summaryGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  summaryCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 2, borderColor: colors.grayBorder, ...shadow.card },
  summaryCardLabel: { fontSize: 13, fontWeight: '700', color: colors.grayText, marginTop: spacing.xs, textTransform: 'uppercase' },
  summaryCardHours: { fontSize: 18, fontWeight: '800', color: colors.textDark, marginTop: 4 },
  summaryCardPayment: { fontSize: 15, fontWeight: '800', color: colors.orangeDark, marginTop: 2 },
  grandTotalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.black, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.cardLg },
  grandTotalLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: colors.white },
  grandTotalHours: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  grandTotalValue: { fontSize: 24, fontWeight: '900', color: colors.orange },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.black, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.xs, alignItems: 'center' },
  tableHeaderText: { fontSize: 12, fontWeight: '800', color: colors.orange, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.md, marginBottom: 2, alignItems: 'center', borderWidth: 1, borderColor: colors.grayBorder },
  tableToolCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tableCell: { fontSize: 13, fontWeight: '600', color: colors.textDark },
  colSmall: { width: 50, fontSize: 12, fontVariant: ['tabular-nums'] },
  colMed: { width: 65, fontSize: 12, fontVariant: ['tabular-nums'] },
  rightCol: { textAlign: 'right', width: 75, fontVariant: ['tabular-nums'] },
  paymentCell: { fontWeight: '800', color: colors.orangeDark },
});
