import { Platform } from 'react-native';
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

// ── Readiness guard ──────────────────────────────────────────────
let dbReady = false;
let initPromise: Promise<void> | null = null;

function isReady(): boolean {
  return dbReady;
}

export async function ensureDBReady(): Promise<void> {
  if (dbReady) return;
  if (!initPromise) initPromise = initDB();
  await initPromise;
}

// ── Platform selection ───────────────────────────────────────────
const isWeb = Platform.OS === 'web';

// ── Native SQLite implementation ─────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqliteDb: any = null;

async function initNative(): Promise<void> {
  const SQLite = await import('expo-sqlite');
  sqliteDb = await SQLite.openDatabaseAsync('maquiche.db');
  await sqliteDb.execAsync(`
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
  const defaults: Record<string, string> = {
    excavacion_rate: '130',
    martillo_rate: '170',
    weekly_goal_hours: '40',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await sqliteDb.runAsync(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNativeRow(r: any): WorkRecord {
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

// ── Web localStorage implementation ──────────────────────────────
const LS_RECORDS = 'maquiche_records';
const LS_SETTINGS = 'maquiche_settings';
const LS_TIMER = 'maquiche_timer';
let webAutoId = 1;

interface WebRecordRow {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  work_type: string;
  observation: string | null;
  hours: number;
  payment: number;
  rate: number;
  created_at: string;
  client: string | null;
  project: string | null;
  operator: string | null;
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[Maquiche] localStorage write failed:', e);
  }
}

async function initWeb(): Promise<void> {
  const records = lsGet<WebRecordRow[]>(LS_RECORDS, []);
  if (records.length > 0) {
    webAutoId = Math.max(...records.map((r) => r.id)) + 1;
  }
  const settings = lsGet<Record<string, string>>(LS_SETTINGS, {});
  const defaults: Record<string, string> = {
    excavacion_rate: '130',
    martillo_rate: '170',
    weekly_goal_hours: '40',
  };
  let changed = false;
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in settings)) {
      settings[key] = value;
      changed = true;
    }
  }
  if (changed) lsSet(LS_SETTINGS, settings);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWebRow(r: any): WorkRecord {
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

// ── Unified init ─────────────────────────────────────────────────
async function initDB(): Promise<void> {
  try {
    if (isWeb) {
      await initWeb();
    } else {
      await initNative();
    }
    dbReady = true;
  } catch (e) {
    console.error('[Maquiche] Database initialization failed:', e);
    throw e;
  }
}

// ── Public API ───────────────────────────────────────────────────

export async function insertRecord(
  rec: Omit<WorkRecord, 'id' | 'createdAt'>
): Promise<number> {
  await ensureDBReady();
  try {
    if (isWeb) {
      const records = lsGet<WebRecordRow[]>(LS_RECORDS, []);
      const id = webAutoId++;
      const row: WebRecordRow = {
        id,
        date: rec.date,
        start_time: rec.startTime,
        end_time: rec.endTime,
        work_type: rec.workType,
        observation: rec.observation ?? null,
        hours: rec.hours,
        payment: rec.payment,
        rate: rec.rate,
        created_at: new Date().toISOString(),
        client: rec.client ?? null,
        project: rec.project ?? null,
        operator: rec.operator ?? null,
      };
      records.push(row);
      lsSet(LS_RECORDS, records);
      return id;
    } else {
      const result = await sqliteDb.runAsync(
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
  } catch (e) {
    console.error('[Maquiche] insertRecord failed:', e);
    throw e;
  }
}

export async function updateRecord(
  id: number,
  rec: Omit<WorkRecord, 'id' | 'createdAt'>
): Promise<void> {
  await ensureDBReady();
  try {
    if (isWeb) {
      const records = lsGet<WebRecordRow[]>(LS_RECORDS, []);
      const idx = records.findIndex((r) => r.id === id);
      if (idx >= 0) {
        records[idx] = {
          ...records[idx],
          date: rec.date,
          start_time: rec.startTime,
          end_time: rec.endTime,
          work_type: rec.workType,
          observation: rec.observation ?? null,
          hours: rec.hours,
          payment: rec.payment,
          rate: rec.rate,
          client: rec.client ?? null,
          project: rec.project ?? null,
          operator: rec.operator ?? null,
        };
        lsSet(LS_RECORDS, records);
      }
    } else {
      await sqliteDb.runAsync(
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
  } catch (e) {
    console.error('[Maquiche] updateRecord failed:', e);
    throw e;
  }
}

export async function deleteRecord(id: number): Promise<void> {
  await ensureDBReady();
  try {
    if (isWeb) {
      const records = lsGet<WebRecordRow[]>(LS_RECORDS, []);
      lsSet(LS_RECORDS, records.filter((r) => r.id !== id));
    } else {
      await sqliteDb.runAsync('DELETE FROM records WHERE id=?', [id]);
    }
  } catch (e) {
    console.error('[Maquiche] deleteRecord failed:', e);
    throw e;
  }
}

export async function getRecordById(id: number): Promise<WorkRecord | null> {
  await ensureDBReady();
  try {
    if (isWeb) {
      const records = lsGet<WebRecordRow[]>(LS_RECORDS, []);
      const row = records.find((r) => r.id === id);
      return row ? mapWebRow(row) : null;
    } else {
      const row = await sqliteDb.getFirstAsync('SELECT * FROM records WHERE id=?', [id]);
      return row ? mapNativeRow(row) : null;
    }
  } catch (e) {
    console.error('[Maquiche] getRecordById failed:', e);
    throw e;
  }
}

export async function getAllRecords(): Promise<WorkRecord[]> {
  await ensureDBReady();
  try {
    if (isWeb) {
      const records = lsGet<WebRecordRow[]>(LS_RECORDS, []);
      return records
        .sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return a.start_time.localeCompare(b.start_time);
        })
        .map(mapWebRow);
    } else {
      const rows = await sqliteDb.getAllAsync(
        'SELECT * FROM records ORDER BY date DESC, start_time ASC'
      );
      return rows.map(mapNativeRow);
    }
  } catch (e) {
    console.error('[Maquiche] getAllRecords failed:', e);
    throw e;
  }
}

export async function getRecordsByDate(date: string): Promise<WorkRecord[]> {
  await ensureDBReady();
  try {
    if (isWeb) {
      const records = lsGet<WebRecordRow[]>(LS_RECORDS, []);
      return records
        .filter((r) => r.date === date)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map(mapWebRow);
    } else {
      const rows = await sqliteDb.getAllAsync(
        'SELECT * FROM records WHERE date=? ORDER BY start_time ASC',
        [date]
      );
      return rows.map(mapNativeRow);
    }
  } catch (e) {
    console.error('[Maquiche] getRecordsByDate failed:', e);
    throw e;
  }
}

export async function getRecordsByDateRange(
  from: string,
  to: string
): Promise<WorkRecord[]> {
  await ensureDBReady();
  try {
    if (isWeb) {
      const records = lsGet<WebRecordRow[]>(LS_RECORDS, []);
      return records
        .filter((r) => r.date >= from && r.date <= to)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.start_time.localeCompare(b.start_time);
        })
        .map(mapWebRow);
    } else {
      const rows = await sqliteDb.getAllAsync(
        'SELECT * FROM records WHERE date >= ? AND date <= ? ORDER BY date ASC, start_time ASC',
        [from, to]
      );
      return rows.map(mapNativeRow);
    }
  } catch (e) {
    console.error('[Maquiche] getRecordsByDateRange failed:', e);
    throw e;
  }
}

export async function getSettings(): Promise<Settings> {
  await ensureDBReady();
  try {
    if (isWeb) {
      const map = lsGet<Record<string, string>>(LS_SETTINGS, {});
      return {
        excavacionRate: parseFloat(map.excavacion_rate ?? '130'),
        martilloRate: parseFloat(map.martillo_rate ?? '170'),
        weeklyGoalHours: parseFloat(map.weekly_goal_hours ?? '40'),
      };
    } else {
      const rows = await sqliteDb.getAllAsync(
        'SELECT key, value FROM settings'
      );
      const map: Record<string, string> = {};
      for (const r of rows as Array<{ key: string; value: string }>) {
        map[r.key] = r.value;
      }
      return {
        excavacionRate: parseFloat(map.excavacion_rate ?? '130'),
        martilloRate: parseFloat(map.martillo_rate ?? '170'),
        weeklyGoalHours: parseFloat(map.weekly_goal_hours ?? '40'),
      };
    }
  } catch (e) {
    console.error('[Maquiche] getSettings failed, returning defaults:', e);
    return {
      excavacionRate: 130,
      martilloRate: 170,
      weeklyGoalHours: 40,
    };
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await ensureDBReady();
  try {
    if (isWeb) {
      const map = lsGet<Record<string, string>>(LS_SETTINGS, {});
      map.excavacion_rate = String(s.excavacionRate);
      map.martillo_rate = String(s.martilloRate);
      map.weekly_goal_hours = String(s.weeklyGoalHours);
      lsSet(LS_SETTINGS, map);
    } else {
      await sqliteDb.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        ['excavacion_rate', String(s.excavacionRate)]
      );
      await sqliteDb.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        ['martillo_rate', String(s.martilloRate)]
      );
      await sqliteDb.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        ['weekly_goal_hours', String(s.weeklyGoalHours)]
      );
    }
  } catch (e) {
    console.error('[Maquiche] saveSettings failed:', e);
    throw e;
  }
}

export async function saveTimerState(state: TimerState): Promise<void> {
  await ensureDBReady();
  try {
    if (isWeb) {
      lsSet(LS_TIMER, state);
    } else {
      const data = JSON.stringify(state);
      await sqliteDb.runAsync(
        `INSERT INTO timer_state (id, data, updated_at) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
        [data, Date.now()]
      );
    }
  } catch (e) {
    console.error('[Maquiche] saveTimerState failed:', e);
    throw e;
  }
}

export async function loadTimerState(): Promise<TimerState | null> {
  await ensureDBReady();
  try {
    if (isWeb) {
      return lsGet<TimerState | null>(LS_TIMER, null);
    } else {
      const row = await sqliteDb.getFirstAsync(
        'SELECT data FROM timer_state WHERE id=1'
      );
      if (!row) return null;
      try {
        return JSON.parse((row as { data: string }).data) as TimerState;
      } catch {
        return null;
      }
    }
  } catch (e) {
    console.error('[Maquiche] loadTimerState failed:', e);
    return null;
  }
}

export async function clearTimerState(): Promise<void> {
  await ensureDBReady();
  try {
    if (isWeb) {
      localStorage.removeItem(LS_TIMER);
    } else {
      await sqliteDb.runAsync('DELETE FROM timer_state WHERE id=1');
    }
  } catch (e) {
    console.error('[Maquiche] clearTimerState failed:', e);
    throw e;
  }
}
