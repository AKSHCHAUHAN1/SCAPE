-- Preserve the exact service-group amounts returned by AWS Cost Explorer.
ALTER TABLE cost_records
  ADD COLUMN aws_service_costs JSONB NOT NULL DEFAULT '[]'::JSONB;
