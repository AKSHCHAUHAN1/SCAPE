-- Migration 010: Enhance provisioning_jobs table
-- Sprint 7: Add terraform_logs, terraform_plan_output, and timeout_at columns
-- to support log streaming, plan capture, and job timeout enforcement.

ALTER TABLE provisioning_jobs
  ADD COLUMN IF NOT EXISTS terraform_logs       TEXT,
  ADD COLUMN IF NOT EXISTS terraform_plan_output TEXT,
  ADD COLUMN IF NOT EXISTS timeout_at           TIMESTAMPTZ;

-- Add manual_intervention_required to job_status enum if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'manual_intervention_required'
      AND enumtypid = 'job_status'::regtype
  ) THEN
    ALTER TYPE job_status ADD VALUE 'manual_intervention_required';
  END IF;
END$$;
