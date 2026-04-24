-- create joomla schema for Joomla CMS tables
CREATE SCHEMA IF NOT EXISTS joomla;

-- dedicated user for Joomla — owns only joomla schema
CREATE USER joomlauser WITH PASSWORD 'joomlasecret';
GRANT CONNECT ON DATABASE appdb TO joomlauser;
GRANT USAGE, CREATE ON SCHEMA joomla TO joomlauser;

-- lock joomlauser out of public schema
REVOKE ALL ON SCHEMA public FROM joomlauser;

-- set default search_path so Joomla never needs to qualify table names
ALTER USER joomlauser SET search_path = joomla;

-- appuser (NestJS) can read joomla schema but not write
GRANT USAGE ON SCHEMA joomla TO appuser;
ALTER DEFAULT PRIVILEGES FOR USER joomlauser IN SCHEMA joomla
  GRANT SELECT ON TABLES TO appuser;
