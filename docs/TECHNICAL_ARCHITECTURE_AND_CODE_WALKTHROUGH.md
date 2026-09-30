# SCAPE: Technical Architecture & Codebase Line-by-Line Walkthrough

**Document Version:** 1.0.0  
**Project Title:** SCAPE — Self-Service Cloud Provisioning Platform  
**Target Audience:** Capstone Evaluators, Technical Reviewers, Senior Software Engineers, SREs  
**Scope:** Exhaustive practical and theoretical explanation of completed components (Sprints 1–8), line-by-line code breakdowns, and technical roadmap for remaining components (Sprints 9–12).

---

# Part I: Architectural Principles & Theoretical Foundations

## 1. The Platform Engineering Paradigm
In modern cloud-native engineering, organizations face a critical tension between **developer velocity** and **operational governance**.
* **ConsoleOps Anti-Pattern:** Granting developers direct access to the AWS/GCP Management Console leads to configuration drift, unversioned infrastructure, orphaned resources, excessive privileges, and budget overruns.
* **TicketOps Bottleneck:** Funneling all infrastructure requests through Jira tickets to a dedicated DevOps team slows lead times from minutes to weeks, turning DevOps engineers into human ticket routers.
* **GitOps Gaps:** While GitOps (e.g., ArgoCD) excels at application deployment to existing Kubernetes clusters, it does not solve initial Day-0 cloud infrastructure bootstrapping (VPC, Subnets, RDS, IAM, S3, CDN) for application developers who do not know Terraform.

**The Solution — Internal Developer Platform (IDP):**
SCAPE acts as a self-service orchestration plane. It translates high-level developer intents ("I need a Node.js API with PostgreSQL in Mumbai") into standardized, version-controlled, auditable, and isolated Infrastructure-as-Code (IaC) pipelines with automated CI/CD and cost attribution, completing in under 5 minutes without human operations intervention.

---

## 2. Event-Driven Asynchronous Provisioning Lifecycle
Cloud provisioning operations (such as creating an AWS RDS PostgreSQL instance or an Application Load Balancer) are I/O-bound and take between 2 to 6 minutes. Executing these within a synchronous HTTP request-response cycle leads to socket timeouts, connection drops, and API thread starvation.

SCAPE implements an **Event-Driven Architecture** powered by **BullMQ** and **Redis**:

```
[Developer] 
    │  POST /services
    ▼
[API Server (Express)]
    │  1. Validate Input (Zod)
    │  2. INSERT services (status: 'pending')
    │  3. INSERT provisioning_jobs (status: 'queued')
    │  4. BullMQ Queue .add('provision', jobData)
    │  5. 202 Accepted { serviceId, jobId }
    ▼
[Redis Message Broker]
    │  Atomic Lock & Persistent Queue
    ▼
[Provisioning Worker]
    │  1. Assume IAM Role via STS (short-lived 1-hr token)
    │  2. Generate Dynamic Workspace Directory
    │  3. Configure S3 Remote Backend & DynamoDB Lock Table
    │  4. Spawn Terraform CLI (`terraform init` -> `terraform apply`)
    │  5. Stream stdout/stderr & Sanitise Logs
    ├─────────────────────────────┬─────────────────────────────┐
    ▼ (On Success)               ▼ (On Error / Timeout)       ▼
[CI/CD Integrator]          [Rollback Coordinator]        [Database Update]
 • Render Workflow YAML      • Execute `terraform destroy`  • Status: 'active'/'failed'
 • GitHub App Commit to repo • Restore state                • Persist Sanitized Logs
 • Register Webhook          • Mark service 'failed'        • Audit Log Record
```

---

