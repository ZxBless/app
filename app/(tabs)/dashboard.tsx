import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { TrendingUp, TrendingDown, Target, Clock, DollarSign, Pickaxe, Hammer, Calendar } from 'lucide-react-native';
import { colors, radius, spacing, shadow } from '@/theme/theme';
import { getRecordsByDateRange, getSettings, type Settings, type WorkRecord } from '@/db/database';
import { formatHours, formatCurrency } from '@/utils/calculations';

type Period = 'day' | 'week' | 'month';

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getPeriodRange(period: Period, now: Date): { from: string; to: string; label: string } {
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  let start: Date;
  let end: Date = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === 'day') {
    start = getDayStart(now);
  } else if (period === 'week') {
    start = getWeekStart(now);
  } else {
    start = getMonthStart(now);
  }
  return { from: fmt(start), to: fmt(end), label: `${fmt(start)} - ${fmt(end)}` };
}

function getPrevPeriodRange(period: Period, now: Date): { from: string; to: string } {
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  let prevStart: Date;
  let prevEnd: Date;
  if (period === 'day') {
    prevStart = getDayStart(now);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(prevStart);
    prevEnd.setHours(23, 59, 59, 999);
  } else if (period === 'week') {
    prevStart = getWeekStart(now);
    prevStart.setDate(prevStart.getDate() - 7);
    prevEnd = new Date(prevStart);
    prevEnd.setDate(prevEnd.getDate() + 6);
  } else {
    prevStart = getMonthStart(now);
    prevStart.setMonth(prevStart.getMonth() - 1);
    prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0);
  }
  return { from: fmt(prevStart), to: fmt(prevEnd) };
}

function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

interface PeriodStats {
  totalHours: number;
  totalPayment: number;
  excavacionHours: number;
  martilloHours: number;
  recordCount: number;
  dayBreakdown: { date: string; hours: number; payment: number }[];
}

