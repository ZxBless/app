import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { TrendingUp, TrendingDown, Target, Clock, DollarSign, Pickaxe, Hammer } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme/theme';
import { getRecordsByDateRange, getSettings, type Settings } from '@/db/database';
import { formatHours, formatCurrency } from '@/utils/calculations';
import { type WorkRecord } from '@/db/database';

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekRange(weekStart: Date): { from: string; to: string } {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  return { from: fmt(weekStart), to: fmt(end) };
}

function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

interface WeekStats {
  totalHours: number;
  totalPayment: number;
  excavacionHours: number;
  martilloHours: number;
  recordCount: number;
  dayBreakdown: { date: string; hours: number; payment: number }[];
}

function buildWeekStats(records: WorkRecord[]): WeekStats {
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
  const [thisWeek, setThisWeek] = useState<WeekStats | null>(null);
  const [lastWeek, setLastWeek] = useState<WeekStats | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [weekLabel, setWeekLabel] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const s = await getSettings();
    setSettings(s);

    const now = new Date();
    const thisWeekStart = getWeekStart(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const thisRange = getWeekRange(thisWeekStart);
    const lastRange = getWeekRange(lastWeekStart);

    const [thisRecords, lastRecords] = await Promise.all([
      getRecordsByDateRange(thisRange.from, thisRange.to),
      getRecordsByDateRange(lastRange.from, lastRange.to),
    ]);

    setThisWeek(buildWeekStats(thisRecords));
    setLastWeek(buildWeekStats(lastRecords));
    setWeekLabel(`${formatDateShort(thisRange.from)} - ${formatDateShort(thisRange.to)}`);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.yellow} />
      </View>
    );
  }

  const goal = settings?.weeklyGoalHours ?? 40;
  const progressPct = goal > 0 ? Math.min((thisWeek?.totalHours ?? 0) / goal * 100, 100) : 0;
  const hoursVsLastWeek = (thisWeek?.totalHours ?? 0) - (lastWeek?.totalHours ?? 0);
  const paymentVsLastWeek = (thisWeek?.totalPayment ?? 0) - (lastWeek?.totalPayment ?? 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Dashboard Semanal</Text>
      <Text style={styles.weekLabel}>Semana: {weekLabel}</Text>

      {/* Progress toward goal */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Target size={22} color={colors.black} strokeWidth={2.5} />
          <Text style={styles.progressTitle}>Objetivo semanal</Text>
        </View>
        <Text style={styles.progressValue}>
          {formatHours(thisWeek?.totalHours ?? 0)}{' '}
          <Text style={styles.progressGoal}>/ {formatHours(goal)}</Text>
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={styles.progressPct}>{Math.round(progressPct)}% completado</Text>
      </View>

      {/* This week summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Esta semana</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Clock size={20} color={colors.yellow} strokeWidth={2.5} />
            <Text style={styles.summaryItemValue}>{formatHours(thisWeek?.totalHours ?? 0)}</Text>
            <Text style={styles.summaryItemLabel}>Horas</Text>
          </View>
          <View style={styles.summaryItem}>
            <DollarSign size={20} color={colors.yellow} strokeWidth={2.5} />
            <Text style={styles.summaryItemValue}>{formatCurrency(thisWeek?.totalPayment ?? 0)}</Text>
            <Text style={styles.summaryItemLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Comparison vs last week */}
      <View style={styles.compareCard}>
        <Text style={styles.compareTitle}>vs. semana anterior</Text>
        <View style={styles.compareRow}>
          <View style={styles.compareItem}>
            {hoursVsLastWeek >= 0 ? (
              <TrendingUp size={18} color={colors.green} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={18} color={colors.red} strokeWidth={2.5} />
            )}
            <Text
              style={[
                styles.compareValue,
                { color: hoursVsLastWeek >= 0 ? colors.green : colors.red },
              ]}
            >
              {hoursVsLastWeek >= 0 ? '+' : ''}{formatHours(hoursVsLastWeek)}
            </Text>
            <Text style={styles.compareLabel}>Horas</Text>
          </View>
          <View style={styles.compareItem}>
            {paymentVsLastWeek >= 0 ? (
              <TrendingUp size={18} color={colors.green} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={18} color={colors.red} strokeWidth={2.5} />
            )}
            <Text
              style={[
                styles.compareValue,
                { color: paymentVsLastWeek >= 0 ? colors.green : colors.red },
              ]}
            >
              {paymentVsLastWeek >= 0 ? '+' : ''}{formatCurrency(paymentVsLastWeek)}
            </Text>
            <Text style={styles.compareLabel}>Ingresos</Text>
          </View>
        </View>
      </View>

      {/* Breakdown by work type */}
      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Desglose por tipo</Text>
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownIcon}>
              <Pickaxe size={18} color={colors.black} strokeWidth={2.5} />
            </View>
            <Text style={styles.breakdownLabel}>Excavación</Text>
            <Text style={styles.breakdownValue}>{formatHours(thisWeek?.excavacionHours ?? 0)}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <View style={[styles.breakdownIcon, { backgroundColor: colors.yellowLight }]}>
              <Hammer size={18} color={colors.black} strokeWidth={2.5} />
            </View>
            <Text style={styles.breakdownLabel}>Martillo</Text>
            <Text style={styles.breakdownValue}>{formatHours(thisWeek?.martilloHours ?? 0)}</Text>
          </View>
        </View>
      </View>

      {/* Day-by-day breakdown */}
      {thisWeek && thisWeek.dayBreakdown.length > 0 && (
        <View style={styles.daysCard}>
          <Text style={styles.daysTitle}>Días de esta semana</Text>
          {thisWeek.dayBreakdown.map((d) => (
            <View key={d.date} style={styles.dayRow}>
              <Text style={styles.dayDate}>{formatDateShort(d.date)}</Text>
              <Text style={styles.dayHours}>{formatHours(d.hours)}</Text>
              <Text style={styles.dayPayment}>{formatCurrency(d.payment)}</Text>
            </View>
          ))}
        </View>
      )}

      {thisWeek && thisWeek.recordCount === 0 && (
        <View style={styles.empty}>
          <Clock size={48} color={colors.grayBorder} strokeWidth={2} />
          <Text style={styles.emptyText}>No hay registros esta semana todavía.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.grayBg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grayText,
    marginBottom: spacing.lg,
  },
  progressCard: {
    backgroundColor: colors.yellow,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  progressGoal: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.5)',
  },
  progressBarBg: {
    height: 12,
    backgroundColor: 'rgba(26,26,26,0.15)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.black,
    borderRadius: 6,
  },
  progressPct: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.7)',
    marginTop: spacing.xs,
  },
  summaryCard: {
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.yellow,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryItemValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.white,
    marginTop: spacing.xs,
  },
  summaryItemLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  compareCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  compareTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.grayText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  compareRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  compareItem: {
    flex: 1,
    alignItems: 'center',
  },
  compareValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  compareLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.grayText,
    marginTop: 2,
  },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.grayText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grayText,
  },
  breakdownValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textDark,
    marginTop: 2,
  },
  daysCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  daysTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.grayText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayBorder,
  },
  dayDate: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
    flex: 1,
  },
  dayHours: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grayText,
    width: 80,
    textAlign: 'right',
  },
  dayPayment: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.yellowDark,
    width: 90,
    textAlign: 'right',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.grayText,
    fontWeight: '500',
  },
});
