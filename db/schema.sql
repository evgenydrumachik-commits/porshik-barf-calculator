CREATE TABLE IF NOT EXISTS porschik_state (
  id smallint PRIMARY KEY CHECK (id = 1),
  records jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  expenses jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS porschik_backups (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('snapshot', 'backup')),
  records jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS porschik_backups_created_at_idx
  ON porschik_backups (created_at DESC);

CREATE TABLE IF NOT EXISTS porschik_expense_snapshots (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  orders jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS porschik_expense_snapshots_created_at_idx
  ON porschik_expense_snapshots (created_at DESC);

CREATE TABLE IF NOT EXISTS porschik_audit (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  event jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS porschik_users (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS porschik_sessions (
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS porschik_sessions_expires_at_idx
  ON porschik_sessions (expires_at);
