-- ============================================================
-- Gruene-Schicht – Supabase Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('employee', 'admin');
CREATE TYPE shift_group AS ENUM ('Früh', 'Spät', 'Nacht', 'Tagschicht', 'Sonstige');
CREATE TYPE event_status AS ENUM ('draft', 'active', 'closed');
CREATE TYPE poll_type AS ENUM ('single_choice', 'multiple_choice');
CREATE TYPE attendance_status AS ENUM ('attending', 'maybe', 'declined');
CREATE TYPE suggestion_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  department    TEXT NOT NULL DEFAULT '',
  shift_group   shift_group NOT NULL DEFAULT 'Tagschicht',
  role          user_role NOT NULL DEFAULT 'employee',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup (trigger fills basic data)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, name, display_name, department, shift_group, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    COALESCE((NEW.raw_user_meta_data->>'shift_group')::shift_group, 'Tagschicht'),
    'employee'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- EVENTS
-- ============================================================

CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  status          event_status NOT NULL DEFAULT 'draft',
  final_location  TEXT,
  final_date      TEXT,
  final_note      TEXT,
  -- Keep historical events if the creator account gets deleted.
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- POLLS
-- ============================================================

CREATE TABLE polls (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  type        poll_type NOT NULL DEFAULT 'single_choice',
  is_open     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- POLL OPTIONS
-- ============================================================

CREATE TABLE poll_options (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id     UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- VOTES
-- ============================================================

CREATE TABLE votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id     UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id   UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- No duplicate votes per user per option
  UNIQUE (poll_id, option_id, user_id)
);

-- ============================================================
-- EVENT ATTENDANCE
-- ============================================================

CREATE TABLE event_attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      attendance_status NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER event_attendance_updated_at
  BEFORE UPDATE ON event_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SUGGESTIONS
-- ============================================================

CREATE TABLE suggestions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  status      suggestion_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- PROFILES
CREATE POLICY "profiles_read_own"    ON profiles FOR SELECT USING (auth.uid() = id);
-- Suggestions join against profiles(display_name, shift_group), so authenticated users
-- need SELECT access to referenced profile rows.
CREATE POLICY "profiles_read_authenticated" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- Admins can read all profiles
CREATE POLICY "profiles_read_admin"  ON profiles FOR SELECT USING (is_admin());

-- EVENTS
-- Everyone logged in can read active/closed events; admins see all
CREATE POLICY "events_read_public"   ON events FOR SELECT
  USING (status IN ('active', 'closed') OR is_admin());
CREATE POLICY "events_write_admin"   ON events FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- POLLS
CREATE POLICY "polls_read"           ON polls FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "polls_write_admin"    ON polls FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- POLL OPTIONS
CREATE POLICY "poll_options_read"    ON poll_options FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "poll_options_write"   ON poll_options FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- VOTES
-- Users can read all votes (for results), but only write/delete their own
CREATE POLICY "votes_read"           ON votes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "votes_insert_own"     ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete_own"     ON votes FOR DELETE USING (auth.uid() = user_id);

-- EVENT ATTENDANCE
CREATE POLICY "attendance_read"         ON event_attendance FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "attendance_insert_own"   ON event_attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "attendance_update_own"   ON event_attendance FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "attendance_delete_own"   ON event_attendance FOR DELETE USING (auth.uid() = user_id);

-- SUGGESTIONS
CREATE POLICY "suggestions_read"        ON suggestions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "suggestions_insert_own"  ON suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Only admins can update status
CREATE POLICY "suggestions_update_admin" ON suggestions FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_polls_event_id ON polls(event_id);
CREATE INDEX idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX idx_votes_poll_id ON votes(poll_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_attendance_event_id ON event_attendance(event_id);
CREATE INDEX idx_suggestions_event_id ON suggestions(event_id);
