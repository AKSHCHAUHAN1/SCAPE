-- Seed the real service template catalog only.
-- No users, teams, services, deployments, costs, or audit events are fabricated.

-- ============================================
-- Service Templates
-- ============================================
INSERT INTO service_templates (id, name, description, cloud_provider, resource_types, terraform_module_path, cicd_template_path, is_active, template_type) VALUES
  (
    'c1d2e3f4-0001-4000-8000-000000000001',
    'Node.js API',
    'Node.js API with Express and PostgreSQL (RDS), deployed on ECS using Fargate or a user-selected EC2 instance behind an ALB. Includes VPC, security groups, and IAM roles.',
    'aws',
    '["ECS", "EC2 / Fargate", "RDS", "ALB", "VPC", "IAM"]'::JSONB,
    'terraform/modules/nodejs-api',
    'templates/workflows/nodejs-api.yml.hbs',
    true,
    'nodejs-api'
  ),
  (
    'c1d2e3f4-0002-4000-8000-000000000002',
    'Static Frontend',
    'Static website hosted on a private S3 bucket and served through CloudFront. Ideal for React, Vue, or plain HTML sites.',
    'aws',
    '["S3", "CloudFront"]'::JSONB,
    'terraform/modules/static-frontend',
    'templates/workflows/static-frontend.yml.hbs',
    true,
    'static-frontend'
  ),
  (
    'c1d2e3f4-0003-4000-8000-000000000003',
    'Python FastAPI',
    'Python API service using FastAPI, containerized and deployed to Amazon ECS with PostgreSQL, a public load balancer, and isolated networking.',
    'aws',
    '["ECS", "EC2 / Fargate", "RDS", "ALB", "VPC", "IAM"]'::JSONB,
    'terraform/modules/nodejs-api',
    'workflows/python-api.yml.hbs',
    true,
    'python-api'
  ),
  (
    'c1d2e3f4-0004-4000-8000-000000000004',
    'Containerized API',
    'Bring your own container runtime and deploy it to Amazon ECS with PostgreSQL, a public load balancer, and isolated networking.',
    'aws',
    '["ECS", "EC2 / Fargate", "RDS", "ALB", "VPC", "IAM"]'::JSONB,
    'terraform/modules/nodejs-api',
    'workflows/container-api.yml.hbs',
    true,
    'container-api'
  )
ON CONFLICT (name) DO NOTHING;
