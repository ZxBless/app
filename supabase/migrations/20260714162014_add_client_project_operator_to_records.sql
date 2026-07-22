/*
# Add client, project, and operator fields to records

## Purpose
Enable professional PDF/Excel reports that include client name, project/obra name,
and operator name for each work segment.

## Changes to existing tables
- records: add three new nullable text columns:
  - client (text) — client name for the work segment
  - project (text) — obra or project name
  - operator (text) — operator name

## Security
- No RLS policy changes. Existing anon/authenticated CRUD policies remain in place.
- New columns are nullable with no default, so existing rows are unaffected.

## Notes
1. Columns are nullable so existing records and future manual entries work without these fields.
2. No data is lost — this is purely additive.
*/

ALTER TABLE records
  ADD COLUMN IF NOT EXISTS client text,
  ADD COLUMN IF NOT EXISTS project text,
  ADD COLUMN IF NOT EXISTS operator text;