## 3. Cryptographic Security & Multi-Tenancy Theory
1. **Multi-Tenant Team Isolation:** Services belong to `teams`. When a non-admin developer queries `GET /services`, SQL queries are strictly filtered by `team_id = $1`. Cross-team modification returns HTTP 403 Forbidden.
2. **Ephemeral Cloud Credentials (STS):** The backend does not run with permanent admin AWS credentials. For every provisioning job, the worker executes `sts:AssumeRole` to retrieve temporary credentials (`AccessKeyId`, `SecretAccessKey`, `SessionToken`) valid for exactly 60 minutes.
3. **Log Sanitization (Defense-in-Depth):** Terraform outputs frequently print environment variables, database strings, or connection tokens. SCAPE runs all process stdout/stderr through a regular expression pipeline redacting AWS Access Keys (`AKIA...`), GitHub Personal Access & Installation tokens (`ghp_...`, `ghs_...`), Bearer tokens, and database passwords before database insertion.
4. **Timing-Safe Webhook Signatures:** Inbound GitHub webhook calls are signed with an HMAC-SHA256 signature in the `X-Hub-Signature-256` header. SCAPE computes the digest using `crypto.createHmac('sha256', secret)` and compares digests using `crypto.timingSafeEqual` to eliminate timing-attack vulnerabilities.

---

# Part II: Exhaustive File-by-File & Line-by-Line Code Walkthrough

---

## 1. Backend Core & Configuration

### `server/src/server.ts`
* **Purpose:** The runtime entry point of the Node.js backend.
* **Line-by-Line Breakdown:**
  * Lines 1–4: Imports `dotenv/config` to populate `process.env`, the Express application instance from `./app.js`, configuration constants from `./config/index.js`, and the Pino structured logger.
  * Line 5: `import './modules/provisioning/provisioning.worker.js';` — **Crucial line:** Boots the background BullMQ Redis worker inside the same Node runtime process, establishing listeners on the `provisioning` queue immediately upon startup.
  * Lines 7–12: Binds `app.listen(PORT)` and logs the operational environment (`development` / `production`) and listening URL.

### `server/src/config/index.ts`
* **Purpose:** Centralized, immutable configuration singleton reading environment variables with production defaults.
* **Line-by-Line Breakdown:**
  * Lines 5–8: Extracts `nodeEnv`, `port` (default: 3000), and `corsOrigin` (`http://localhost:5173`).
  * Lines 10–16: `db` object configuring PostgreSQL host, port, database name (`scape`), user, and password.
  * Lines 18–21: `redis` object configuring Redis host and port (default: 6379).
  * Lines 23–28: `jwt` configuration with access token secret/expiry (15m) and refresh token secret/expiry (7d).
  * Lines 30–35: `aws` object containing region (`ap-south-1`), account ID, and IAM Role ARNs for provisioning and Cost Explorer.
  * Lines 37–42: `terraform` parameters specifying S3 state bucket (`scape-tf-state`), DynamoDB lock table (`scape-tf-locks`), apply timeout (10 min), and destroy timeout (5 min).
  * Lines 44–49: `github` parameters for GitHub App ID, private key path, installation ID, and webhook secret.

### `server/src/app.ts`
* **Purpose:** Express application definition and middleware pipeline assembly.
* **Line-by-Line Breakdown:**
  * Lines 1–23: Imports Express, security middleware (`helmet`, `cors`, `compression`, `cookie-parser`), custom middlewares, and all module route handlers.
  * Lines 27–29: `app.use(helmet())` sets secure HTTP headers (XSS protection, MIME sniffing protection); `cors()` permits credentials and restricts origins.
  * Lines 30–35: `express.json()` with `verify: (req, _res, buf) => { req.rawBody = buf; }` — **Critical Line:** Retains the exact raw byte buffer of inbound requests, which is mathematically required for HMAC-SHA256 GitHub webhook signature verification.
  * Lines 37–39: Registers cookie parsing and `requestLogger` (Pino correlation ID tracking).
  * Lines 41–54: Routes mounting:
    * `/health` → `healthRoutes` (readiness/liveness probes)
    * `/auth` → `rateLimiter` + `authRoutes` (login/register)
    * `/users`, `/teams`, `/templates`, `/services`, `/jobs`, `/deployments`, `/costs`, `/audit-logs`, `/webhooks`.
  * Line 57: `app.use(errorHandler)` — Catch-all error handler enforcing standard `{ code, message }` JSON contract.

