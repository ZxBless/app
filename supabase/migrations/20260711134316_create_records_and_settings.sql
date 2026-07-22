/*
# Create records and settings tables for MAQUICHE app

## Purpose
Migrate data storage from local-only (SQLite/localStorage) to Supabase cloud,
enabling multi-device access and automatic backup.

## New Tables

### records
- id (bigint, primary key, auto-increment)
- date (text, not null) - YYYY-MM-DD format
- start_time (text, not null) - HH:mm format
- end_time (text, not null) - HH:mm format
- work_type (text, not null) - 'excavacion' or 'martillo'
- observation (text, nullable)
- hours (real, not null) - decimal hours worked
- payment (real, not null) - calculated payment amount
- rate (real, not null) - rate at time of record
- created_at (timestamptz, default now())

### settings
- key (text, primary key)
- value (text, not null)

## Security
- RLS enabled on both tables
- Single-tenant app (no auth): policies allow anon + authenticated full CRUD
- Data is intentionally shared/public across the single operator's devices

## Indexes
- idx_records_date on records(date) for fast date queries
*/

CREATE TABLE IF NOT EXISTS records (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  work_type text NOT NULL,
  observation text,
  hours real NOT NULL,
  payment real NOT NULL,
  rate real NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);

ALTER TABLE records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_records" ON records;
CREATE POLICY "anon_select_records" ON records FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_records" ON records;
CREATE POLICY "anon_insert_records" ON records FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_records" ON records;
CREATE POLICY "anon_update_records" ON records FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_records" ON records;
CREATE POLICY "anon_delete_records" ON records FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY NOT NULL,
  value text NOT NULL
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE
  TO anon, authenticated USING (true);

-- Seed default settings
INSERT INTO settings (key, value) VALUES ('excavacion_rate', '130')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('martillo_rate', '170')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('weekly_goal_hours', '40')
  ON CONFLICT (key) DO NOTHING;