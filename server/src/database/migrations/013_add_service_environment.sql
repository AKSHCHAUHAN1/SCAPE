-- Migration 013: Persist the selected deployment environment per service.

ALTER TABLE services
  ADD COLUMN environment VARCHAR(20) NOT NULL DEFAULT 'development'
  CHECK (environment IN ('development', 'staging', 'production'));
