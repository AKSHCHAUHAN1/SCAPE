-- Seed demo services, jobs, deployments, costs, and audit logs for presentation
-- Run with: npm run db:seed

-- 1. Demo Services
INSERT INTO services (id, name, owner_id, team_id, template_id, status, region, repository_url, created_at, updated_at) VALUES
  (
    'd1e2f3a4-0001-4000-8000-000000000001',
    'payment-gateway-api',
    'b1c2d3e4-0001-4000-8000-000000000001',
    'a1b2c3d4-0001-4000-8000-000000000001',
    'c1d2e3f4-0001-4000-8000-000000000001',
    'active',
    'ap-south-1',
    'https://github.com/AKSHCHAUHAN1/payment-gateway-api',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days'
  ),
  (
    'd1e2f3a4-0002-4000-8000-000000000002',
    'customer-portal-web',
    'b1c2d3e4-0003-4000-8000-000000000003',
    'a1b2c3d4-0002-4000-8000-000000000002',
    'c1d2e3f4-0002-4000-8000-000000000002',
    'active',
    'ap-south-1',
    'https://github.com/AKSHCHAUHAN1/customer-portal-web',
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '18 days'
  ),
  (
    'd1e2f3a4-0003-4000-8000-000000000003',
    'auth-microservice',
    'b1c2d3e4-0004-4000-8000-000000000004',
    'a1b2c3d4-0002-4000-8000-000000000002',
    'c1d2e3f4-0001-4000-8000-000000000001',
    'active',
    'ap-south-1',
    'https://github.com/AKSHCHAUHAN1/auth-microservice',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
  )
ON CONFLICT (name, team_id) DO NOTHING;

