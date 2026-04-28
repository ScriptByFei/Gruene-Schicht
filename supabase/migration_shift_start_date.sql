-- Migration: Replace shift_group enum with shift_start_date text column
-- Run this in the Supabase SQL editor

-- 1. Add the new column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS shift_start_date TEXT DEFAULT NULL;

-- 2. Drop the old shift_group column
ALTER TABLE profiles
  DROP COLUMN IF EXISTS shift_group;

-- 3. Drop the shift_group enum type (only after all references are removed)
DROP TYPE IF EXISTS shift_group;
