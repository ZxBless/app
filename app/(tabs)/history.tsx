import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Search, Pencil, Trash2, Calendar, Pickaxe, Hammer, Plus } from 'lucide-react-native';
import { colors, radius, spacing, shadow } from '@/theme/theme';
import { getAllRecords, deleteRecord, type WorkRecord } from '@/db/database';
import { buildMultiDaySummary, formatDate, formatMsAsHHMMSS, formatCurrency, WORK_TYPE_SHORT, type DaySummary } from '@/utils/calculations';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function HistoryScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const all = await getAllRecords();
    setRecords(all);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const filtered = search.trim()
    ? records.filter((r) => r.date.includes(search.trim()) || r.observation?.toLowerCase().includes(search.trim().toLowerCase()) || r.client?.toLowerCase().includes(search.trim().toLowerCase()) || r.project?.toLowerCase().includes(search.trim().toLowerCase()))
    : records;

  const summaries = buildMultiDaySummary(filtered);
  const recordsByDate = new Map<string, WorkRecord[]>();
  for (const r of filtered) {
    const list = recordsByDate.get(r.date) ?? [];
    list.push(r);
    recordsByDate.set(r.date, list);
  }

  const confirmDelete = useCallback(async () => {
    if (deleteId === null) return;
    await deleteRecord(deleteId);
    setDeleteId(null);
    loadData();
  }, [deleteId, loadData]);

  if (loading) return (<View style={styles.center}><ActivityIndicator size="large" color={colors.orange} /></View>);

  return (
    <View style={styles.screen}>
      <View style={styles.searchBar}>
        <Search size={20} color={colors.grayText} strokeWidth={2.5} style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Buscar por fecha, cliente, obra..." placeholderTextColor={colors.grayText} value={search} onChangeText={setSearch} />
      </View>
      {summaries.length === 0 ? (
        <View style={styles.center}>
          <Calendar size={48} color={colors.grayBorder} strokeWidth={2} />
          <Text style={styles.emptyText}>No hay registros{search ? ' que coincidan' : ''}.</Text>
        </View>
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={(item) => item.date}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item: summary }: { item: DaySummary }) => {
            const dayRecords = recordsByDate.get(summary.date) ?? [];
            return (
              <View style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <View>
                    <Text style={styles.dayDate}>{formatDate(summary.date)}</Text>
                    <Text style={styles.daySubtext}>{summary.recordCount} registro(s) - {formatMsAsHHMMSS(summary.totalHours)}</Text>
                  </View>
                  <View style={styles.dayTotal}>
                    <Text style={styles.dayTotalValue}>{formatCurrency(summary.totalPayment)}</Text>
                  </View>
                </View>
                {dayRecords.map((rec) => (
                  <TouchableOpacity
                    key={rec.id}
                    style={styles.recordCard}
                    onPress={() => router.push(`/modal/new-record?editId=${rec.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recordLeft}>
                      <View style={[styles.typeBadge, rec.workType === 'excavacion' ? styles.badgeExcavacion : styles.badgeMartillo]}>
                        {rec.workType === 'excavacion'
                          ? <Pickaxe size={18} color={colors.white} strokeWidth={2.5} />
                          : <Hammer size={18} color={colors.white} strokeWidth={2.5} />}
                      </View>
                      <View style={styles.recordInfo}>
                        <Text style={styles.recordType}>{WORK_TYPE_SHORT[rec.workType]}</Text>
                        <Text style={styles.recordTime}>{rec.startTime} - {rec.endTime} - {formatMsAsHHMMSS(rec.hours)}</Text>
                        {rec.client ? <Text style={styles.recordMeta} numberOfLines={1}>{rec.client}{rec.project ? ` - ${rec.project}` : ''}</Text> : null}
                        {rec.observation ? <Text style={styles.recordObs} numberOfLines={1}>{rec.observation}</Text> : null}
                      </View>
                    </View>
                    <View style={styles.recordRight}>
                      <Text style={styles.recordPayment}>{formatCurrency(rec.payment)}</Text>
                      <View style={styles.recordActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/modal/new-record?editId=${rec.id}`)}>
                          <Pencil size={16} color={colors.grayText} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setDeleteId(rec.id)}>
                          <Trash2 size={16} color={colors.red} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          }}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/modal/new-record')} activeOpacity={0.85}>
        <Plus size={28} color={colors.white} strokeWidth={2.5} />
      </TouchableOpacity>
      <ConfirmModal visible={deleteId !== null} title="Eliminar registro" message="¿Seguro que deseas eliminar este registro?" confirmText="Eliminar" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.grayBg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.lg,
    marginBottom: 0,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.grayBorder,
    ...shadow.card,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: 16, color: colors.textDark, paddingVertical: spacing.xs },
  emptyText: { fontSize: 16, color: colors.grayText, fontWeight: '500' },
  daySection: { marginBottom: spacing.lg },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  dayDate: { fontSize: 18, fontWeight: '800', color: colors.orange },
  daySubtext: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  dayTotal: { alignItems: 'flex-end' },
  dayTotalValue: { fontSize: 20, fontWeight: '900', color: colors.white },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: colors.grayBorder,
    ...shadow.card,
  },
  recordLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  typeBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  badgeExcavacion: { backgroundColor: colors.orange },
  badgeMartillo: { backgroundColor: colors.black },
  recordInfo: { flex: 1 },
  recordType: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  recordTime: { fontSize: 13, color: colors.grayText, marginTop: 2 },
  recordMeta: { fontSize: 12, color: colors.textDark, marginTop: 2, fontWeight: '600' },
  recordObs: { fontSize: 12, color: colors.grayText, marginTop: 2, fontStyle: 'italic' },
  recordRight: { alignItems: 'flex-end' },
  recordPayment: { fontSize: 16, fontWeight: '800', color: colors.orangeDark },
  recordActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: { padding: spacing.xs },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.button,
  },
});
