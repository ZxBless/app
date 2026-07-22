import { supabase } from './supabaseClient';

export type WorkType = 'excavacion' | 'martillo';

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

interface DbRecord {
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

function mapRow(r: DbRecord): WorkRecord {
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

export interface SQLiteDatabase {
  _webShim?: boolean;
}

export async function getDB(): Promise<SQLiteDatabase> {
  return { _webShim: true };
}

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('key, value');
  if (error) {
    return { excavacionRate: 130, martilloRate: 170, weeklyGoalHours: 40 };
  }
  const map = new Map(data.map((r: { key: string; value: string }) => [r.key, r.value]));
  return {
    excavacionRate: parseFloat(map.get('excavacion_rate') ?? '130'),
    martilloRate: parseFloat(map.get('martillo_rate') ?? '170'),
    weeklyGoalHours: parseFloat(map.get('weekly_goal_hours') ?? '40'),
  };
}

export async function saveSettings(s: Settings): Promise<void> {
  const rows = [
    { key: 'excavacion_rate', value: String(s.excavacionRate) },
    { key: 'martillo_rate', value: String(s.martilloRate) },
    { key: 'weekly_goal_hours', value: String(s.weeklyGoalHours) },
  ];
  for (const row of rows) {
    await supabase
      .from('settings')
      .upsert(row, { onConflict: 'key' });
  }
}

export async function insertRecord(
  rec: Omit<WorkRecord, 'id' | 'createdAt'>
): Promise<number> {
  const { data, error } = await supabase
    .from('records')
    .insert({
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
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Insert failed');
  return data.id;
}

export async function updateRecord(
  id: number,
  rec: Omit<WorkRecord, 'id' | 'createdAt'>
): Promise<void> {
  const { error } = await supabase
    .from('records')
    .update({
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
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteRecord(id: number): Promise<void> {
  const { error } = await supabase.from('records').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getRecordById(id: number): Promise<WorkRecord | null> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as DbRecord);
}

export async function getAllRecords(): Promise<WorkRecord[]> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .order('date', { ascending: false })
    .order('start_time', { ascending: true });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function getRecordsByDate(date: string): Promise<WorkRecord[]> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('date', date)
    .order('start_time', { ascending: true });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function getRecordsByDateRange(
  from: string,
  to: string
): Promise<WorkRecord[]> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function searchRecordsByDate(date: string): Promise<WorkRecord[]> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .ilike('date', `%${date}%`)
    .order('date', { ascending: false })
    .order('start_time', { ascending: true });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function getAllDates(): Promise<string[]> {
  const { data, error } = await supabase
    .from('records')
    .select('date')
    .order('date', { ascending: false });
  if (error || !data) return [];
  const dates = new Set(data.map((r: { date: string }) => r.date));
  return Array.from(dates);
}