---

## 2. Database Layer & Migrations

### `server/src/database/index.ts`
* **Purpose:** PostgreSQL connection pooling and transaction execution wrapper.
* **Key Mechanics:**
  * Initializes `pg.Pool` with connection parameters from `config.db`.
  * Exports `query<T>(text, params)` helper logging execution duration and row count in development.

### Migrations Inventory (`server/src/database/migrations/`)
1. **`001_create_enums.sql`**: Declares Postgres enum types: `user_role` (`developer`, `team_lead`, `devops`, `admin`), `cloud_provider` (`aws`, `gcp`), `service_status` (`pending`, `provisioning`, `active`, `failed`, `decommissioned`), `job_status` (`queued`, `running`, `succeeded`, `failed`, `rolled_back`), `deployment_status` (`pending`, `running`, `succeeded`, `failed`).
2. **`002_create_teams.sql`**: Creates `teams` table (`id` UUID, `name` UNIQUE).
3. **`003_create_users.sql`**: Creates `users` table with foreign key `team_id REFERENCES teams(id)` and `role user_role`.
4. **`004_create_service_templates.sql`**: Declares templates table (`id`, `name`, `cloud_provider`, `resource_types` JSONB, `terraform_module_path`, `cicd_template_path`).
5. **`005_create_services.sql`**: Declares `services` table with composite constraint `CONSTRAINT uq_services_name_team UNIQUE (name, team_id)`.
6. **`006_create_provisioning_jobs.sql`**: Declares `provisioning_jobs` linking `service_id` and `triggered_by`.
7. **`007_create_deployments.sql`**: Declares `deployments` tracking commit hash, branch, GitHub Actions run ID.
8. **`008_create_cost_records.sql`**: Declares `cost_records` with composite uniqueness `(service_id, period_start, period_end)` to prevent duplicate billing entries.
9. **`009_create_audit_logs.sql`**: Append-only audit table (`actor_id`, `action`, `resource_type`, `resource_id`, `payload`, `ip_address`).
10. **`010_enhance_provisioning_jobs.sql`**: Adds `terraform_logs TEXT`, `terraform_plan_output TEXT`, `timeout_at TIMESTAMPTZ`, and enum value `manual_intervention_required`.
11. **`011_enhance_deployments.sql`**: Adds `workflow_content_hash VARCHAR(64)` and `workflow_file_path VARCHAR(500)` for CI/CD tamper-proofing.

---

## 3. Authentication & RBAC Module (`server/src/modules/auth/`)

### `auth.service.ts`
* **Purpose:** Core business logic for identity management, password hashing, and token lifecycles.
* **Line-by-Line Breakdown:**
  * Line 17: `const revokedTokens = new Set<string>();` — In-memory token revocation blacklist. Tokens invalidated via `/logout` are added here and rejected by the refresh endpoint.
  * Lines 30–60 (`register`): Checks email uniqueness, verifies `teamId` validity, hashes password using `bcrypt.hash(password, 12)`, inserts user into database, generates token pair, and emits `user.registered` audit log.
  * Lines 65–95 (`login`): Fetches user by email, verifies password using `bcrypt.compare(password, user.password_hash)`. Returns `{ accessToken, refreshToken, user }`. Throws 401 if invalid.
  * Lines 100–125 (`refreshAccessToken`): Verifies refresh token signature, checks if token ID exists in `revokedTokens` set, fetches latest user profile, and generates a fresh 15-minute access token.
  * Lines 130–140 (`revokeToken`): Adds the refresh token to the blacklist Set.

