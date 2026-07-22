import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Save, Pickaxe, Hammer, RotateCcw } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme/theme';
import { getSettings, insertRecord, type WorkType, type Settings } from '@/db/database';
import {
  formatHours,
  formatCurrency,
  todayString,
  nowTimeString,
  WORK_TYPE_LABELS,
} from '@/utils/calculations';

type TimerState = 'idle' | 'running' | 'paused' | 'stopped';

interface Segment {
  workType: WorkType;
  ms: number;
  startTime: string;
  endTime: string;
}

function tsToTimeString(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDuration(totalMs: number): string {
  const totalMin = Math.floor(totalMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export default function CronometroScreen() {
  const [state, setState] = useState<TimerState>('idle');
  const [activeWorkType, setActiveWorkType] = useState<WorkType>('excavacion');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [shiftStartDisplay, setShiftStartDisplay] = useState('');
  const [rates, setRates] = useState({ excavacion: 130, martillo: 170 });
  const [saving, setSaving] = useState(false);
  const [observation, setObservation] = useState('');
  const [client, setClient] = useState('');
  const [project, setProject] = useState('');
  const [operator, setOperator] = useState('');

  const segmentsRef = useRef<Segment[]>([]);
  const currentSegmentRef = useRef<{ workType: WorkType; startTs: number; startTime: string } | null>(null);
  const shiftStartRef = useRef('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const computePerToolMs = () => {
    const result = { excavacion: 0, martillo: 0 };
    for (const seg of segmentsRef.current) {
      result[seg.workType] += seg.ms;
    }
    if (currentSegmentRef.current !== null) {
      result[currentSegmentRef.current.workType] += Date.now() - currentSegmentRef.current.startTs;
    }
    return result;
  };

  const closeCurrentSegment = (): Segment | null => {
    if (currentSegmentRef.current === null) return null;
    const endTs = Date.now();
    const seg: Segment = {
      workType: currentSegmentRef.current.workType,
      ms: endTs - currentSegmentRef.current.startTs,
      startTime: currentSegmentRef.current.startTime,
      endTime: tsToTimeString(endTs),
    };
    currentSegmentRef.current = null;
    return seg;
  };

  useEffect(() => {
    getSettings().then((s: Settings) =>
      setRates({ excavacion: s.excavacionRate, martillo: s.martilloRate })
    );
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        currentSegmentRef.current !== null
      ) {
        const perTool = computePerToolMs();
        setElapsedMs(perTool.excavacion + perTool.martillo);
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = setInterval(() => {
        const perTool = computePerToolMs();
        setElapsedMs(perTool.excavacion + perTool.martillo);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

  const handleStart = () => {
    const now = Date.now();
    segmentsRef.current = [];
    currentSegmentRef.current = {
      workType: activeWorkType,
      startTs: now,
      startTime: tsToTimeString(now),
    };
    shiftStartRef.current = tsToTimeString(now);
    setShiftStartDisplay(tsToTimeString(now));
    setElapsedMs(0);
    setState('running');
  };

  const handlePause = () => {
    const seg = closeCurrentSegment();
    if (seg) segmentsRef.current.push(seg);
    setState('paused');
  };

  const handleResume = () => {
    const now = Date.now();
    currentSegmentRef.current = {
      workType: activeWorkType,
      startTs: now,
      startTime: tsToTimeString(now),
    };
    setState('running');
  };

  const handleStop = () => {
    const seg = closeCurrentSegment();
    if (seg) segmentsRef.current.push(seg);
    const perTool = computePerToolMs();
    setElapsedMs(perTool.excavacion + perTool.martillo);
    setState('stopped');
  };

  const handleToolSwitch = (newType: WorkType) => {
    if (state === 'idle') {
      setActiveWorkType(newType);
      return;
    }
    if (state === 'stopped') return;
    if (newType === activeWorkType) return;

    const seg = closeCurrentSegment();
    if (seg) segmentsRef.current.push(seg);

    if (state === 'running') {
      const now = Date.now();
      currentSegmentRef.current = {
        workType: newType,
        startTs: now,
        startTime: tsToTimeString(now),
      };
    }
    setActiveWorkType(newType);
  };

  const handleReset = () => {
    segmentsRef.current = [];
    currentSegmentRef.current = null;
    shiftStartRef.current = '';
    setState('idle');
    setElapsedMs(0);
    setShiftStartDisplay('');
    setObservation('');
    setClient('');
    setProject('');
    setOperator('');
  };

  const handleSave = async () => {
    const allSegments = segmentsRef.current;
    const totalSec = Math.floor(allSegments.reduce((sum, s) => sum + s.ms, 0) / 1000);
    if (totalSec < 60) {
      Alert.alert('Muy corto', 'Debes registrar al menos 1 minuto.');
      return;
    }
    setSaving(true);
    try {
      for (const seg of allSegments) {
        const sec = Math.floor(seg.ms / 1000);
        if (sec < 1) continue;
        const hours = Math.round((sec / 3600) * 100) / 100;
        const rate = seg.workType === 'excavacion' ? rates.excavacion : rates.martillo;
        const payment = Math.round(hours * rate * 100) / 100;
        await insertRecord({
          date: todayString(),
          startTime: seg.startTime,
          endTime: seg.endTime,
          workType: seg.workType,
          observation: observation.trim() || null,
          hours,
          payment,
          rate,
          client: client.trim() || null,
          project: project.trim() || null,
          operator: operator.trim() || null,
        });
      }
      handleReset();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el registro.');
    } finally {
      setSaving(false);
    }
  };

  const formatTimer = (totalMs: number) => {
    const totalSec = Math.floor(totalMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const perToolMs = computePerToolMs();
  const totalMs = perToolMs.excavacion + perToolMs.martillo;
  const excHours = perToolMs.excavacion / 3600000;
  const martHours = perToolMs.martillo / 3600000;
  const excPayment = excHours * rates.excavacion;
  const martPayment = martHours * rates.martillo;
  const totalPayment = excPayment + martPayment;

  const canSwitchTools = state === 'idle' || state === 'running' || state === 'paused';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Cronómetro</Text>

      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeBtn, activeWorkType === 'excavacion' && styles.typeBtnActive]}
          onPress={() => handleToolSwitch('excavacion')}
          disabled={!canSwitchTools}
        >
          <Pickaxe
            size={28}
            color={activeWorkType === 'excavacion' ? colors.black : colors.grayText}
            strokeWidth={2.5}
          />
          <Text style={[styles.typeLabel, activeWorkType === 'excavacion' && styles.typeLabelActive]}>
            {WORK_TYPE_LABELS.excavacion}
          </Text>
          <Text style={[styles.typeRate, activeWorkType === 'excavacion' && styles.typeRateActive]}>
            {formatCurrency(rates.excavacion)}/h
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeBtn, activeWorkType === 'martillo' && styles.typeBtnActive]}
          onPress={() => handleToolSwitch('martillo')}
          disabled={!canSwitchTools}
        >
          <Hammer
            size={28}
            color={activeWorkType === 'martillo' ? colors.black : colors.grayText}
            strokeWidth={2.5}
          />
          <Text style={[styles.typeLabel, activeWorkType === 'martillo' && styles.typeLabelActive]}>
            {WORK_TYPE_LABELS.martillo}
          </Text>
          <Text style={[styles.typeRate, activeWorkType === 'martillo' && styles.typeRateActive]}>
            {formatCurrency(rates.martillo)}/h
          </Text>
        </TouchableOpacity>
      </View>

      {state === 'running' && (
        <Text style={styles.switchHint}>Toca una herramienta para cambiar sin detener</Text>
      )}

      <View style={styles.timerCard}>
        {state === 'paused' && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedBadgeText}>EN PAUSA</Text>
          </View>
        )}
        <Text style={styles.timerLabel}>Tiempo transcurrido</Text>
        <Text style={styles.timerDisplay}>{formatTimer(totalMs)}</Text>
        {shiftStartDisplay ? (
          <Text style={styles.timerSubtext}>Inició a las {shiftStartDisplay}</Text>
        ) : (
          <Text style={styles.timerSubtext}>Presiona iniciar para comenzar</Text>
        )}

        {(state === 'running' || state === 'paused') && (
          <>
            <View style={styles.timerDivider} />
            <Text style={styles.timerLabel}>Ganado hasta ahora</Text>
            <Text style={styles.paymentDisplay}>{formatCurrency(totalPayment)}</Text>
          </>
        )}
      </View>

      {(state === 'running' || state === 'paused') && (
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Desglose por herramienta</Text>
          <View style={[styles.breakdownRow, activeWorkType === 'excavacion' && styles.breakdownRowActive]}>
            <View style={styles.breakdownLeft}>
              <Pickaxe size={18} color={colors.textDark} strokeWidth={2.5} />
              <Text style={styles.breakdownName}>{WORK_TYPE_LABELS.excavacion}</Text>
            </View>
            <View style={styles.breakdownRight}>
              <Text style={styles.breakdownTime}>{formatTimer(perToolMs.excavacion)}</Text>
              <Text style={styles.breakdownPayment}>{formatCurrency(excPayment)}</Text>
            </View>
          </View>
          <View style={[styles.breakdownRow, activeWorkType === 'martillo' && styles.breakdownRowActive]}>
            <View style={styles.breakdownLeft}>
              <Hammer size={18} color={colors.textDark} strokeWidth={2.5} />
              <Text style={styles.breakdownName}>{WORK_TYPE_LABELS.martillo}</Text>
            </View>
            <View style={styles.breakdownRight}>
              <Text style={styles.breakdownTime}>{formatTimer(perToolMs.martillo)}</Text>
              <Text style={styles.breakdownPayment}>{formatCurrency(martPayment)}</Text>
            </View>
          </View>
        </View>
      )}

      {state === 'idle' && (
        <>
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Datos del turno (opcional)</Text>
            <View style={styles.metaInputRow}>
              <Text style={styles.metaLabel}>Cliente</Text>
              <TextInput
                style={styles.metaInput}
                value={client}
                onChangeText={setClient}
                placeholder="Nombre del cliente"
                placeholderTextColor={colors.grayText}
              />
            </View>
            <View style={styles.metaInputRow}>
              <Text style={styles.metaLabel}>Obra / Proyecto</Text>
              <TextInput
                style={styles.metaInput}
                value={project}
                onChangeText={setProject}
                placeholder="Nombre de la obra"
                placeholderTextColor={colors.grayText}
              />
            </View>
            <View style={styles.metaInputRow}>
              <Text style={styles.metaLabel}>Operador</Text>
              <TextInput
                style={styles.metaInput}
                value={operator}
                onChangeText={setOperator}
                placeholder="Nombre del operador"
                placeholderTextColor={colors.grayText}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Play size={28} color={colors.black} strokeWidth={2.5} fill={colors.black} />
            <Text style={styles.startBtnText}>Iniciar</Text>
          </TouchableOpacity>
        </>
      )}

      {state === 'running' && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.pauseBtn} onPress={handlePause}>
            <Pause size={26} color={colors.yellow} strokeWidth={2.5} fill={colors.yellow} />
            <Text style={styles.pauseBtnText}>Pausar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
            <Square size={26} color={colors.red} strokeWidth={2.5} fill={colors.red} />
            <Text style={styles.stopBtnText}>Detener</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'paused' && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.startBtn} onPress={handleResume}>
            <Play size={26} color={colors.black} strokeWidth={2.5} fill={colors.black} />
            <Text style={styles.startBtnText}>Continuar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
            <Square size={26} color={colors.red} strokeWidth={2.5} fill={colors.red} />
            <Text style={styles.stopBtnText}>Detener</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'stopped' && (
        <>
          <View style={styles.segmentsCard}>
            <Text style={styles.segmentsTitle}>Tramos del turno</Text>
            {segmentsRef.current.map((seg, i) => {
              const segHours = seg.ms / 3600000;
              const segRate = seg.workType === 'excavacion' ? rates.excavacion : rates.martillo;
              const segPayment = segHours * segRate;
              return (
                <View key={i} style={styles.segmentRow}>
                  <View style={styles.segmentHeader}>
                    {seg.workType === 'excavacion' ? (
                      <Pickaxe size={16} color={colors.yellow} strokeWidth={2.5} />
                    ) : (
                      <Hammer size={16} color={colors.yellow} strokeWidth={2.5} />
                    )}
                    <Text style={styles.segmentToolName}>
                      {WORK_TYPE_LABELS[seg.workType]}
                    </Text>
                    <Text style={styles.segmentIndex}>#{i + 1}</Text>
                  </View>
                  <View style={styles.segmentDetails}>
                    <View style={styles.segmentDetailRow}>
                      <Text style={styles.segmentDetailLabel}>Inicio</Text>
                      <Text style={styles.segmentDetailValue}>{seg.startTime}</Text>
                    </View>
                    <View style={styles.segmentDetailRow}>
                      <Text style={styles.segmentDetailLabel}>Fin</Text>
                      <Text style={styles.segmentDetailValue}>{seg.endTime}</Text>
                    </View>
                    <View style={styles.segmentDetailRow}>
                      <Text style={styles.segmentDetailLabel}>Duración</Text>
                      <Text style={styles.segmentDetailValue}>{formatDuration(seg.ms)}</Text>
                    </View>
                    <View style={styles.segmentDetailRow}>
                      <Text style={styles.segmentDetailLabel}>Pago</Text>
                      <Text style={styles.segmentDetailValueBold}>{formatCurrency(segPayment)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Totales por herramienta</Text>

            {perToolMs.excavacion > 0 && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Pickaxe size={18} color={colors.yellow} strokeWidth={2.5} />
                  <Text style={styles.summaryName}>{WORK_TYPE_LABELS.excavacion}</Text>
                </View>
                <Text style={styles.summaryHours}>{formatHours(excHours)}</Text>
                <Text style={styles.summaryPayment}>{formatCurrency(excPayment)}</Text>
              </View>
            )}

            {perToolMs.martillo > 0 && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Hammer size={18} color={colors.yellow} strokeWidth={2.5} />
                  <Text style={styles.summaryName}>{WORK_TYPE_LABELS.martillo}</Text>
                </View>
                <Text style={styles.summaryHours}>{formatHours(martHours)}</Text>
                <Text style={styles.summaryPayment}>{formatCurrency(martPayment)}</Text>
              </View>
            )}

            <View style={styles.summaryDivider} />

            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>Total general</Text>
              <Text style={styles.summaryTotalHours}>{formatHours(excHours + martHours)}</Text>
              <Text style={styles.summaryTotalPayment}>{formatCurrency(totalPayment)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.textInputBtn}
            onPress={() => {
              if (observation.trim()) {
                setObservation('');
              } else {
                setObservation(' ');
              }
            }}
          >
            <Text style={styles.obsToggleText}>
              {observation.trim() ? 'Quitar observación' : 'Agregar observación'}
            </Text>
          </TouchableOpacity>

          {observation.trim() !== '' && (
            <TextInput
              style={styles.observation}
              value={observation}
              onChangeText={setObservation}
              placeholder="Ej: Trabajo en zona norte..."
              placeholderTextColor={colors.grayText}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          )}

          <View style={styles.stoppedActions}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Save size={24} color={colors.yellow} strokeWidth={2.5} />
              <Text style={styles.saveText}>
                {saving ? 'Guardando...' : 'Guardar Registro'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.discardBtn} onPress={handleReset}>
              <RotateCcw size={22} color={colors.grayText} strokeWidth={2.5} />
              <Text style={styles.discardText}>Descartar</Text>
            </TouchableOpacity>
          </View>
        </>
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
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.grayBorder,
    paddingVertical: spacing.lg,
  },
  typeBtnActive: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellowDark,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.grayText,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  typeLabelActive: {
    color: colors.black,
  },
  typeRate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.grayText,
    marginTop: 2,
  },
  typeRateActive: {
    color: colors.black,
  },
  switchHint: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.yellowDark,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  timerCard: {
    backgroundColor: colors.black,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pausedBadge: {
    backgroundColor: colors.yellow,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  pausedBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.black,
    letterSpacing: 1,
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  timerDisplay: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.yellow,
    fontVariant: ['tabular-nums'],
  },
  timerSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: spacing.sm,
  },
  timerDivider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: spacing.md,
  },
  paymentDisplay: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.yellow,
    fontVariant: ['tabular-nums'],
  },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.grayBorder,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.grayText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  breakdownRowActive: {
    backgroundColor: colors.yellowDim,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  breakdownTime: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
    fontVariant: ['tabular-nums'],
  },
  breakdownPayment: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.yellowDark,
    minWidth: 80,
    textAlign: 'right',
  },
  startBtn: {
    flexDirection: 'row',
    backgroundColor: colors.yellow,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  metaCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.grayBorder,
  },
  metaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.grayText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  metaInputRow: {
    marginBottom: spacing.sm,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 4,
  },
  metaInput: {
    borderWidth: 2,
    borderColor: colors.grayBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textDark,
  },
  startBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.black,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pauseBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pauseBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.yellow,
  },
  stopBtn: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.red,
  },
  stopBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.red,
  },
  segmentsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.grayBorder,
  },
  segmentsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.grayText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  segmentRow: {
    backgroundColor: colors.grayBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  segmentToolName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textDark,
    flex: 1,
  },
  segmentIndex: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.grayText,
  },
  segmentDetails: {
    gap: spacing.xs,
  },
  segmentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  segmentDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.grayText,
  },
  segmentDetailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
    fontVariant: ['tabular-nums'],
  },
  segmentDetailValueBold: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.yellowDark,
    fontVariant: ['tabular-nums'],
  },
  summaryCard: {
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  summaryName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  summaryHours: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    width: 70,
    textAlign: 'center',
  },
  summaryPayment: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.yellow,
    width: 100,
    textAlign: 'right',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: spacing.sm,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.white,
    flex: 1,
  },
  summaryTotalHours: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.white,
    width: 70,
    textAlign: 'center',
  },
  summaryTotalPayment: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.yellow,
    width: 100,
    textAlign: 'right',
  },
  textInputBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  obsToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.yellowDark,
  },
  observation: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.grayBorder,
    fontSize: 16,
    color: colors.textDark,
    minHeight: 60,
    marginBottom: spacing.md,
  },
  stoppedActions: {
    gap: spacing.md,
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  saveText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.yellow,
  },
  discardBtn: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.grayBorder,
  },
  discardText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.grayText,
  },
});
