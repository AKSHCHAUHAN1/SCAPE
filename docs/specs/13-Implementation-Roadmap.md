# 13-Implementation-Roadmap

## Role
Act as a Principal Engineer, Staff SRE, Security Architect, and Technical Writer.

## Objective
Produce an enterprise-grade implementation specification for the **Forge Implementation Roadmap** — the authoritative sprint-by-sprint plan for a 4-person team (Frontend Developer, Backend Developer, DevOps/Cloud Engineer, Database/Integration Engineer) building Forge over one academic semester using Agile/Scrum with 2-week sprints.

## Required Sections
1. Executive Summary (12-week delivery plan, 6 sprints, scope boundaries, team structure)
2. Scope (what is delivered by end of semester: service creation, Terraform provisioning, GitHub Actions CI/CD, cost dashboard, RBAC, audit logging, Kubernetes deployment on staging; what is deferred: multi-cloud, custom template authoring, production-grade HA, mobile app)
3. Design Principles (thin vertical slices over horizontal layers, working software at end of every sprint, no deferred integration, security built-in from Sprint 1, definition of done: code reviewed, tested, merged, deployed to staging)
4. Architecture (not repeated here — reference 03-System-Architecture; this section covers the delivery architecture: branching strategy (GitHub Flow: feature branches → main via PR), environment promotion path (local → staging → demo))
5. Standards:
   - Definition of Done: all tests passing, coverage thresholds met, PR approved by ≥1 teammate, deployed to staging, acceptance criteria verified
   - Sprint ceremonies: Sprint Planning (Day 1, 2h), Daily Standup (15 min), Sprint Review (Day 14, 1h), Sprint Retrospective (Day 14, 30 min)
   - Story point scale: 1 (trivial) → 2 (small) → 3 (medium) → 5 (large) → 8 (epic, must be broken down)
6. Workflows (sprint-by-sprint breakdown):
   - **Sprint 1–2 (Weeks 1–4): Foundation** — system design finalised, database schema created and migrated, local Docker Compose environment working, user auth (JWT) implemented, /health endpoint, CI pipeline (lint + unit test) running on GitHub Actions
   - **Sprint 3–4 (Weeks 5–8): Core Provisioning** — service template CRUD, POST /services endpoint, provisioning job queue (BullMQ), Terraform nodejs-api module complete, S3 state backend and DynamoDB lock table created, IAM roles defined in Terraform, end-to-end provisioning of a test service in staging
   - **Sprint 5–6 (Weeks 9–12): Portal & Integrations** — React portal (login, service catalog, create-service form, provisioning status page), CI/CD integrator (GitHub App, workflow file commit, webhook receiver), cost sync worker (AWS Cost Explorer, cost_records upsert), cost dashboard UI (charts), audit log page, E2E tests (Playwright), demo-ready staging deployment
7. Operational Procedures (team Git workflow, PR review policy, staging deploy procedure, incident reporting during development)
8. Security Considerations (IAM roles provisioned in Sprint 1, secrets in AWS Secrets Manager from Sprint 1, OWASP ZAP scan added to CI pipeline in Sprint 3, no production AWS account used during development)
9. Performance Targets (Sprint 3 acceptance: end-to-end provisioning < 10 min on first implementation, Sprint 6 acceptance: provisioning < 5 min after optimisation)
10. Monitoring & Observability (Prometheus + Grafana added in Sprint 5, CloudTrail enabled in AWS account from project start, structured logging added from Sprint 1)
11. Disaster Recovery (not applicable during development; staging environment can be torn down and re-created from Terraform in < 30 min)
12. Testing & Validation:
    - Sprint 1: auth unit tests, DB migration tests
    - Sprint 3: provisioning job unit tests, Terraform `validate` and `tflint` in CI, LocalStack integration tests
    - Sprint 5: API integration tests with testcontainers, Playwright E2E for critical flows, OWASP ZAP baseline scan
13. Anti-patterns (no "big bang" integration at end of semester, no skipping staging deploy at sprint end, no merging untested code to main, no manual IAM changes in console)
14. Checklists:
    - Sprint start checklist (backlog groomed, stories estimated, acceptance criteria written, dependencies identified)
    - Sprint end checklist (demo-able features deployed to staging, retrospective completed, next sprint backlog drafted)
    - Demo day checklist (staging environment healthy, test data seeded, end-to-end demo script rehearsed, rollback plan ready)
15. Architecture Decision Records: ADR-034 GitHub Flow over Gitflow for simplicity with small team; ADR-035 Vertical slices over horizontal layers for sprint delivery; ADR-036 Docker Compose for local development over individual service installs
16. Acceptance Criteria (per sprint, specific and measurable)

## Writing Rules
- Production-ready
- AI-agent friendly
- Highly detailed
- No placeholders
- No TODOs
- Self-contained
- Cross-reference all spec documents (01 through 12) where relevant
- Include Mermaid diagrams where useful (Gantt chart for sprint timeline, dependency graph between features)

## Output
Generate a complete implementation handbook rather than a high-level outline.
