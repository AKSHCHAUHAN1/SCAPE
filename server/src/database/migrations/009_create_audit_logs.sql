-- Migration 009: Create audit_logs table
-- This table is APPEND-ONLY. No UPDATE or DELETE operations allowed by the application.

CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id   UUID,
  payload       JSONB        NOT NULL DEFAULT '{}'::JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_audit_logs_actor_id    ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs (resource_id);
CREATE INDEX idx_audit_logs_action      ON audit_logs (action);
CREATE INDEX idx_audit_logs_created_at  ON audit_logs (created_at DESC);

-- Composite index for resource-scoped queries
CREATE INDEX idx_audit_logs_resource    ON audit_logs (resource_type, resource_id);