### `auth.middleware.ts`
* **Purpose:** Request authentication and role-based route protection.
* **Line-by-Line Breakdown:**
  * Lines 15–40 (`authenticate`): Extracts `Authorization: Bearer <token>` header. Uses `jwt.verify(token, config.jwt.accessSecret)`. On success, attaches `req.user = { userId, email, role, teamId }` to the request context. Throws 401 on missing or expired tokens.
  * Lines 45–60 (`authorize(...allowedRoles)`): Higher-order middleware factory. Compares `req.user.role` against `allowedRoles`. If `admin` or matching role, calls `next()`; otherwise returns HTTP 403 Forbidden (`FORBIDDEN: Insufficient permissions`).

---

## 4. Provisioning Engine Module (`server/src/modules/provisioning/`)

### `provisioning.worker.ts`
* **Purpose:** The core background worker orchestrating Terraform execution and state transitions.
* **Line-by-Line Breakdown:**
  * Lines 19–35: Imports BullMQ `Worker`, AWS STS client, database utilities, and sub-services (`TerraformRunner`, `RollbackCoordinator`, `CicdIntegrator`).
  * Lines 41–85 (`updateJobStatus`): Updates job status in Postgres (`running`, `succeeded`, `failed`, `rolled_back`), sets timestamps (`started_at`, `completed_at`), and stores sanitized logs.
  * Lines 108–126 (`assumeProvisioningRole`): Dispatches `AssumeRoleCommand` to AWS STS. Retrieves short-lived `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN`.
  * Lines 132–200 (`processProvisioningJob`):
    * Computes deadline: `timeoutAt = Date.now() + APPLY_TIMEOUT_MS`.
    * Invokes `generateEnvironment()` to synthesize `terraform/environments/${serviceId}`.
    * Instantiates `TerraformRunner` and runs `runner.apply(serviceId, variables, awsEnv)`.
  * Lines 202–248: Succeeded Apply Flow:
    * Sanitizes logs via `sanitizeTerraformLogs()`.
    * Updates service to `active` and extracts outputs (e.g., ALB DNS, CloudFront URL).
    * Triggers `CicdIntegrator.integrate()` to set up GitHub Actions.
    * Writes `job.succeeded` audit log.
  * Lines 250–273: Failed Apply Flow:
    * Updates job to `failed`.
    * Dispatches `executeRollback()` to trigger automatic `terraform destroy`.
  * Lines 294–301: Declares `provisioningWorker = new Worker('provisioning', ..., { concurrency: 5 })`.

### `terraform-runner.ts`
* **Purpose:** Process-level executor wrapping the Terraform CLI.
* **Key Mechanics:**
  * Spawns `terraform` using Node's `child_process.spawn`.
  * Accumulates stdout/stderr into memory buffers with millisecond timestamps.
  * Supports cancellation via `AbortController` and enforces max execution timeouts (`setTimeout` calling `process.kill('SIGTERM')`).
  * Parses JSON outputs via `terraform output -json`.

### `state-manager.ts`
* **Purpose:** Constructs remote S3 backend configurations per service.
* **Key Mechanics:**
  * Configures S3 backend:
    ```hcl
    terraform {
      backend "s3" {
        bucket         = "scape-tf-state"
        key            = "services/${serviceId}/terraform.tfstate"
        region         = "ap-south-1"
        dynamodb_table = "scape-tf-locks"
        encrypt        = true
      }
    }
    ```
  * Ensures that every service has total state isolation — service A cannot corrupt service B's state.

### `rollback-coordinator.ts`
* **Purpose:** Automatic disaster recovery when provisioning encounters an error.
* **Key Mechanics:**
  * Evaluates failure reason.
  * If partial resources were provisioned, executes `runner.destroy()` in the workspace to clean up cloud resources.
  * Updates `provisioning_jobs` status to `rolled_back` or `manual_intervention_required` (if destroy fails).
  * Updates `services` status to `failed`.

### `log-sanitizer.ts`
* **Purpose:** Security redaction filter.
* **Key Mechanics:**
  * Uses regular expressions to scrub:
    * AWS Access Keys: `/(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g` → `[REDACTED_AWS_KEY]`
    * GitHub Tokens: `/(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}/g` → `[REDACTED_GITHUB_TOKEN]`
    * Bearer Tokens: `/Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_=]*/g` → `Bearer [REDACTED_JWT]`
    * Database URIs: `/(postgres|mysql|mongodb):\/\/[^:\s]+:[^@\s]+@[^\s]+/g` → `[REDACTED_DB_CONNECTION]`

