# 12-Sequence-Diagrams-and-Workflows

## Role
Act as a Principal Engineer, Software Architect, Product Designer, SRE, and Technical Writer.

## Objective
Generate a complete implementation-grade engineering specification containing **all sequence diagrams and system workflow definitions for Forge — Self-Service Cloud Provisioning Platform**. Every major system interaction must be captured as a Mermaid sequence diagram with annotated steps and error paths.

## Mandatory Sections
1. Executive Summary (purpose of this document: single reference for all system workflows, used by developers to understand system behaviour and by QA to derive test cases)
2. Goals (complete coverage of happy paths and failure modes, machine-readable Mermaid diagrams, numbered steps correlating to API endpoints in 05-Backend-API)
3. Architecture (workflow taxonomy: synchronous API flows, asynchronous job flows, scheduled cron flows, webhook-driven flows)
4. Folder Structure (not applicable — this is a reference document)
5. Data Models (state machine definitions referenced by each workflow: ServiceStatus, ProvisioningJobStatus, DeploymentStatus enums with valid transitions)
6. APIs / Interfaces (each step annotated with the API endpoint or internal function it represents)
7. State Management (state transition tables for each entity alongside diagrams)
8. Security (auth steps shown in every diagram, STS credential acquisition shown in provisioning flow, webhook signature check shown in deployment update flow)
9. Performance Targets (total wall-clock time annotated on each workflow: service creation E2E target < 5 min, webhook processing < 500ms, cost sync daily job < 10 min)
10. Error Handling (every diagram includes at least one failure path: Terraform apply failure → rollback flow, GitHub API failure → retry with backoff, Cost Explorer 429 → retry flow, JWT expiry → refresh flow)
11. Observability (steps where correlation IDs are propagated, where audit log entries are written, where Prometheus counters are incremented)
12. Testing Strategy (how each diagram maps to an integration or E2E test scenario)
13. Deployment Considerations (not applicable beyond referencing 11-Testing-and-Deployment)
14. Mermaid Diagrams — produce all of the following:
    - **Diagram 1: User Authentication Flow** — login, JWT issuance, token refresh, logout
    - **Diagram 2: Service Creation & Provisioning Flow (Happy Path)** — developer submits form → API validates → job enqueued → GitHub repo created → Terraform apply → CI/CD workflow committed → service status updated → developer notified
    - **Diagram 3: Terraform Provisioning Failure & Rollback Flow** — terraform apply fails → error captured → rollback triggered → terraform destroy → job marked rolled_back → service marked failed → developer notified
    - **Diagram 4: CI/CD Deployment Flow** — push to main branch → GitHub Actions triggers → build/test/deploy → webhook sent to Forge → deployment record updated → dashboard reflects new status
    - **Diagram 5: Cost Sync Flow** — cron triggers → STS assume CostExplorerReadRole → GetCostAndUsage API call → parse and aggregate → upsert cost_records → mark synced_at
    - **Diagram 6: Service Deletion & Decommission Flow** — developer requests delete → RBAC check → service marked decommissioning → Terraform destroy → GitHub repo archived → service marked decommissioned → cost sync stops for service
    - **Diagram 7: JWT Token Refresh Flow** — access token expiry detected by frontend → silent refresh request → server validates refresh token → new access token issued → original request retried
    - **Diagram 8: Webhook Signature Verification Flow** — GitHub sends event → Forge verifies HMAC-SHA256 signature → event type filtered → deployment record updated
15. ADRs (ADR-032: Mermaid over PlantUML for native GitHub rendering; ADR-033: Include failure paths in all diagrams to drive test coverage)
16. Anti-patterns (no diagrams that only show happy paths, no skipping auth/security steps in diagrams, no workflow that lacks a defined failure state)
17. Acceptance Criteria

## Writing Rules
- Production-ready
- Extremely detailed
- No placeholders
- No TODOs
- AI-agent friendly
- Cross-reference 05-Backend-API, 07-Terraform-Provisioning-Engine, 08-CICD-Integration, 09-Cost-Dashboard, 10-Security-and-IAM
- Explain engineering decisions and trade-offs
- Use Markdown only

## Expected Output
Produce a complete specification suitable for direct implementation by AI coding agents.
