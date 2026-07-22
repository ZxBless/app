import * as SQLite from 'expo-sqlite';
import type { WorkType } from '@/utils/calculations';
export type { WorkType };

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

export interface Settings {
  excavacionRate: number;
  martilloRate: number;
  weeklyGoalHours: number;
}

export interface PersistedSegment {
  workType: WorkType;
  startTs: number;
  startTime: string;
  endTime: string | null;
  ms: number;
}

export interface TimerState {
  status: 'running' | 'paused';
  activeWorkType: WorkType;
  shiftStartTs: number;
  shiftStartTime: string;
  currentSegmentStartTs: number | null;
  currentSegmentStartTime: string | null;
  segments: PersistedSegment[];
  client: string | null;
  project: string | null;
  operator: string | null;
  observation: string | null;
}

const DB_NAME = 'maquiche.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      work_type TEXT NOT NULL,
      observation TEXT,
      hours REAL NOT NULL,
      payment REAL NOT NULL,
      rate REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      client TEXT,
      project TEXT,
      operator TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS timer_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await seedSettings(dbInstance);
  return dbInstance;
}

async function seedSettings(db: SQLite.SQLiteDatabase): Promise<void> {
  const defaults: Record<string, string> = {
    excavacion_rate: '130',
    martillo_rate: '170',
    weekly_goal_hours: '40',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.runAsync(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }
}

function mapRow(r: any): WorkRecord {
  return {
    id: r.id,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    workType: r.work_type as WorkType,
    observation: r.observation,
    hours: r.hours,
    payment: r.payment,
    rate: r.rate,
    createdAt: r.created_at,
    client: r.client,
    project: r.project,
    operator: r.operator,
  };
}

export async function insertRecord(
  rec: Omit<WorkRecord, 'id' | 'createdAt'>
): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO records (date, start_time, end_time, work_type, observation, hours, payment, rate, client, project, operator)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rec.date,
      rec.startTime,
      rec.endTime,
      rec.workType,
      rec.observation ?? null,
      rec.hours,
      rec.payment,
      rec.rate,
      rec.client ?? null,
      rec.project ?? null,
      rec.operator ?? null,
    ]
  );
  return result.lastInsertRowId as number;
}

export async function updateRecord(
  id: number,
  rec: Omit<WorkRecord, 'id' | 'createdAt'>
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE records SET date=?, start_time=?, end_time=?, work_type=?, observation=?, hours=?, payment=?, rate=?, client=?, project=?, operator=?
     WHERE id=?`,
    [
      rec.date,
      rec.startTime,
      rec.endTime,
      rec.workType,
      rec.observation ?? null,
      rec.hours,
      rec.payment,
      rec.rate,
      rec.client ?? null,
      rec.project ?? null,
      rec.operator ?? null,
      id,
    ]
  );
}

export async function deleteRecord(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM records WHERE id=?', [id]);
}

export async function getRecordById(id: number): Promise<WorkRecord | null> {
  const db = await getDB();
  const row = await db.getFirstAsync('SELECT * FROM records WHERE id=?', [id]);
  return row ? mapRow(row) : null;
}

export async function getAllRecords(): Promise<WorkRecord[]> {
  const db = await getDB();
  const rows = await db.getAllAsync('SELECT * FROM records ORDER BY date DESC, start_time ASC');
  return rows.map(mapRow);
}

export async function getRecordsByDate(date: string): Promise<WorkRecord[]> {
  const db = await getDB();
  const rows = await db.getAllAsync(
    'SELECT * FROM records WHERE date=? ORDER BY start_time ASC',
    [date]
  );
  return rows.map(mapRow);
}

export async function getRecordsByDateRange(
  from: string,
  to: string
): Promise<WorkRecord[]> {
  const db = await getDB();
  const rows = await db.getAllAsync(
    'SELECT * FROM records WHERE date >= ? AND date <= ? ORDER BY date ASC, start_time ASC',
    [from, to]
  );
  return rows.map(mapRow);
}

export async function getSettings(): Promise<Settings> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return {
    excavacionRate: parseFloat(map.excavacion_rate ?? '130'),
    martilloRate: parseFloat(map.martillo_rate ?? '170'),
    weeklyGoalHours: parseFloat(map.weekly_goal_hours ?? '40'),
  };
}

export async function saveSettings(s: Settings): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    ['excavacion_rate', String(s.excavacionRate)]
  );
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    ['martillo_rate', String(s.martilloRate)]
  );
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    ['weekly_goal_hours', String(s.weeklyGoalHours)]
  );
}

export async function saveTimerState(state: TimerState): Promise<void> {
  const db = await getDB();
  const data = JSON.stringify(state);
  await db.runAsync(
    `INSERT INTO timer_state (id, data, updated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
    [data, Date.now()]
  );
}

export async function loadTimerState(): Promise<TimerState | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ data: string }>(
    'SELECT data FROM timer_state WHERE id=1'
  );
  if (!row) return null;
  try {
    return JSON.parse(row.data) as TimerState;
  } catch {
    return null;
  }
}

export async function clearTimerState(): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM timer_state WHERE id=1');
}
