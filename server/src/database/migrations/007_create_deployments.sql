-- Migration 007: Create deployments table

CREATE TABLE deployments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id    UUID              NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  triggered_by  UUID              NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  github_run_id VARCHAR(100),
  status        deployment_status NOT NULL DEFAULT 'pending',
  commit_sha    VARCHAR(40),
  branch        VARCHAR(255)      NOT NULL DEFAULT 'main',
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deployments_service_id ON deployments (service_id);
CREATE INDEX idx_deployments_status     ON deployments (status);
CREATE INDEX idx_deployments_created_at ON deployments (created_at DESC);
