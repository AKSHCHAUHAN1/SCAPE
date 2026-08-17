# 03-System-Architecture

## Purpose
Create an implementation-grade specification for this topic: **System Architecture for Forge — Self-Service Cloud Provisioning Platform**.

## Objective
Write this document as if it will be used by senior engineers and AI coding agents. The reader should be able to make implementation decisions and understand every system boundary, data flow, and integration point without additional input.

## Requirements
- Use Markdown
- Include executive summary
- Architecture style decision (three-tier monolith-first, with modularity seams for future microservice extraction)
- High-level component diagram (Mermaid C4 or block diagram):
  - React frontend (SPA hosted on S3/CloudFront or Kubernetes Ingress)
  - Node.js/Go backend (REST API, orchestration layer, async job queue)
  - PostgreSQL database (primary store for users, services, jobs, deployments, costs)
  - Provisioning Engine (Terraform CLI runner, async workers via job queue)
  - CI/CD Integrator (GitHub API client, workflow file generator)
  - Cost Integration Module (AWS Cost Explorer API poller, scheduled jobs)
  - AWS infrastructure (IAM/STS, EC2/ECS/EKS, S3 for Terraform state, Secrets Manager)
- Component responsibilities table
- Data flow for each major user action: service creation, provisioning, deployment, cost sync
- Inter-service communication contracts (REST, async queue messages)
- Folder structure for both frontend and backend repositories
- Deployment topology (Docker Compose for local dev, Kubernetes manifests for staging/prod, or ECS — specify which and why)
- External dependencies and their failure modes: GitHub API, AWS Cost Explorer, AWS STS, Terraform state backend
- Scalability model (horizontal scaling of API pods, job-worker autoscaling)
- Architecture principles (see 01-Vision)
- Non-functional requirements mapping to architecture decisions
- Security considerations at architecture level (network policies, IAM boundaries, secrets injection)
- Performance requirements (API latency budgets, provisioning job timeouts, cost sync frequency)
- Edge cases (job queue saturation, Terraform state lock timeout, AWS credential expiry during run)
- ADR section (ADR-004: PostgreSQL over NoSQL for relational service-job-deployment model; ADR-005: Async job queue over synchronous provisioning call; ADR-006: Single-cloud AWS scope for v1)
- Acceptance criteria

## Quality Bar
- Enterprise grade
- Production ready
- Extremely detailed
- No placeholders
- No TODOs
- Self-contained
- Cross-reference 01-Vision, 02-Product-Requirements, 04-Database-Design, 05-Backend-API, 07-Terraform-Provisioning-Engine

## Output
Produce a complete specification, not an outline.
