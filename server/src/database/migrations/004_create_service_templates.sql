-- Migration 004: Create service_templates table

CREATE TABLE service_templates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(100) NOT NULL UNIQUE,
  description          TEXT,
  cloud_provider       cloud_provider NOT NULL DEFAULT 'aws',
  resource_types       JSONB        NOT NULL DEFAULT '[]'::JSONB,
  terraform_module_path VARCHAR(255) NOT NULL,
  cicd_template_path   VARCHAR(255) NOT NULL,
  is_active            BOOLEAN      NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for active template lookups
CREATE INDEX idx_service_templates_active ON service_templates (is_active) WHERE is_active = true;