### `environment-generator.ts`
* **Purpose:** Dynamically synthesizes Terraform workspace directories.
* **Key Mechanics:**
  * Creates directory `terraform/environments/${serviceId}`.
  * Writes `main.tf` referencing the template module (e.g., `source = "../../modules/nodejs-api"`).
  * Writes `backend.tf` with the isolated S3 state parameters.
  * Writes `terraform.tfvars.json` injecting service-specific variables.

---

## 5. CI/CD Integration Module (`server/src/modules/cicd/`)

### `cicd-integrator.ts`
* **Purpose:** Orchestrates post-provisioning repository and pipeline setup.
* **Line-by-Line Breakdown:**
  * Lines 61–100 (`integrate`): Resolves template type (`nodejs-api` or `static-frontend`), gathers Terraform outputs (ECR repo, ECS cluster, S3 bucket), and calls `renderWorkflowYaml()`.
  * Lines 106–126: Calls `GitHubIntegrator.commitWorkflowFile()` to commit `.github/workflows/deploy.yml` directly into the repository's `main` branch.
  * Lines 128–157: Calls `GitHubIntegrator.registerWebhook()` to register the SCAPE webhook receiver URL for `workflow_run` and `push` events.
  * Lines 159–175: Inserts initial deployment record in `deployments` table with status `pending` and `workflow_content_hash`.

### `webhook.controller.ts`
* **Purpose:** Ingestion and verification of GitHub webhook deliveries.
* **Line-by-Line Breakdown:**
  * Lines 31–49 (`verifySignature`): Computes HMAC-SHA256 of `payload` with `secret`. Executes `crypto.timingSafeEqual` against the `x-hub-signature-256` header.
  * Lines 81–110 (`handleGitHubWebhook`): Checks signature. If invalid, emits audit log `webhook.signature_invalid` and responds with HTTP 401 Unauthorized.
  * Lines 115–180: Event routing:
    * `workflow_run`: Updates `deployments` record matching `commit_sha` or run ID. Maps GitHub statuses (`queued` → `pending`, `in_progress` → `running`, `completed` + `success` → `succeeded`, `failure` → `failed`).
    * `push`: Logs commit author, hash, and branch.

---

## 6. Frontend Portal Architecture (`client/src/`)

### `store/authStore.ts` & `api/index.ts`
* **Purpose:** Client-side state persistence and HTTP interceptor chain.
* **Key Mechanics:**
  * `authStore.ts` uses **Zustand** with `persist` middleware storing `accessToken` and user object in `localStorage`.
  * `api/index.ts` creates an Axios instance. An `onRequest` interceptor automatically injects `Authorization: Bearer ${token}` on every outgoing API request.
  * An `onResponseError` interceptor captures HTTP 401s, attempts a transparent token refresh via `/auth/refresh`, and retries the original request.

### `pages/CreateService/CreateServicePage.tsx`
* **Purpose:** Multi-step wizard guiding developers through infrastructure requests.
* **Component Structure:**
  * **Step 1 (Template):** Queries `/templates` using React Query (`useTemplates`). Renders selection cards for `Node.js API` and `Static Frontend` with architecture tags.
  * **Step 2 (Metadata):** Validates service name with regex `/^[a-z0-9-]+$/` (enforces cloud resource naming standards) and selects region.
  * **Step 3 (Configuration):** Displays CPU/RAM/Database presets based on the chosen template.
  * **Step 4 (Review & Submit):** Displays complete parameter summary. On submit, calls `servicesApi.createService()`, transitions to the live provisioning progress view, and begins polling the job status.

