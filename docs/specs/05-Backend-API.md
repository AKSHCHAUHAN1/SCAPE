# 05-Backend-API

## Purpose
Create an implementation-grade specification for this topic: **Backend API for Forge — Self-Service Cloud Provisioning Platform**.

## Objective
Write this document as if it will be used by senior engineers and AI coding agents. Every endpoint must be fully specified with method, path, request body, response body, status codes, auth requirements, and error contracts.

## Requirements
- Use Markdown
- Include executive summary
- Technology choice: Node.js (Express/Fastify) or Go (Gin/Chi) with rationale and final selection stated explicitly
- Authentication flow: JWT issued on login (RS256, 15 min access token + 7 day refresh token in HttpOnly cookie), token refresh endpoint, logout (refresh token revocation)
- Authorization model: middleware enforcing role-based checks (developer, team_lead, devops, admin) and resource ownership (user can only access services belonging to their team)
- Full endpoint specification for every route — for each endpoint specify:
  - Method + path
  - Auth: required role(s)
  - Request headers, path params, query params, request body (JSON schema)
  - Success response (status code + JSON body example)
  - Error responses (status codes: 400, 401, 403, 404, 409, 422, 500 + structured error body)
- Endpoint groups:
  - Auth: POST /auth/login, POST /auth/refresh, POST /auth/logout
  - Users: GET /users/me, PATCH /users/me
  - Teams: GET /teams, POST /teams, GET /teams/:id, GET /teams/:id/members, POST /teams/:id/members
  - Templates: GET /templates, GET /templates/:id
  - Services: POST /services, GET /services, GET /services/:id, DELETE /services/:id
  - Provisioning Jobs: GET /services/:id/jobs, GET /jobs/:id, POST /jobs/:id/retry
  - Deployments: GET /services/:id/deployments, GET /deployments/:id
  - Costs: GET /services/:id/costs, GET /services/:id/costs?period=2024-01
  - Audit Logs: GET /audit-logs (admin only), GET /audit-logs?resource_id=:id
  - Health: GET /health, GET /health/ready
- Provisioning orchestration logic (step-by-step internal flow on POST /services): validate input → create service record (status: pending) → enqueue provisioning job → respond 202 Accepted → worker picks job → create GitHub repo from template → run terraform apply → update job status → update service status → trigger initial CI/CD run
- Job queue design: in-process queue (Bull/BullMQ with Redis) for async workers; job schema, retry policy (3 retries with exponential backoff), dead-letter queue
- Webhook endpoints for GitHub Actions callback (POST /webhooks/github) — signature verification (HMAC-SHA256)
- Folder structure for the backend repository
- Error handling: structured error response format `{ code, message, details }`, global error handler middleware
- Observability: request logging (correlation ID), structured JSON logs, Prometheus metrics endpoint /metrics
- Security considerations: input validation (Zod/Joi), SQL injection prevention (parameterised queries), rate limiting (100 req/min per user), CORS policy
- Performance requirements: p99 API latency < 200ms for read endpoints, < 500ms for write endpoints, provisioning job queued within 1s of request
- Edge cases: duplicate service name per team, provisioning job already running when retry requested, GitHub API rate limit during repo creation, invalid JWT signature
- ADR section (ADR-010: BullMQ over custom worker for job queue; ADR-011: RS256 JWT for asymmetric key rotation; ADR-012: 202 Accepted pattern for async provisioning)
- Acceptance criteria

## Quality Bar
- Enterprise grade
- Production ready
- Extremely detailed
- No placeholders
- No TODOs
- Self-contained
- Cross-reference 03-System-Architecture, 04-Database-Design, 07-Terraform-Provisioning-Engine, 10-Security-and-IAM

## Output
Produce a complete specification, not an outline.
