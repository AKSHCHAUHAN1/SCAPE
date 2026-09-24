# 11-Testing-and-Deployment

## Role
Act as a Principal Engineer, Staff SRE, Security Architect, and Technical Writer.

## Objective
Produce an enterprise-grade implementation specification for **Testing & Deployment Strategy for Forge — Self-Service Cloud Provisioning Platform**. This document defines the complete test pyramid, CI quality gates, staging and production deployment runbooks, and rollback procedures.

## Required Sections
1. Executive Summary
2. Scope (what is covered: backend API, frontend portal, Terraform modules, CI/CD integrator, cost sync worker; what is not: load testing beyond 50 concurrent services, chaos engineering)
3. Design Principles (test pyramid, shift-left security, immutable deployments, blue-green or rolling deploy, every deploy must be reversible within 10 min)
4. Architecture:
   - Test environments: local (Docker Compose: postgres, redis, localstack), staging (Kubernetes namespace on shared cluster, real AWS account with budget limit), production (isolated AWS account)
   - CI pipeline: GitHub Actions workflow running on every PR: lint → unit tests → integration tests → build Docker image → OWASP ZAP scan → push to ECR → deploy to staging → smoke tests → require 2 approvals for production deploy
   - Deployment method: Kubernetes rolling update (maxSurge 1, maxUnavailable 0) for backend; S3 sync + CloudFront invalidation for frontend; Kubernetes CronJob update for cost sync worker
5. Standards:
   - Code coverage thresholds: backend ≥ 80% line coverage (Jest/Go test), frontend ≥ 75% line coverage (Jest + RTL)
   - All tests must be deterministic and isolated (no shared state between test cases)
   - Integration tests use dedicated test database schema (not production schema)
   - Terraform modules validated with `terraform validate` and `tflint` in CI
6. Workflows:
   - Unit test suite: backend service layer (provisioning orchestration, JWT auth, RBAC middleware, cost aggregator), frontend hooks and utility functions, Terraform module variable validation
   - Integration test suite: API endpoint tests with real PostgreSQL (testcontainers), GitHub API mock (nock/httptest), AWS SDK mock (aws-sdk-mock / localstack)
   - E2E test suite (Playwright): login flow, create service flow (mocked provisioning), view cost dashboard, admin audit log access
   - Security test suite: `npm audit --audit-level=high` (zero high/critical CVEs gate), OWASP ZAP baseline scan against staging API
7. Operational Procedures:
   - Staging deploy runbook: push to `main` → GitHub Actions builds image → deploys to staging namespace → smoke test against `/health/ready` → send Slack notification
   - Production deploy runbook: create release tag → manual trigger production deploy workflow → rolling update → health check polling → verify `/health/ready` and `/metrics` → mark deployment successful
   - Database migration runbook: run migrations with `db-migrate up` before new backend pods start, using Kubernetes init container, never run migrations after pods start
8. Security Considerations (no production secrets in CI logs, OWASP ZAP scan failures block merge, container image scanning with Trivy for HIGH+ CVEs, Terraform plan must be reviewed by DevOps engineer before staging apply)
9. Performance Targets (CI pipeline completes in < 15 min, unit tests < 2 min, integration tests < 5 min, E2E tests < 8 min, staging deploy completes < 5 min)
10. Monitoring & Observability (Prometheus metrics scraped from /metrics endpoint, Grafana dashboards for API latency, provisioning job queue depth, cost sync lag; PagerDuty alert on /health/ready failure for > 2 consecutive checks; structured JSON logging with correlation IDs in all services)
11. Disaster Recovery (database: daily RDS automated snapshots retained 7 days, point-in-time recovery enabled; Terraform state: S3 versioning enabled on state bucket, last 10 versions retained; application: failed deploy auto-rollback via Kubernetes rollout undo; RTO: 30 min, RPO: 24 hours for project scope)
12. Testing & Validation (acceptance test checklist: service creation end-to-end in staging, cost records populated after mock sync, audit log entries created for all mutating actions, JWT refresh flow, webhook signature validation)
13. Anti-patterns (no test database shared across parallel test runs, no skipping migrations in staging, no manually editing Kubernetes manifests in production — all changes via GitOps, no `terraform apply` without a plan review)
14. Checklists:
    - Pre-deploy checklist (tests green, coverage thresholds met, security scans passed, DB migration reviewed, team notified)
    - Post-deploy checklist (/health/ready returns 200, key smoke tests pass, Grafana dashboards nominal, no error spike in logs within 10 min)
    - Rollback checklist (identify failing version, `kubectl rollout undo deployment/forge-api`, verify rollback complete, open incident, postmortem scheduled)
15. Architecture Decision Records: ADR-029 Kubernetes rolling update over blue-green for project scope simplicity; ADR-030 testcontainers over in-memory DB for realistic integration tests; ADR-031 Playwright over Cypress for native ESM and multi-browser support
16. Acceptance Criteria

## Writing Rules
- Production-ready
- AI-agent friendly
- Highly detailed
- No placeholders
- No TODOs
- Self-contained
- Cross-reference 03-System-Architecture, 05-Backend-API, 06-Frontend-Portal, 07-Terraform-Provisioning-Engine, 10-Security-and-IAM
- Include Mermaid diagrams where useful (CI/CD pipeline DAG, deployment state machine, test pyramid diagram)

## Output
Generate a complete implementation handbook rather than a high-level outline.
