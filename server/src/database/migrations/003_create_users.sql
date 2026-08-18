-- Migration 003: Create users table

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           user_role    NOT NULL DEFAULT 'developer',
  team_id        UUID         REFERENCES teams(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login_at  TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_email   ON users (email);
CREATE INDEX idx_users_team_id ON users (team_id);
CREATE INDEX idx_users_role    ON users (role);
