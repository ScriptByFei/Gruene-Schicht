-- LEGACY MIGRATION ONLY. This change is included in the migration baseline.
-- Migration: replace shift_group with per-user shift_start_date

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shift_start_date TEXT DEFAULT NULL;
ALTER TABLE profiles DROP COLUMN IF EXISTS shift_group;
DROP TYPE IF EXISTS shift_group;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, name, display_name, shift_start_date, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'shift_start_date', ''),
    'employee'
  );
  RETURN NEW;
END;
$$;
