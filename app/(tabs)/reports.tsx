import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { FileText, FileSpreadsheet, Calendar } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme/theme';
import { DatePickerField } from '@/components/DatePickerField';
import { getRecordsByDateRange, type WorkRecord } from '@/db/database';
import { buildMultiDaySummary, formatDate, formatHours, formatCurrency, todayString, WORK_TYPE_LABELS, type DaySummary } from '@/utils/calculations';
import { exportPDF, exportExcel } from '@/utils/exports';

export default function ReportsScreen() {
  const [fromDate, setFromDate] = useState(todayString());
  const [toDate, setToDate] = useState(todayString());
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<null | 'pdf' | 'excel'>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const recs = await getRecordsByDateRange(fromDate, toDate);
    recs.sort((a, b) => { if (a.date !== b.date) return a.date.localeCompare(b.date); return a.startTime.localeCompare(b.startTime); });
    setRecords(recs);
    setSummaries(buildMultiDaySummary(recs));
    setLoading(false);
  }, [fromDate, toDate]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const totalExcavacion = summaries.reduce((s, d) => s + d.excavacionHours, 0);
  const totalMartillo = summaries.reduce((s, d) => s + d.martilloHours, 0);
  const grandTotal = summaries.reduce((s, d) => s + d.totalPayment, 0);

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
      <View style={styles.dateRange}><DatePickerField label="Desde" value={fromDate} onChange={setFromDate} /><DatePickerField label="Hasta" value={toDate} onChange={setToDate} /></View>
      <View style={styles.exportRow}>
        <TouchableOpacity style={styles.exportBtn} onPress={handlePDF} disabled={exporting !== null}>
          {exporting === 'pdf' ? <ActivityIndicator size="small" color={colors.yellow} /> : <FileText size={24} color={colors.yellow} strokeWidth={2.5} />}
          <Text style={styles.exportText}>Exportar PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExcel} disabled={exporting !== null}>
          {exporting === 'excel' ? <ActivityIndicator size="small" color={colors.yellow} /> : <FileSpreadsheet size={24} color={colors.yellow} strokeWidth={2.5} />}
          <Text style={styles.exportText}>Exportar Excel</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.yellow} style={{ marginTop: spacing.xl }} />
      ) : records.length === 0 ? (
        <View style={styles.empty}><Calendar size={48} color={colors.grayBorder} strokeWidth={2} /><Text style={styles.emptyText}>No hay registros en este periodo.</Text></View>
      ) : (
        <>
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
              <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>{WORK_TYPE_LABELS[r.workType]}</Text>
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
          <View style={styles.totalsCard}>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Total Excavación</Text><Text style={styles.totalValue}>{formatHours(totalExcavacion)}</Text></View>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Total Martillo</Text><Text style={styles.totalValue}>{formatHours(totalMartillo)}</Text></View>
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}><Text style={styles.totalLabelBold}>TOTAL GENERAL</Text><Text style={styles.totalValueBold}>{formatCurrency(grandTotal)}</Text></View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.grayBg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  screenTitle: { fontSize: 26, fontWeight: '800', color: colors.textDark, marginBottom: spacing.md },
  dateRange: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  exportRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  exportBtn: { flex: 1, flexDirection: 'row', backgroundColor: colors.black, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  exportText: { fontSize: 16, fontWeight: '800', color: colors.yellow },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emptyText: { fontSize: 16, color: colors.grayText, fontWeight: '500' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.textDark, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.black, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.xs, alignItems: 'center' },
  tableHeaderText: { fontSize: 12, fontWeight: '800', color: colors.yellow, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.md, marginBottom: 2, alignItems: 'center' },
  tableCell: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  colSmall: { width: 55, fontSize: 13, fontVariant: ['tabular-nums'] },
  colMed: { width: 65, fontSize: 13, fontVariant: ['tabular-nums'] },
  rightCol: { textAlign: 'right', width: 80, fontVariant: ['tabular-nums'] },
  paymentCell: { fontWeight: '800', color: colors.yellowDark },
  totalsCard: { backgroundColor: colors.yellow, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  totalLabel: { fontSize: 16, fontWeight: '600', color: colors.black },
  totalLabelBold: { fontSize: 18, fontWeight: '800', color: colors.black },
  totalValue: { fontSize: 16, fontWeight: '800', color: colors.black },
  totalValueBold: { fontSize: 22, fontWeight: '900', color: colors.black },
  totalDivider: { height: 2, backgroundColor: 'rgba(0,0,0,0.2)', marginVertical: spacing.xs },
});