### `pages/ServiceDetail/ServiceDetailPage.tsx`
* **Purpose:** Complete service management cockpit.
* **Component Structure:**
  * **Header:** Displays service name, environment, creation date, and status badge (`StatusBadge.tsx`).
  * **Tabs:**
    * *Overview:* Service metadata, cloud provider, repository link, and active endpoints.
    * *Provisioning Progress:* Stepper showing stages (`Init`, `Plan`, `Apply`, `Complete`) with real-time log terminal and retry button if failed.
    * *Deployments:* DataTable showing historical deployments, commit SHAs, authors, branches, and GitHub Actions run links.
    * *Cost:* Recharts graph showing daily cost trends for this specific service.

---

## 7. Terraform Infrastructure Modules (`terraform/modules/`)

### `terraform/modules/nodejs-api/main.tf`
* **Purpose:** Production-grade AWS infrastructure module for containerized APIs.
* **Resources Declared:**
  1. `aws_vpc.main`: Isolated VPC with `10.0.0.0/16` CIDR.
  2. `aws_subnet.public`: 2 Public subnets across different Availability Zones for high-availability routing.
  3. `aws_internet_gateway.main` & `aws_route_table.public`: Public egress/ingress routing.
  4. `aws_ecs_cluster.main` & `aws_ecr_repository.app`: Container registry and ECS Fargate compute cluster.
  5. `aws_ecs_task_definition.app`: Fargate task specifying 256 CPU, 512MB RAM, environment variables, and CloudWatch log groups.
  6. `aws_lb.main` & `aws_security_group.alb`: Application Load Balancer with port 80 ingress and health checks.
  7. `aws_db_instance.postgres` & `aws_db_subnet_group.main`: Managed RDS PostgreSQL instance with security group allowing access only from the ECS task tier.

### `terraform/modules/static-frontend/main.tf`
* **Purpose:** AWS static web hosting stack.
* **Resources Declared:**
  1. `aws_s3_bucket.website`: Dedicated S3 bucket for web assets with public access completely blocked (`aws_s3_bucket_public_access_block`).
  2. `aws_cloudfront_origin_access_identity.oai`: CloudFront identity allowing only the CDN distribution to read S3 objects.
  3. `aws_s3_bucket_policy.website`: Restricts `s3:GetObject` to the CloudFront OAI principal.
  4. `aws_cloudfront_distribution.cdn`: Global CDN distribution with HTTPS redirection, gzip compression, and caching rules.

---

# Part III: Technical Roadmap — What Is Left & How It Will Be Done (Sprints 9–12)

---

## 1. Sprint 9–10: Real Cloud Cost Sync & Platform Observability

### A. Live AWS Cost Explorer Integration
* **Current State:** The mock/fallback client in `server/src/modules/cost/explorer-client.ts` calculates baseline costs for demo purposes.
* **How It Will Be Implemented:**
  1. **IAM Permissions:** Provision an IAM Role `scape-cost-explorer-role` with permission `ce:GetCostAndUsage`.
  2. **AWS SDK Integration:** Connect `@aws-sdk/client-cost-explorer` in `explorer-client.ts`:
     ```typescript
     const command = new GetCostAndUsageCommand({
       TimePeriod: { Start: startDate, End: endDate },
       Granularity: 'DAILY',
       Metrics: ['UnblendedCost'],
       GroupBy: [
         { Type: 'TAG', Key: 'ServiceId' },
         { Type: 'DIMENSION', Key: 'SERVICE' }
       ],
     });
     const response = await this.client.send(command);
     ```
  3. **Automated Scheduler:** Wire `cost.scheduler.ts` to execute a daily cron at 06:00 UTC using Node cron or BullMQ recurring jobs, parsing the tag `ServiceId` and executing `upsertCostRecord()` in Postgres.

