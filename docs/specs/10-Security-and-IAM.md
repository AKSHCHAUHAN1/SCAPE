# 10-Security-and-IAM

## Role
Act as a Principal Engineer, Staff SRE, Security Architect, and Technical Writer.

## Objective
Produce an enterprise-grade implementation specification for **Security & IAM in Forge — Self-Service Cloud Provisioning Platform**. This document is the authoritative security reference for all team members and must be consulted before implementing any authentication, authorisation, credential management, or audit logging logic.

## Mandatory Sections
1. Executive Summary
2. Goals (least-privilege access, no long-lived privileged credentials, full audit trail, secrets never in code or logs, defence-in-depth)
3. Architecture (IAM role hierarchy, trust boundaries, credential lifecycle)
4. Folder Structure (Terraform IAM modules, backend security middleware, secrets management config)
5. Data Models (audit_logs schema from 04-Database-Design, JWT payload structure, STS session metadata)
6. APIs / Interfaces (auth endpoints from 05-Backend-API, IAM policy JSON for each role, STS AssumeRole call parameters)
7. State Management (JWT access token lifecycle, refresh token rotation, STS credential cache TTL)
8. Security:
   - IAM Role Hierarchy: ForgePlatformRole (admin, used only by backend service) → ForgeProvisioningRole (assumed per job via STS for Terraform) → CostExplorerReadRole (assumed by cost sync worker) → ForgeDeployRole (assumed by GitHub Actions via OIDC, no stored keys)
   - STS AssumeRole flow for Terraform: max session 1 hour, ExternalId per service to prevent confused deputy, session tags passed as resource tags to provisioned infrastructure
   - GitHub Actions OIDC: no AWS_SECRET_ACCESS_KEY stored in GitHub — use `aws-actions/configure-aws-credentials` with OIDC provider and ForgeDeployRole
   - JWT security: RS256 signing, access token 15 min TTL, refresh token 7 days stored HttpOnly SameSite=Strict cookie, refresh token rotation on every use, revocation list in Redis
   - Secrets management: all secrets (DB password, GitHub App private key, JWT private key, AWS credentials for platform role) stored in AWS Secrets Manager, injected at runtime via AWS SDK, never in environment variable files or source code
   - Input validation: every API endpoint validates with Zod (TypeScript) or Go validator, reject and log 422 on invalid input
   - Network security: all traffic TLS 1.2+, HSTS header, API behind ALB with WAF rules (OWASP Top 10), PostgreSQL only accessible from backend security group
   - RBAC enforcement: middleware checks JWT role claim before every protected route, resource ownership check (team_id match) on service-scoped endpoints
   - Audit logging: every mutating API action logged to audit_logs (actor, action, resource_type, resource_id, payload diff, IP, timestamp), immutable (no UPDATE/DELETE on audit_logs), searchable by admin
9. Performance Targets (STS AssumeRole < 500ms, JWT validation middleware < 5ms, secrets fetch cached 15 min in-process, audit log write async via DB pool)
10. Error Handling (STS AssumeRole failure → abort provisioning job, log error without credential details; JWT expired → 401 with WWW-Authenticate header; unauthorised resource access → 403 with audit log entry; invalid webhook signature → 401 and discard)
11. Observability (CloudTrail enabled for all AWS API calls in platform account, API access logs with correlation IDs, failed auth attempts alerted via CloudWatch metric filter)
12. Testing Strategy (unit tests for RBAC middleware with mocked JWT payloads, integration tests for STS flow with mocked AWS SDK, security scanning with `npm audit` / `govulncheck`, OWASP ZAP scan in CI pipeline)
13. Deployment Considerations (IAM roles defined in Terraform, never created manually in console; secrets rotation schedule 90 days; platform role has MFA condition for console access; separate AWS accounts for staging and production)
14. Mermaid Diagrams (IAM role trust graph, JWT token lifecycle, STS credential flow for provisioning job, GitHub OIDC auth flow)
15. ADRs: ADR-025 STS ExternalId per service to prevent confused deputy attack; ADR-026 GitHub OIDC over stored AWS keys in GitHub Secrets; ADR-027 RS256 JWT over HS256 for key rotation without shared secret; ADR-028 Secrets Manager over Parameter Store for automatic rotation support
16. Anti-patterns (no wildcard IAM actions, no `*` resource in any policy, no long-lived access keys for automation, no secrets in Git, no JWT stored in localStorage, no refresh token in response body)
17. Acceptance Criteria

## Writing Rules
- Production-ready
- AI-agent friendly
- Highly detailed
- No placeholders
- No TODOs
- Self-contained
- Cross-reference 03-System-Architecture, 04-Database-Design, 05-Backend-API, 07-Terraform-Provisioning-Engine, 08-CICD-Integration
- Include Mermaid diagrams where useful

## Output
Generate a complete implementation handbook rather than a high-level outline.
