-- Expand the catalog with explicit, extensible template identifiers.
ALTER TABLE service_templates
  ADD COLUMN template_type VARCHAR(64);

UPDATE service_templates
SET template_type = CASE
  WHEN name = 'Static Frontend' THEN 'static-frontend'
  ELSE 'nodejs-api'
END
WHERE template_type IS NULL;

UPDATE service_templates
SET resource_types = '["ECS", "EC2 / Fargate", "RDS", "ALB", "VPC", "IAM"]'::JSONB
WHERE template_type = 'nodejs-api';

UPDATE service_templates
SET resource_types = '["S3", "CloudFront"]'::JSONB
WHERE template_type = 'static-frontend';

ALTER TABLE service_templates
  ALTER COLUMN template_type SET NOT NULL;

CREATE UNIQUE INDEX idx_service_templates_template_type
  ON service_templates (template_type);

INSERT INTO service_templates
  (id, name, description, cloud_provider, resource_types, terraform_module_path, cicd_template_path, template_type, is_active)
VALUES
  (
    'c1d2e3f4-0003-4000-8000-000000000003',
    'Python FastAPI',
    'Python API service using FastAPI, containerized and deployed to Amazon ECS with PostgreSQL, a public load balancer, and isolated networking.',
    'aws',
    '["ECS", "EC2 / Fargate", "RDS", "ALB", "VPC", "IAM"]'::JSONB,
    'terraform/modules/nodejs-api',
    'workflows/python-api.yml.hbs',
    'python-api',
    true
  ),
  (
    'c1d2e3f4-0004-4000-8000-000000000004',
    'Containerized API',
    'Bring your own container runtime and deploy it to Amazon ECS with PostgreSQL, a public load balancer, and isolated networking.',
    'aws',
    '["ECS", "EC2 / Fargate", "RDS", "ALB", "VPC", "IAM"]'::JSONB,
    'terraform/modules/nodejs-api',
    'workflows/container-api.yml.hbs',
    'container-api',
    true
  )
ON CONFLICT (name) DO NOTHING;
