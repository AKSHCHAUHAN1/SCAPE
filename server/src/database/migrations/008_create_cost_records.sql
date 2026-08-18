-- Migration 008: Create cost_records table

CREATE TABLE cost_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id       UUID          NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  period_start     DATE          NOT NULL,
  period_end       DATE          NOT NULL,
  amount_usd       NUMERIC(12,4) NOT NULL DEFAULT 0,
  currency         VARCHAR(3)    NOT NULL DEFAULT 'USD',
  aws_resource_ids JSONB         NOT NULL DEFAULT '[]'::JSONB,
  synced_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Prevent duplicate cost records for same service + period
  CONSTRAINT uq_cost_records_service_period UNIQUE (service_id, period_start, period_end)
);

-- Indexes
CREATE INDEX idx_cost_records_service_id   ON cost_records (service_id);
CREATE INDEX idx_cost_records_period       ON cost_records (service_id, period_start, period_end);
