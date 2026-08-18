-- Migration 006: Create provisioning_jobs table

CREATE TABLE provisioning_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id          UUID       NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  triggered_by        UUID       NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status              job_status NOT NULL DEFAULT 'queued',
  terraform_workspace VARCHAR(255),
  terraform_run_id    VARCHAR(255),
  error_message       TEXT,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_provisioning_jobs_service_id ON provisioning_jobs (service_id);
CREATE INDEX idx_provisioning_jobs_status     ON provisioning_jobs (status);
CREATE INDEX idx_provisioning_jobs_created_at ON provisioning_jobs (created_at DESC);
