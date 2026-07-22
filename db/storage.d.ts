// Type declarations for the platform-specific storage module.
// Metro resolves .native.ts or .web.ts at bundle time; this file
// satisfies the TypeScript compiler when it can't find the platform variant.

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

export interface SQLiteDatabase {
  _webShim?: boolean;
}

export declare function getDB(): Promise<SQLiteDatabase>;
export declare function getSettings(): Promise<Settings>;
export declare function saveSettings(s: Settings): Promise<void>;
export declare function insertRecord(rec: Omit<WorkRecord, 'id' | 'createdAt'>): Promise<number>;
export declare function updateRecord(id: number, rec: Omit<WorkRecord, 'id' | 'createdAt'>): Promise<void>;
export declare function deleteRecord(id: number): Promise<void>;
export declare function getRecordById(id: number): Promise<WorkRecord | null>;
export declare function getAllRecords(): Promise<WorkRecord[]>;
export declare function getRecordsByDate(date: string): Promise<WorkRecord[]>;
export declare function getRecordsByDateRange(from: string, to: string): Promise<WorkRecord[]>;
export declare function searchRecordsByDate(date: string): Promise<WorkRecord[]>;
export declare function getAllDates(): Promise<string[]>;