function buildStats(records: WorkRecord[]): PeriodStats {
  let totalHours = 0;
  let totalPayment = 0;
  let excavacionHours = 0;
  let martilloHours = 0;
  const byDate = new Map<string, { hours: number; payment: number }>();

  for (const r of records) {
    totalHours += r.hours;
    totalPayment += r.payment;
    if (r.workType === 'excavacion') excavacionHours += r.hours;
    else martilloHours += r.hours;

    const existing = byDate.get(r.date) ?? { hours: 0, payment: 0 };
    existing.hours += r.hours;
    existing.payment += r.payment;
    byDate.set(r.date, existing);
  }

  const dayBreakdown = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, hours: v.hours, payment: v.payment }));

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    excavacionHours: Math.round(excavacionHours * 100) / 100,
    martilloHours: Math.round(martilloHours * 100) / 100,
    recordCount: records.length,
    dayBreakdown,
  };
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('week');
  const [current, setCurrent] = useState<PeriodStats | null>(null);
  const [previous, setPrevious] = useState<PeriodStats | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rangeLabel, setRangeLabel] = useState('');

  const loadData = useCallback(async (p: Period) => {
    setLoading(true);
    const s = await getSettings();
    setSettings(s);

    const now = new Date();
    const curRange = getPeriodRange(p, now);
    const prevRange = getPrevPeriodRange(p, now);

    const [curRecords, prevRecords] = await Promise.all([
      getRecordsByDateRange(curRange.from, curRange.to),
      getRecordsByDateRange(prevRange.from, prevRange.to),
    ]);

    setCurrent(buildStats(curRecords));
    setPrevious(buildStats(prevRecords));
    setRangeLabel(curRange.label);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(period);
    }, [loadData, period])
  );

  const selectPeriod = (p: Period) => {
    setPeriod(p);
    loadData(p);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  const goal = settings?.weeklyGoalHours ?? 40;
  const progressPct = goal > 0 ? Math.min((current?.totalHours ?? 0) / goal * 100, 100) : 0;
  const hoursVsPrev = (current?.totalHours ?? 0) - (previous?.totalHours ?? 0);
  const paymentVsPrev = (current?.totalPayment ?? 0) - (previous?.totalPayment ?? 0);

  const excPct = current && current.totalHours > 0
    ? Math.round((current.excavacionHours / current.totalHours) * 100)
    : 0;
  const martPct = current && current.totalHours > 0
    ? Math.round((current.martilloHours / current.totalHours) * 100)
    : 0;

  const maxDayHours = current
    ? Math.max(...current.dayBreakdown.map((d) => d.hours), 1)
    : 1;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Panel</Text>

      <View style={styles.periodTabs}>
        <TouchableOpacity
          style={[styles.periodTab, period === 'day' && styles.periodTabActive]}
          onPress={() => selectPeriod('day')}
        >
          <Text style={[styles.periodTabText, period === 'day' && styles.periodTabTextActive]}>Hoy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodTab, period === 'week' && styles.periodTabActive]}
          onPress={() => selectPeriod('week')}
        >
          <Text style={[styles.periodTabText, period === 'week' && styles.periodTabTextActive]}>Semana</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodTab, period === 'month' && styles.periodTabActive]}
          onPress={() => selectPeriod('month')}
        >
          <Text style={[styles.periodTabText, period === 'month' && styles.periodTabTextActive]}>Mes</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.rangeLabel}>{rangeLabel}</Text>

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <Clock size={18} color={colors.orange} strokeWidth={2.5} />
            <Text style={styles.statLabel}>Horas</Text>
          </View>
          <Text style={styles.statValue}>{formatHours(current?.totalHours ?? 0)}</Text>
          <View style={styles.trendRow}>
            {hoursVsPrev >= 0 ? (
              <TrendingUp size={14} color={colors.green} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={14} color={colors.red} strokeWidth={2.5} />
            )}
            <Text style={[styles.trendText, { color: hoursVsPrev >= 0 ? colors.green : colors.red }]}>
              {hoursVsPrev >= 0 ? '+' : ''}{formatHours(Math.abs(hoursVsPrev))}
            </Text>
          </View>
        </View>

        <View style={styles.statCardBlack}>
          <View style={styles.statIconRow}>
            <DollarSign size={18} color={colors.orange} strokeWidth={2.5} />
            <Text style={styles.statLabelBlack}>Ingresos</Text>
          </View>
          <Text style={styles.statValueBlack}>{formatCurrency(current?.totalPayment ?? 0)}</Text>
          <View style={styles.trendRow}>
            {paymentVsPrev >= 0 ? (
              <TrendingUp size={14} color={colors.green} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={14} color={colors.red} strokeWidth={2.5} />
            )}
            <Text style={[styles.trendText, { color: paymentVsPrev >= 0 ? colors.green : colors.red }]}>
              {paymentVsPrev >= 0 ? '+' : ''}{formatCurrency(Math.abs(paymentVsPrev))}
            </Text>
          </View>
        </View>
      </View>

      {period === 'week' && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Target size={22} color={colors.black} strokeWidth={2.5} />
            <Text style={styles.progressTitle}>Objetivo semanal</Text>
          </View>
          <Text style={styles.progressValue}>
            {formatHours(current?.totalHours ?? 0)}{' '}
            <Text style={styles.progressGoal}>/ {formatHours(goal)}</Text>
          </Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressPct}>{Math.round(progressPct)}% completado</Text>
        </View>
      )}

      <View style={styles.breakdownCard}>
        <Text style={styles.cardTitle}>Desglose por herramienta</Text>
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownIcon}>
              <Pickaxe size={20} color={colors.orange} strokeWidth={2.5} />
            </View>
            <Text style={styles.breakdownName}>Excavación</Text>
            <Text style={styles.breakdownValue}>{formatHours(current?.excavacionHours ?? 0)}</Text>
            <Text style={styles.breakdownPct}>{excPct}%</Text>
          </View>
          <View style={styles.breakdownItem}>
            <View style={[styles.breakdownIcon, { backgroundColor: colors.black }]}>
              <Hammer size={20} color={colors.orange} strokeWidth={2.5} />
            </View>
            <Text style={styles.breakdownName}>Martillo</Text>
            <Text style={styles.breakdownValue}>{formatHours(current?.martilloHours ?? 0)}</Text>
            <Text style={styles.breakdownPct}>{martPct}%</Text>
          </View>
        </View>
        {current && current.totalHours > 0 && (
          <View style={styles.dualBarBg}>
            <View style={[styles.dualBarExc, { width: `${excPct}%` }]} />
            <View style={[styles.dualBarMart, { width: `${martPct}%` }]} />
          </View>
        )}
      </View>

      {current && current.dayBreakdown.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Horas por día</Text>
          <View style={styles.barChart}>
            {current.dayBreakdown.map((d) => {
              const barHeight = Math.max((d.hours / maxDayHours) * 120, 4);
              return (
                <View key={d.date} style={styles.barCol}>
                  <View style={styles.barValueWrap}>
                    <Text style={styles.barValue}>{formatHours(d.hours)}</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { height: barHeight }]} />
                  </View>
                  <Text style={styles.barLabel}>{formatDateShort(d.date)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {current && current.recordCount === 0 && (
        <View style={styles.empty}>
          <Calendar size={48} color={colors.grayBorder} strokeWidth={2} />
          <Text style={styles.emptyText}>No hay registros en este período.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.grayBg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: 28, fontWeight: '900', color: colors.textDark, marginBottom: spacing.md },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.grayBorder,
  },
  periodTab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  periodTabActive: { backgroundColor: colors.orange },
  periodTabText: { fontSize: 14, fontWeight: '700', color: colors.grayText },
  periodTabTextActive: { color: colors.white },
  rangeLabel: { fontSize: 14, fontWeight: '600', color: colors.grayText, marginBottom: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.grayBorder,
    ...shadow.card,
  },
  statCardBlack: {
    flex: 1,
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  statIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs },
  statLabel: { fontSize: 13, fontWeight: '700', color: colors.grayText, textTransform: 'uppercase', letterSpacing: 0.5 },
  statLabelBlack: { fontSize: 13, fontWeight: '700', color: colors.orange, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: '900', color: colors.textDark },
  statValueBlack: { fontSize: 22, fontWeight: '900', color: colors.white },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  trendText: { fontSize: 13, fontWeight: '700' },
  progressCard: {
    backgroundColor: colors.orange,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  progressTitle: { fontSize: 16, fontWeight: '800', color: colors.black, textTransform: 'uppercase', letterSpacing: 0.5 },
  progressValue: { fontSize: 32, fontWeight: '900', color: colors.black, marginBottom: spacing.sm },
  progressGoal: { fontSize: 20, fontWeight: '700', color: 'rgba(26,26,26,0.5)' },
  progressBarBg: { height: 12, backgroundColor: 'rgba(26,26,26,0.15)', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.black, borderRadius: 6 },
  progressPct: { fontSize: 13, fontWeight: '700', color: 'rgba(26,26,26,0.7)', marginTop: spacing.xs },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.grayBorder,
    ...shadow.card,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.grayText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  breakdownRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  breakdownItem: { flex: 1, alignItems: 'center' },
  breakdownIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orangeDim, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xs },
  breakdownName: { fontSize: 14, fontWeight: '700', color: colors.grayText },
  breakdownValue: { fontSize: 22, fontWeight: '900', color: colors.textDark, marginTop: 4 },
  breakdownPct: { fontSize: 13, fontWeight: '600', color: colors.orangeDark, marginTop: 2 },
  dualBarBg: { height: 8, borderRadius: 4, flexDirection: 'row', overflow: 'hidden' },
  dualBarExc: { height: '100%', backgroundColor: colors.orange },
  dualBarMart: { height: '100%', backgroundColor: colors.black },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.grayBorder,
    ...shadow.card,
  },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 160, paddingTop: spacing.sm },
  barCol: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
  barValueWrap: { marginBottom: 4 },
  barValue: { fontSize: 10, fontWeight: '700', color: colors.grayText },
  barBg: { width: '80%', maxWidth: 32, height: 120, justifyContent: 'flex-end', backgroundColor: colors.grayBg, borderRadius: radius.xs, overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: colors.orange, borderRadius: radius.xs },
  barLabel: { fontSize: 10, fontWeight: '600', color: colors.grayText, marginTop: 4, textAlign: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emptyText: { fontSize: 16, color: colors.grayText, fontWeight: '500' },
});
