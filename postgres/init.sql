-- ==========================================
-- 1. Joomla Schema & User Isolation
-- ==========================================
CREATE SCHEMA IF NOT EXISTS joomla;

CREATE USER joomlauser WITH PASSWORD 'joomlasecret';
GRANT CONNECT ON DATABASE appdb TO joomlauser;
GRANT USAGE, CREATE ON SCHEMA joomla TO joomlauser;

-- Lock joomlauser out of public schema
REVOKE ALL ON SCHEMA public FROM joomlauser;

-- Set default search_path so Joomla never needs to qualify table names
ALTER USER joomlauser SET search_path = joomla;

-- appuser (NestJS) can read joomla schema but not write
GRANT USAGE ON SCHEMA joomla TO appuser;
ALTER DEFAULT PRIVILEGES FOR USER joomlauser IN SCHEMA joomla
  GRANT SELECT ON TABLES TO appuser;

-- ==========================================
-- 2. App Users Table (NestJS sync target)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.app_users (
  joomla_id INTEGER PRIMARY KEY,          -- Logical link to joomla.jos_users.id
  email VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb      -- Flexible app-specific settings
);

-- Index for fast lookup of unsynced users
CREATE INDEX IF NOT EXISTS idx_app_users_synced ON public.app_users(last_synced_at) WHERE last_synced_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_app_users_updated ON public.app_users(updated_at);
CREATE INDEX IF NOT EXISTS idx_app_users_settings_gin ON public.app_users USING GIN(settings);



-- Permissions
GRANT ALL ON public.app_users TO appuser;

-- ⚠️ Joomla does NOT need direct access to public.app_users.
-- All sync goes through NestJS API → keeps schemas strictly isolated.
-- If you ever need it: 
--   GRANT USAGE ON SCHEMA public TO joomlauser;
--   GRANT SELECT ON public.app_users TO joomlauser;