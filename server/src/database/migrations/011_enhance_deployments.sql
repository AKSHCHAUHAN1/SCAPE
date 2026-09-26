-- Migration 011: Enhance deployments table
-- Sprint 8: Add workflow_content_hash and workflow_file_path columns
-- for CI/CD audit trail per spec 08.

ALTER TABLE deployments
  ADD COLUMN IF NOT EXISTS workflow_content_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS workflow_file_path    VARCHAR(500);

-- Index for efficient lookup by workflow hash
CREATE INDEX IF NOT EXISTS idx_deployments_workflow_hash
  ON deployments (workflow_content_hash)
  WHERE workflow_content_hash IS NOT NULL;
