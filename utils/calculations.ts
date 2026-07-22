export type WorkType = 'excavacion' | 'martillo';

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  excavacion: 'Excavación',
  martillo: 'Martillo Hidráulico',
};

export const WORK_TYPE_SHORT: Record<WorkType, string> = {
  excavacion: 'Excavación',
  martillo: 'Martillo',
};

export function formatCurrency(amount: number): string {
  return `S/${amount.toFixed(2)}`;
}

export function formatHours(hours: number): string {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nowTimeString(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function tsToTimeString(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDuration(totalMs: number): string {
  const totalMin = Math.floor(totalMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export interface DaySummary {
  date: string;
  recordCount: number;
  excavacionHours: number;
  martilloHours: number;
  totalHours: number;
  excavacionPayment: number;
  martilloPayment: number;
  totalPayment: number;
}

export function buildMultiDaySummary(records: WorkRecord[]): DaySummary[] {
  const map = new Map<string, DaySummary>();
  for (const r of records) {
    let s = map.get(r.date);
    if (!s) {
      s = {
        date: r.date,
        recordCount: 0,
        excavacionHours: 0,
        martilloHours: 0,
        totalHours: 0,
        excavacionPayment: 0,
        martilloPayment: 0,
        totalPayment: 0,
      };
      map.set(r.date, s);
    }
    s.recordCount++;
    if (r.workType === 'excavacion') {
      s.excavacionHours += r.hours;
      s.excavacionPayment += r.payment;
    } else {
      s.martilloHours += r.hours;
      s.martilloPayment += r.payment;
    }
    s.totalHours += r.hours;
    s.totalPayment += r.payment;
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

// Forward declaration — WorkRecord is defined in db/database.ts
// This interface is structurally compatible.
export interface WorkRecord {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  workType: WorkType;
  observation: string | null;
  hours: number;
  payment: number;
  rate: number;
  createdAt: string;
  client: string | null;
  project: string | null;
  operator: string | null;
}
