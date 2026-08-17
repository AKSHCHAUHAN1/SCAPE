# 07-Terraform-Provisioning-Engine

## Role
You are a Principal Software Architect and Staff Engineer.

## Goal
Generate a production-ready, enterprise-grade implementation specification for the **Forge Terraform Provisioning Engine** — the subsystem responsible for executing Terraform to create real AWS cloud infrastructure on behalf of a developer, tracking job state, and rolling back on failure.

## Document Requirements
- Executive Summary
- Design Goals (idempotent provisioning, complete rollback on failure, full state auditability, no long-lived privileged credentials)
- Functional Requirements:
  - Trigger Terraform apply from a provisioning job record
  - Support multiple service templates (e.g., Node.js API with RDS PostgreSQL, static frontend with S3/CloudFront)
  - Store Terraform state remotely in S3 + DynamoDB state lock
  - Capture stdout/stderr from Terraform runs and persist to provisioning_jobs.error_message / log store
  - Detect failure and trigger automatic rollback (terraform destroy of the partially created workspace)
  - Emit job status events to update the database: queued → running → succeeded | failed | rolled_back
  - Support manual retry of a failed job by operator
- Non-Functional Requirements (idempotency guaranteed by Terraform workspace isolation, job timeout 10 min, rollback timeout 5 min, no credential leakage in logs)
- Architecture:
  - Job worker process (Node.js child_process or Go exec.Command) spawning Terraform CLI
  - One Terraform workspace per service (workspace name = service UUID) for state isolation
  - AWS credentials injected per-job via STS AssumeRole (see 10-Security-and-IAM), never hardcoded
  - S3 bucket for state files (path: `forge-tf-state/<service-id>/terraform.tfstate`), server-side encryption enabled
  - DynamoDB table for state locking (`forge-tf-locks`)
- Folder Structure for Terraform modules:
  - `terraform/modules/nodejs-api/` — VPC, ECS cluster, ECS task definition, RDS PostgreSQL, ALB, security groups, IAM task role
  - `terraform/modules/static-frontend/` — S3 bucket, CloudFront distribution, ACM cert
  - `terraform/environments/<service-id>/` — generated per service, references module, passes variables
- Data Flow: job dequeued → STS credentials fetched → terraform workspace select/new → terraform init → terraform apply -var-file → parse exit code → update job status → on failure: terraform destroy → update job status rolled_back
- Variable contract: every template accepts `service_name`, `region`, `environment`, `owner_team`, `tags` map
- Output contract: every template outputs `service_endpoint`, `resource_arns` (JSON list), `repository_url` — persisted to services table
- Component Responsibilities (job queue consumer, terraform runner, state manager, rollback coordinator, log streamer)
- Interfaces (TypeScript/Go types for ProvisioningJob, TerraformRunResult, TerraformOutput)
- Error Handling (exit code 1 → structured error parse from Terraform JSON output `-json` flag, timeout → SIGTERM then SIGKILL, rollback failure → alert and mark job as manual-intervention-required)
- Security (STS short-lived credentials scoped per provisioning role, no AWS_ACCESS_KEY_ID in environment variables of API process — only injected in worker subprocess, Terraform logs sanitised before DB storage)
- Performance (terraform init cached between runs via provider plugin cache directory, apply P90 < 4 min for nodejs-api template)
- Accessibility (not applicable)
- Testing Strategy (unit tests for job runner logic with mocked Terraform CLI, integration tests against LocalStack for AWS resource creation, contract tests for module output schema)
- Mermaid diagrams where appropriate (provisioning job state machine, data flow sequence: API → queue → worker → Terraform → AWS → DB update)
- Architecture Decision Records (ADRs): ADR-016 Terraform CLI runner over Terraform Cloud API for cost and control; ADR-017 One workspace per service for state isolation; ADR-018 -json flag for machine-readable Terraform output parsing
- Anti-patterns (no shared Terraform state across services, no hardcoded credentials, no running apply synchronously in the API request thread, no skipping rollback on partial failure)
- Acceptance Criteria

## Quality Requirements
- Self-contained
- Extremely detailed
- Implementation-ready
- AI-agent friendly
- No placeholders
- No TODOs
- Cross-reference 03-System-Architecture, 05-Backend-API, 10-Security-and-IAM, 04-Database-Design
- Prefer explicit engineering decisions over ambiguity

## Output
Produce a complete specification, not an outline.
