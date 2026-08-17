# 14-Forge-Master-Instructions

## Role
Act as a Principal Engineer, Software Architect, Product Designer, SRE, and Technical Writer.

## Objective
Generate a complete implementation-grade engineering specification that serves as the **master context document for AI coding agents and engineers building Forge**. This document is the single entry point that cross-references all other specifications and provides authoritative, concrete implementation guidance for every module. An AI agent reading only this document should have enough context to begin implementing any part of the system correctly.

## Mandatory Sections
1. Executive Summary
   - Project name: **Forge — Self-Service Cloud Provisioning Platform**
   - One-sentence mission: Enable any developer to provision a fully working cloud service — with infrastructure, CI/CD pipeline, and monitoring — through a self-service portal in under 5 minutes, without touching the cloud console or requesting help from DevOps.
   - Tech stack summary: React 18 (frontend), Node.js/Go (backend API + workers), PostgreSQL 15 (database), Terraform CLI (provisioning engine), GitHub Actions + GitHub App (CI/CD), AWS (ECS/RDS/S3/CloudFront/IAM/STS/Cost Explorer), Docker + Kubernetes (containerisation/orchestration)
   - Team: Frontend Developer, Backend Developer, DevOps/Cloud Engineer, Database/Integration Engineer
   - Timeline: 12 weeks, 6 × 2-week sprints

2. Goals (master list of all system goals, cross-referenced to 01-Vision and 02-Product-Requirements)

3. Architecture (system overview with Mermaid block diagram, component list with one-line responsibility, cross-reference to 03-System-Architecture)

4. Folder Structure (canonical mono-repo or multi-repo layout, full top-level directory tree for both frontend and backend)

5. Data Models (summary table of all 8 database tables with primary key and key relationships, cross-reference to 04-Database-Design)

6. APIs / Interfaces (summary table of all REST endpoints with method, path, auth requirement, and cross-reference to 05-Backend-API)

7. State Management (how auth state flows from login through JWT to API calls, how provisioning job state progresses from queued to terminal, how cost records are written and read — cross-reference 06-Frontend-Portal, 07-Terraform-Provisioning-Engine, 09-Cost-Dashboard)

8. Security (master security rule list: must-follow rules for every engineer; summarise IAM role hierarchy; cross-reference 10-Security-and-IAM)

9. Performance Targets (consolidated table: portal load < 2s, API read p99 < 200ms, API write p99 < 500ms, provisioning E2E < 5 min, cost sync daily by 06:00 UTC)

10. Error Handling (universal error contract `{ code: string, message: string, details?: object }`, HTTP status codes used and their meaning within Forge, error propagation rules: never swallow errors silently, always log with correlation ID)

11. Observability (structured logging format, correlation ID propagation strategy, Prometheus metric names for provisioning jobs, deployments, cost sync; cross-reference 11-Testing-and-Deployment)

12. Testing Strategy (test pyramid summary, coverage thresholds, CI quality gates — cross-reference 11-Testing-and-Deployment)

13. Deployment Considerations (environment summary: local → staging → production; deployment method per component; cross-reference 11-Testing-and-Deployment)

14. Mermaid Diagrams (include: complete system architecture block diagram, provisioning E2E sequence diagram summarising 12-Sequence-Diagrams-and-Workflows, IAM role trust graph summarising 10-Security-and-IAM)

15. ADRs (master ADR index table: ADR-001 through ADR-036, each with a one-line rationale summary and reference to the spec document where it is fully defined)

16. Anti-patterns (consolidated master list of all anti-patterns from all spec documents, grouped by layer: security, API, database, frontend, infrastructure)

17. Acceptance Criteria (master acceptance checklist — a developer or AI agent should tick every item before considering the project complete):
    - [ ] Developer can log in and see their team's service catalog
    - [ ] Developer can create a service from a template and provisioning completes within 5 minutes
    - [ ] Terraform state is stored in S3 with DynamoDB locking; no state stored locally
    - [ ] A `.github/workflows/deploy.yml` is committed to the new service repository automatically
    - [ ] A push to main triggers the GitHub Actions workflow and the deployment appears in the Forge dashboard
    - [ ] Cost records for the service appear in the cost dashboard within 24 hours of provisioning
    - [ ] All provisioning and deployment events appear in the audit log
    - [ ] A failed provisioning job triggers automatic rollback and the service is marked failed
    - [ ] All API endpoints enforce RBAC; a developer cannot access another team's services
    - [ ] CI pipeline completes in < 15 minutes on a standard PR
    - [ ] Code coverage ≥ 80% backend, ≥ 75% frontend
    - [ ] OWASP ZAP scan returns zero high-severity findings
    - [ ] No secrets are hardcoded in source code or committed to Git
    - [ ] All AWS credentials used in automation are short-lived STS tokens or OIDC-derived

## Writing Rules
- Production-ready
- Extremely detailed
- No placeholders
- No TODOs
- AI-agent friendly
- Cross-reference all related specifications: 01-Vision, 02-Product-Requirements, 03-System-Architecture, 04-Database-Design, 05-Backend-API, 06-Frontend-Portal, 07-Terraform-Provisioning-Engine, 08-CICD-Integration, 09-Cost-Dashboard, 10-Security-and-IAM, 11-Testing-and-Deployment, 12-Sequence-Diagrams-and-Workflows, 13-Implementation-Roadmap
- Explain engineering decisions and trade-offs
- Use Markdown only

## Expected Output
Produce a complete specification suitable for direct implementation by AI coding agents. This document should be the first file an AI agent reads before starting any implementation task on the Forge project.
