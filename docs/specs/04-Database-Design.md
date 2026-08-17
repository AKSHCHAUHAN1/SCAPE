# 04-Database-Design

## Purpose
Create an implementation-grade specification for this topic: **Database Design for Forge — Self-Service Cloud Provisioning Platform**.

## Objective
Write this document as if it will be used by senior engineers and AI coding agents. Every table, column, constraint, index, and relationship must be fully defined and immediately usable to generate migration SQL or an ORM schema.

## Requirements
- Use Markdown
- Include executive summary
- Database technology choice: PostgreSQL 15+ with rationale
- Full schema for all tables — for each table provide: column name, data type, constraints (NOT NULL, UNIQUE, DEFAULT, CHECK), foreign keys, and description:
  - `users` — id (UUID PK), email (UNIQUE NOT NULL), password_hash, role (ENUM: developer | team_lead | devops | admin), team_id (FK), created_at, updated_at, last_login_at
  - `teams` — id (UUID PK), name (UNIQUE NOT NULL), created_at, updated_at
  - `service_templates` — id (UUID PK), name, description, cloud_provider (ENUM: aws | gcp), resource_types (JSONB array), terraform_module_path, cicd_template_path, is_active, created_at
  - `services` — id (UUID PK), name, owner_id (FK users), team_id (FK teams), template_id (FK service_templates), status (ENUM: pending | provisioning | active | failed | decommissioned), region, repository_url, created_at, updated_at
  - `provisioning_jobs` — id (UUID PK), service_id (FK services), triggered_by (FK users), status (ENUM: queued | running | succeeded | failed | rolled_back), terraform_workspace, terraform_run_id, error_message, started_at, completed_at, created_at
  - `deployments` — id (UUID PK), service_id (FK services), triggered_by (FK users), github_run_id, status (ENUM: pending | running | succeeded | failed), commit_sha, branch, started_at, completed_at, created_at
  - `cost_records` — id (UUID PK), service_id (FK services), period_start (DATE), period_end (DATE), amount_usd (NUMERIC 12,4), currency, aws_resource_ids (JSONB), synced_at, created_at
  - `audit_logs` — id (UUID PK), actor_id (FK users), action (VARCHAR), resource_type, resource_id (UUID), payload (JSONB), ip_address (INET), created_at
- Entity-relationship diagram (Mermaid ERD)
- Index definitions for all foreign keys, common query filters (service status, job status, user team, cost period), and audit log actor lookup
- Migration strategy (sequential numbered migrations, no destructive changes without deprecation window)
- Seed data for local development (example templates, test users, test team)
- Data retention policy (audit_logs kept 2 years, cost_records kept 3 years, soft-delete for services)
- Security considerations (row-level security by team_id, encrypted password_hash with bcrypt cost 12, PII fields enumerated)
- Performance requirements (query budgets for service list, job status poll, cost aggregation)
- Edge cases (orphaned provisioning_jobs on service deletion, duplicate cost records on re-sync, concurrent job for same service)
- ADR section (ADR-007: UUID v4 PKs for distributed-safe IDs; ADR-008: JSONB for terraform_run metadata; ADR-009: Separate audit_logs table over event-sourcing for project scope)
- Acceptance criteria

## Quality Bar
- Enterprise grade
- Production ready
- Extremely detailed
- No placeholders
- No TODOs
- Self-contained
- Cross-reference 03-System-Architecture, 05-Backend-API

## Output
Produce a complete specification, not an outline.
