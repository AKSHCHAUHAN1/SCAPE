# 08-CICD-Integration

## Role
You are a Principal Software Architect and Staff Engineer.

## Goal
Generate a production-ready, enterprise-grade implementation specification for the **Forge CI/CD Integration module** — the subsystem that automatically generates a GitHub Actions workflow file and commits it to the newly created service repository, enabling continuous integration and deployment from day one.

## Document Requirements
- Executive Summary
- Design Goals (zero-touch CI/CD from service creation, reproducible pipeline from template, developer can override without breaking Forge tracking)
- Functional Requirements:
  - After Terraform provisioning succeeds, auto-generate a `.github/workflows/deploy.yml` for the new service repository
  - Commit the generated workflow file to the repository's default branch via GitHub API (octokit or direct REST)
  - Workflow template varies by service template: Node.js API template → build, test, docker build, push to ECR, deploy to ECS; Static frontend template → build, upload to S3, invalidate CloudFront
  - Store the generated workflow content hash in the deployments table for audit purposes
  - Register a GitHub webhook on the new repo to receive workflow run events (POST /webhooks/github)
  - Receive webhook events, parse run status (completed/failure), and update the deployments table accordingly
  - Expose deployment history via GET /services/:id/deployments (see 05-Backend-API)
- Non-Functional Requirements (GitHub API calls must complete within 10s, webhook processing < 500ms, HMAC webhook signature verified on every event, retry on GitHub 429/5xx up to 3 times with exponential backoff)
- Architecture:
  - CI/CD Integrator module within the backend, invoked by the provisioning job worker after terraform apply succeeds
  - Template engine (Handlebars or simple string interpolation) rendering workflow YAML from a template file per service type
  - Octokit REST client authenticated with a GitHub App installation token (not a personal access token)
  - Workflow variables injected: `AWS_REGION`, ECR repository URI, ECS cluster/service name, S3 bucket name — all sourced from Terraform outputs
  - Webhook receiver: POST /webhooks/github route, HMAC-SHA256 signature check using `X-Hub-Signature-256`, event type filtering (workflow_run, push)
- Data Flow: terraform apply completes → outputs captured → CI/CD Integrator invoked → render workflow YAML → GitHub API: create/update file → register webhook → worker job marked succeeded → webhook arrives → deployment record created/updated
- Folder Structure:
  - `src/cicd/` (or `internal/cicd/` for Go) — index, github-client, workflow-renderer, webhook-handler
  - `templates/workflows/nodejs-api.yml.hbs` — Handlebars template for Node.js API pipeline
  - `templates/workflows/static-frontend.yml.hbs` — Handlebars template for static frontend pipeline
- Interfaces (GitHubCommitPayload, WorkflowRunEvent, DeploymentRecord)
- Error Handling (GitHub API 404 on missing repo → alert and mark job failed, HMAC mismatch → reject 401 and log, workflow file already exists → update via PUT with SHA, not create)
- Security (GitHub App auth over PAT for least-privilege repo scope, webhook secret stored in AWS Secrets Manager, no workflow secrets hardcoded in committed YAML — use GitHub Actions environment secrets via API)
- Performance (workflow file generation < 100ms, GitHub API commit < 5s, webhook processing < 200ms)
- Accessibility (not applicable)
- Testing Strategy (unit tests for workflow YAML rendering with snapshot testing, integration tests with a test GitHub repository, mock webhook tests with valid HMAC signatures)
- Mermaid diagrams where appropriate (CI/CD integration sequence after provisioning, webhook event processing flow, generated workflow job graph for Node.js API template)
- Architecture Decision Records (ADRs): ADR-019 GitHub App over PAT for per-repo fine-grained permissions; ADR-020 Commit workflow file over GitHub Actions API for portability and auditability; ADR-021 Template-per-service-type over dynamic workflow generation
- Anti-patterns (no PAT stored in backend environment, no polling GitHub for workflow status — webhook-driven only, no committing AWS credentials into workflow YAML)
- Acceptance Criteria

## Quality Requirements
- Self-contained
- Extremely detailed
- Implementation-ready
- AI-agent friendly
- No placeholders
- No TODOs
- Cross-reference 05-Backend-API, 07-Terraform-Provisioning-Engine, 10-Security-and-IAM, 04-Database-Design
- Prefer explicit engineering decisions over ambiguity

## Output
Produce a complete specification, not an outline.