### B. Prometheus & Grafana Metrics Engine
* **Current State:** Pino structured logs with correlation IDs.
* **How It Will Be Implemented:**
  1. Install `prom-client` in `server/package.json`.
  2. Create `server/src/utils/metrics.ts` exporting custom metrics:
     * `scape_provisioning_duration_seconds` (Histogram partitioned by template and status).
     * `scape_provisioning_jobs_total` (Counter partitioned by status: `succeeded`, `failed`, `rolled_back`).
     * `scape_queue_waiting_jobs` (Gauge tracking BullMQ backlog).
     * `scape_deployments_total` (Counter tracking GitHub Actions triggers).
  3. Mount `GET /metrics` in `server/src/app.ts` protected by basic auth for Prometheus scraping.
  4. Author Grafana dashboard JSON in `infra/grafana/dashboards/platform-overview.json`.

---

## 2. Sprint 11–12: End-to-End Testing & Staging Kubernetes Deployment

### A. Playwright Automated End-to-End Test Suite
* **Current State:** Server unit tests (83 tests) and client unit smoke tests.
* **How It Will Be Implemented:**
  1. Configure Playwright in `client/playwright.config.ts`.
  2. Author end-to-end user journey tests in `client/e2e/`:
     * `auth.spec.ts`: Tests registration, invalid password lockout, successful login, and logout token invalidation.
     * `service-creation.spec.ts`: Logs in as developer, completes the 4-step wizard, asserts that the service appears in `/services`, and verifies that the provisioning progress bar animates.
     * `rbac-isolation.spec.ts`: Logs in as `dev@scape.dev` (Frontend Team), verifies inability to view or delete Platform Engineering services.

### B. Kubernetes Staging Deployment Manifests
* **Current State:** Local Docker Compose environment (`infra/docker-compose.yml`).
* **How It Will Be Implemented:**
  1. Author container specifications in `infra/k8s/`:
     * `postgres-statefulset.yaml`: PersistentVolumeClaim and StatefulSet for PostgreSQL.
     * `redis-deployment.yaml`: Redis cache deployment and ClusterIP service.
     * `server-deployment.yaml`: Express API server deployment with horizontal pod autoscaler (HPA: min 2, max 5 replicas based on CPU > 70%).
     * `client-deployment.yaml`: Nginx Alpine serving built Vite React static assets.
     * `ingress.yaml`: Ingress controller routing `api.scape.internal` to server and `portal.scape.internal` to client with TLS termination.

### C. Automated Security & OWASP ZAP Scanning
* **Current State:** Helmet headers and rate limiting.
* **How It Will Be Implemented:**
  1. Add OWASP ZAP baseline scan step to `.github/workflows/ci.yml`:
     ```yaml
     - name: OWASP ZAP Baseline Scan
       uses: zaproxy/action-baseline@v0.12.0
       with:
         target: 'http://localhost:3000'
         rules_file_name: '.zap/rules.tsv'
     ```
  2. Enforce zero High or Critical vulnerabilities policy as a pull-request merge gate.

---

# Part IV: Summary Matrix

| Milestone | Layer | Status | Key Technical Deliverable |
| :--- | :--- | :---: | :--- |
| **Sprint 1–2** | Foundation | **100% Done** | Postgres 15 schemas (11 migrations), JWT auth, token revocation set, RBAC middleware. |
| **Sprint 3–4** | Provisioning Core | **100% Done** | BullMQ queue, Redis broker, Terraform modules (`nodejs-api`, `static-frontend`), POST `/services`. |
| **Sprint 5–6** | Portal UI | **100% Done** | React 18 SPA, Vite, Tailwind CSS, service catalog, creation wizard, detail cockpit, Recharts. |
| **Sprint 7–8** | CI/CD & Safety | **100% Done** | GitHub App RS256 auth, Handlebars deploy workflow generator, HMAC webhook receiver, Rollback coordinator, Log sanitizer. |
| **Sprint 9–10** | Observability | *Roadmap* | Live AWS Cost Explorer API integration, Prometheus metrics exporter (`/metrics`), Grafana dashboard. |
| **Sprint 11–12** | Production Staging | *Roadmap* | Playwright E2E test suite, Kubernetes manifests (`infra/k8s`), OWASP ZAP automated CI security gate. |
