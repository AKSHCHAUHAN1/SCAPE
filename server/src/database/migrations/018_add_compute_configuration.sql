-- Persist the requested runtime capacity so the provisioning worker and UI
-- use the same values selected in the service wizard.
ALTER TABLE services
  ADD COLUMN compute_mode VARCHAR(16) NOT NULL DEFAULT 'fargate'
    CHECK (compute_mode IN ('fargate', 'ec2')),
  ADD COLUMN ec2_instance_type VARCHAR(64),
  ADD COLUMN requested_vcpu NUMERIC(6,2) NOT NULL DEFAULT 0.5,
  ADD COLUMN requested_memory_gib NUMERIC(7,2) NOT NULL DEFAULT 1,
  ADD COLUMN workload_profile VARCHAR(24) NOT NULL DEFAULT 'bursty'
    CHECK (workload_profile IN ('bursty', 'balanced', 'compute', 'memory')),
  ADD CONSTRAINT services_ec2_instance_type_required
    CHECK (compute_mode <> 'ec2' OR ec2_instance_type IS NOT NULL);