-- 2. Demo Provisioning Jobs
INSERT INTO provisioning_jobs (id, service_id, triggered_by, status, terraform_workspace, terraform_logs, started_at, completed_at, created_at) VALUES
  (
    'e1f2a3b4-0001-4000-8000-000000000001',
    'd1e2f3a4-0001-4000-8000-000000000001',
    'b1c2d3e4-0001-4000-8000-000000000001',
    'succeeded',
    'd1e2f3a4-0001-4000-8000-000000000001',
    '[INFO] Initializing Terraform S3 remote backend...
[INFO] S3 bucket: scape-tf-state, DynamoDB lock table: scape-tf-locks
[INFO] Backend successfully configured.
[INFO] Initializing AWS provider plugins v5.0+...
[INFO] Terraform has been successfully initialized!
[PLAN] Plan: 14 to add, 0 to change, 0 to destroy.
[APPLY] aws_vpc.main: Creating...
[APPLY] aws_iam_role.ecs_execution: Creating...
[APPLY] aws_security_group.alb: Creating...
[APPLY] aws_lb.main: Creating...
[APPLY] aws_db_instance.postgres: Creating...
[APPLY] aws_ecs_cluster.main: Creating...
[APPLY] aws_ecs_service.app: Creating...
[SUCCESS] Apply complete! Resources: 14 added, 0 changed, 0 destroyed.
[OUTPUT] alb_dns_name = "payment-gateway-alb-19827364.ap-south-1.elb.amazonaws.com"
[OUTPUT] rds_endpoint = "payment-gateway-db.c7x8y9z0.ap-south-1.rds.amazonaws.com:5432"',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days' + INTERVAL '4 minutes 12 seconds',
    NOW() - INTERVAL '25 days'
  ),
  (
    'e1f2a3b4-0002-4000-8000-000000000002',
    'd1e2f3a4-0002-4000-8000-000000000002',
    'b1c2d3e4-0003-4000-8000-000000000003',
    'succeeded',
    'd1e2f3a4-0002-4000-8000-000000000002',
    '[INFO] Initializing Terraform S3 remote backend...
[INFO] Backend successfully configured.
[PLAN] Plan: 5 to add, 0 to change, 0 to destroy.
[APPLY] aws_s3_bucket.frontend: Creating...
[APPLY] aws_cloudfront_distribution.cdn: Creating...
[SUCCESS] Apply complete! Resources: 5 added, 0 changed, 0 destroyed.
[OUTPUT] cloudfront_domain_name = "d1234abcd5678.cloudfront.net"',
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '18 days' + INTERVAL '2 minutes 45 seconds',
    NOW() - INTERVAL '18 days'
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Demo Deployments
INSERT INTO deployments (id, service_id, triggered_by, github_run_id, status, commit_sha, branch, started_at, completed_at, created_at, workflow_file_path) VALUES
  (
    'f1a2b3c4-0001-4000-8000-000000000001',
    'd1e2f3a4-0001-4000-8000-000000000001',
    'b1c2d3e4-0001-4000-8000-000000000001',
    '8923481234',
    'succeeded',
    'a9f1b2c3d4e5f67890123456789abcdef0123456',
    'main',
    NOW() - INTERVAL '24 days',
    NOW() - INTERVAL '24 days' + INTERVAL '3 minutes 15 seconds',
    NOW() - INTERVAL '24 days',
    '.github/workflows/deploy.yml'
  ),
  (
    'f1a2b3c4-0002-4000-8000-000000000002',
    'd1e2f3a4-0001-4000-8000-000000000001',
    'b1c2d3e4-0001-4000-8000-000000000001',
    '8934592834',
    'succeeded',
    '7b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c',
    'main',
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '12 days' + INTERVAL '2 minutes 50 seconds',
    NOW() - INTERVAL '12 days',
    '.github/workflows/deploy.yml'
  ),
  (
    'f1a2b3c4-0003-4000-8000-000000000003',
    'd1e2f3a4-0002-4000-8000-000000000002',
    'b1c2d3e4-0003-4000-8000-000000000003',
    '8945601928',
    'succeeded',
    '3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
    'main',
    NOW() - INTERVAL '17 days',
    NOW() - INTERVAL '17 days' + INTERVAL '1 minute 20 seconds',
    NOW() - INTERVAL '17 days',
    '.github/workflows/deploy.yml'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Demo Cost Records (last 14 days)
INSERT INTO cost_records (service_id, period_start, period_end, amount_usd, currency, aws_resource_ids, synced_at)
SELECT
  'd1e2f3a4-0001-4000-8000-000000000001'::UUID,
  (CURRENT_DATE - i)::DATE,
  (CURRENT_DATE - i + 1)::DATE,
  ROUND((4.80 + (i % 5) * 0.35 + (random() * 0.20))::NUMERIC, 4),
  'USD',
  '["arn:aws:ecs:ap-south-1:123456789012:service/payment-gateway", "arn:aws:rds:ap-south-1:123456789012:db:payment-gateway-db"]'::JSONB,
  NOW()
FROM generate_series(1, 14) AS i
ON CONFLICT (service_id, period_start, period_end) DO NOTHING;

INSERT INTO cost_records (service_id, period_start, period_end, amount_usd, currency, aws_resource_ids, synced_at)
SELECT
  'd1e2f3a4-0002-4000-8000-000000000002'::UUID,
  (CURRENT_DATE - i)::DATE,
  (CURRENT_DATE - i + 1)::DATE,
  ROUND((0.85 + (i % 3) * 0.15 + (random() * 0.08))::NUMERIC, 4),
  'USD',
  '["arn:aws:s3:::customer-portal-web-bucket", "arn:aws:cloudfront::123456789012:distribution/EDFDVBD632BHDS5"]'::JSONB,
  NOW()
FROM generate_series(1, 14) AS i
ON CONFLICT (service_id, period_start, period_end) DO NOTHING;

-- 5. Demo Audit Logs
INSERT INTO audit_logs (id, actor_id, action, resource_type, resource_id, payload, created_at) VALUES
  (
    gen_random_uuid(),
    'b1c2d3e4-0001-4000-8000-000000000001',
    'service.create',
    'service',
    'd1e2f3a4-0001-4000-8000-000000000001',
    '{"name": "payment-gateway-api", "template": "Node.js API", "region": "ap-south-1"}'::JSONB,
    NOW() - INTERVAL '25 days'
  ),
  (
    gen_random_uuid(),
    'b1c2d3e4-0001-4000-8000-000000000001',
    'provisioning.completed',
    'provisioning_job',
    'e1f2a3b4-0001-4000-8000-000000000001',
    '{"serviceId": "d1e2f3a4-0001-4000-8000-000000000001", "duration": "252s", "status": "succeeded"}'::JSONB,
    NOW() - INTERVAL '25 days' + INTERVAL '4 minutes 12 seconds'
  ),
  (
    gen_random_uuid(),
    'b1c2d3e4-0001-4000-8000-000000000001',
    'deployment.succeeded',
    'deployment',
    'f1a2b3c4-0001-4000-8000-000000000001',
    '{"commit": "a9f1b2c", "branch": "main", "runId": "8923481234"}'::JSONB,
    NOW() - INTERVAL '24 days'
  ),
  (
    gen_random_uuid(),
    'b1c2d3e4-0003-4000-8000-000000000003',
    'service.create',
    'service',
    'd1e2f3a4-0002-4000-8000-000000000002',
    '{"name": "customer-portal-web", "template": "Static Frontend", "region": "ap-south-1"}'::JSONB,
    NOW() - INTERVAL '18 days'
  ),
  (
    gen_random_uuid(),
    'b1c2d3e4-0003-4000-8000-000000000003',
    'provisioning.completed',
    'provisioning_job',
    'e1f2a3b4-0002-4000-8000-000000000002',
    '{"serviceId": "d1e2f3a4-0002-4000-8000-000000000002", "duration": "165s", "status": "succeeded"}'::JSONB,
    NOW() - INTERVAL '18 days' + INTERVAL '2 minutes 45 seconds'
  );
