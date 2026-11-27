-- Remove the hard-coded demonstration services and their fabricated histories.
-- Allow deletion only for these seeded audit resource IDs while this transaction runs.
CREATE OR REPLACE FUNCTION reject_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.resource_id IN (
    'd1e2f3a4-0001-4000-8000-000000000001',
    'd1e2f3a4-0002-4000-8000-000000000002',
    'd1e2f3a4-0003-4000-8000-000000000003',
    'e1f2a3b4-0001-4000-8000-000000000001',
    'e1f2a3b4-0002-4000-8000-000000000002',
    'f1a2b3c4-0001-4000-8000-000000000001',
    'f1a2b3c4-0002-4000-8000-000000000002',
    'f1a2b3c4-0003-4000-8000-000000000003'
  ) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_logs is append only';
END;
$$;

DELETE FROM audit_logs
WHERE resource_id IN (
  'd1e2f3a4-0001-4000-8000-000000000001',
  'd1e2f3a4-0002-4000-8000-000000000002',
  'd1e2f3a4-0003-4000-8000-000000000003',
  'e1f2a3b4-0001-4000-8000-000000000001',
  'e1f2a3b4-0002-4000-8000-000000000002',
  'f1a2b3c4-0001-4000-8000-000000000001',
  'f1a2b3c4-0002-4000-8000-000000000002',
  'f1a2b3c4-0003-4000-8000-000000000003'
);

-- Restore the strict append-only behavior before completing the migration.
CREATE OR REPLACE FUNCTION reject_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append only';
END;
$$;

DELETE FROM services
WHERE id IN (
  'd1e2f3a4-0001-4000-8000-000000000001',
  'd1e2f3a4-0002-4000-8000-000000000002',
  'd1e2f3a4-0003-4000-8000-000000000003'
);

-- Remove seeded local accounts only when they own no remaining real resources.
DELETE FROM users
WHERE id IN (
  'b1c2d3e4-0001-4000-8000-000000000001',
  'b1c2d3e4-0002-4000-8000-000000000002',
  'b1c2d3e4-0003-4000-8000-000000000003',
  'b1c2d3e4-0004-4000-8000-000000000004'
)
AND NOT EXISTS (SELECT 1 FROM services WHERE owner_id = users.id)
AND NOT EXISTS (SELECT 1 FROM provisioning_jobs WHERE triggered_by = users.id)
AND NOT EXISTS (SELECT 1 FROM deployments WHERE triggered_by = users.id);

DELETE FROM teams
WHERE id IN (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002'
)
AND NOT EXISTS (SELECT 1 FROM services WHERE team_id = teams.id)
AND NOT EXISTS (SELECT 1 FROM users WHERE team_id = teams.id);
