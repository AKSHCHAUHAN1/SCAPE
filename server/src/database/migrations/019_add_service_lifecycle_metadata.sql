-- Keep the user's repository and SCAPE history independent from infrastructure teardown.
ALTER TABLE services
  ADD COLUMN expected_duration_hours INTEGER NOT NULL DEFAULT 24
    CHECK (expected_duration_hours BETWEEN 1 AND 8760),
  ADD COLUMN estimated_hourly_cost_usd NUMERIC(12, 6),
  ADD COLUMN estimated_total_cost_usd NUMERIC(12, 2),
  ADD COLUMN infrastructure_started_at TIMESTAMPTZ,
  ADD COLUMN infrastructure_decommissioned_at TIMESTAMPTZ;
