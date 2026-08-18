-- Migration 005: Create services table

CREATE TABLE services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  owner_id        UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  team_id         UUID           NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  template_id     UUID           NOT NULL REFERENCES service_templates(id) ON DELETE RESTRICT,
  status          service_status NOT NULL DEFAULT 'pending',
  region          VARCHAR(50)    NOT NULL DEFAULT 'ap-south-1',
  repository_url  VARCHAR(500),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Unique service name per team
  CONSTRAINT uq_services_name_team UNIQUE (name, team_id)
);

-- Indexes
CREATE INDEX idx_services_owner_id    ON services (owner_id);
CREATE INDEX idx_services_team_id     ON services (team_id);
CREATE INDEX idx_services_template_id ON services (template_id);
CREATE INDEX idx_services_status      ON services (status);
