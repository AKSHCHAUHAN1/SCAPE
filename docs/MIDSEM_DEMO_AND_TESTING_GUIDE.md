# SCAPE: Mid-Semester Presentation, Testing & Demonstration Guide

**Project Title:** SCAPE — Self-Service Cloud Provisioning Platform  
**Academic Year:** 2026 | Final Year Major Project / Capstone  
**Department:** Department of Computer Science & Engineering  
**Project Guide / Mentor:** Mr. Pranshu Srivastava  
**Repository Branch:** `main` (Commit: `792eb60`)

### Team Members & Roles
| Member Name | Student ID | Core Role | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **Aksh Chauhan** | 500120187 | **Project Lead & Systems Architect** | Core backend architecture, auth/RBAC, orchestration flow, integration |
| **Prince Singhalia** | 500120403 | **Database & Integration Engineer** | PostgreSQL schemas, migrations, seeds, cost aggregation |
| **Mohd. Anas** | 500121888 | **Frontend Developer** | React SPA, Tailwind UI/UX, service creation wizard, charts |
| **Vijay Kumar Mishra** | 500122742 | **DevOps & Cloud Engineer** | Terraform modules, BullMQ engine, GitHub Actions CI/CD automation |

---

## 1. Executive Summary & Presentation Readiness

### Is the Project Ready for the Mid-Semester Presentation?
**Yes, 100% ready.** In academic software engineering milestones, the mid-semester benchmark typically expects system design, database models, and initial backend CRUD (Sprints 1–4). SCAPE has surpassed this by delivering **Sprints 1 through 8**:
* **Complete Backend REST API** (11 modules, JWT auth with refresh rotation and token revocation, RBAC, health diagnostics).
* **Asynchronous Provisioning Engine** (BullMQ job queue, Redis message broker, Terraform CLI runner, state manager with S3/DynamoDB locking, automatic failure rollback coordinator, sensitive credential log sanitizer).
* **Automated CI/CD Integration** (GitHub App RS256 JWT auth, Handlebars deployment workflow renderer, HMAC-SHA256 signature verified webhook receiver).
* **Full-Featured React 18 Frontend Portal** (Vite, Tailwind CSS, service catalog, multi-step creation wizard, real-time provisioning stepper, live streaming log terminal, deployment triggers, cost graphs, audit trails).
* **Comprehensive Test Suite** (83 server unit tests across 16 test files + client tests, 100% green pass rate, 0 lint errors, 0 compilation errors).
* **Pre-Seeded Demonstration Data** (Realistic active services, Terraform execution logs, deployment history, 14 days of cost trends).

---

## 2. System Architecture & Prerequisites

### Architecture Topology
```
                     ┌────────────────────────────────────────────────────────┐
                     │               React 18 SPA (Vite + Tailwind)           │
                     │  Port: 5173 · Login · Catalog · Wizard · Cost · Audit  │
                     └───────────────────────────┬────────────────────────────┘
                                                 │ REST API (Bearer JWT)
                     ┌───────────────────────────▼────────────────────────────┐
                     │                 Node.js / Express Server               │
                     │  Port: 3000 · Auth · RBAC · Services · CI/CD · Costs   │
                     ├───────────────────────────┬────────────────────────────┤
                     │                           │                            │
            ┌────────▼────────┐         ┌────────▼────────┐          ┌────────▼────────┐
            │   PostgreSQL    │         │  Redis (BullMQ) │          │ GitHub Webhooks │
            │   Port: 5432    │         │   Port: 6379    │          │  HMAC-SHA256    │
            │  11 Migrations  │         │ Job Orchestrator│          │ Workflow Events │
            └─────────────────┘         └────────┬────────┘          └─────────────────┘
                                                 │
                                        ┌────────▼────────┐
                                        │ Provisioning    │
                                        │ Worker          │
                                        ├─────────────────┤
                                        │ Terraform CLI   │
                                        │ State: S3/Dynamo│
                                        │ Rollback Engine │
                                        │ Log Sanitizer   │
                                        └─────────────────┘
```

### System Prerequisites
Ensure the following tools are installed on your machine before running:
1. **Node.js**: `v20.x` or `v22.x` (Recommended: `node -v` >= 20)
2. **npm**: `v10.x` or higher
3. **Docker & Docker Compose**: Docker Desktop active and running
4. **Git**: Installed with repository access

---

## 3. Step-by-Step Execution Guide (How to Run Everything)

Follow these exact steps to start all infrastructure, backend services, and the web portal.

### Step 1: Environment Configuration
Make sure the environment variable files exist in the root, `server/`, and `client/` directories.

```bash
cd /Users/akshchauhan/Igris/NOTES/PROJECTS/CAPSTONE-1/SCAPE

# Ensure root .env exists
cp .env.example .env

# Ensure server .env exists
cp server/.env.example server/.env

# Ensure client .env exists
cp client/.env.example client/.env
```

*Server `.env` key configurations:*
* `POSTGRES_HOST=localhost`, `POSTGRES_PORT=5432`, `POSTGRES_DB=scape`
* `REDIS_HOST=localhost`, `REDIS_PORT=6379`
* `JWT_ACCESS_SECRET=dev-access-secret-change-in-production`
* `PORT=3000`, `CORS_ORIGIN=http://localhost:5173`

---

### Step 2: Start PostgreSQL and Redis Containers
Launch the containerized PostgreSQL database and Redis message broker via Docker Compose:

```bash
# From SCAPE repository root:
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d
```

**Verification:**
Run `docker ps` to ensure both containers are healthy and ports are forwarded:
* `scape-postgres` on `0.0.0.0:5432->5432/tcp`
* `scape-redis` on `0.0.0.0:6379->6379/tcp`

---

### Step 3: Run Database Migrations
Execute all 11 schema migrations (creating enums, tables, foreign keys, and indexes):

```bash
cd server
npm run db:migrate
```

**Expected Output:**
```
🔄 Applying: 001_create_enums.sql
✅ Applied: 001_create_enums.sql
...
🔄 Applying: 011_enhance_deployments.sql
✅ Applied: 011_enhance_deployments.sql
🎉 Applied 11 migration(s) successfully.
```

---

### Step 4: Seed Initial Accounts & Presentation Demo Data
Run the idempotent database seed script:

```bash
npm run db:seed
```

**Expected Output:**
```
🌱 Seeding: 001_seed.sql
✅ Seeded: 001_seed.sql
🌱 Seeding: 002_demo_data.sql
✅ Seeded: 002_demo_data.sql
🎉 All seed data applied successfully.
```

This populates:
1. **Teams**: `Platform Engineering`, `Frontend Team`
2. **Users**: 4 pre-configured users across all 4 system roles (`Password123!` for all).
3. **Templates**: `Node.js API` (ECS + RDS + ALB), `Static Frontend` (S3 + CloudFront).
4. **Active Services**: `payment-gateway-api`, `customer-portal-web`, `auth-microservice`.
5. **Execution Data**: Real Terraform provisioning logs, deployment histories, 14 days of cost records, and audit events.

---

### Step 5: Start the Backend Server & Provisioning Worker
In terminal window 1:

```bash
cd /Users/akshchauhan/Igris/NOTES/PROJECTS/CAPSTONE-1/SCAPE/server
npm run dev
```

**Expected Output:**
```
[15:28:27] INFO: 🚀 SCAPE server running on http://localhost:3000
[15:28:27] INFO:    Environment: development
```
*Note: The background BullMQ Redis worker automatically boots alongside the server.*

---

### Step 6: Start the Frontend Portal
In terminal window 2:

```bash
cd /Users/akshchauhan/Igris/NOTES/PROJECTS/CAPSTONE-1/SCAPE/client
npm run dev
```

**Expected Output:**
```
  VITE v6.4.3  ready in 168 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### Step 7: Access the Live Application
Open your browser and navigate to:
* **Web Portal:** `http://localhost:5173`
* **API Health Check:** `http://localhost:3000/health` (Returns `{"status":"ok","service":"scape-api"}`)

---

## 4. Pre-Configured Personas & Demo Credentials

Use these accounts during the presentation to demonstrate **Role-Based Access Control (RBAC)** and team data isolation:

| Persona / Name | Email | Password | Role | Team Scope | What to Demonstrate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@scape.dev` | `Password123!` | `admin` | Organization-Wide (All Teams) | Global catalog view, global cost dashboard, complete audit log trail |
| **Platform Engineer** | `devops@scape.dev` | `Password123!` | `devops` | Platform Engineering | Provisioning configuration, templates, infrastructure settings |
| **Team Lead** | `lead@scape.dev` | `Password123!` | `team_lead` | Frontend Team | Team service management, deployment triggers, cost tracking |
| **Software Developer** | `dev@scape.dev` | `Password123!` | `developer` | Frontend Team | Self-service creation wizard, service status monitoring |

---

## 5. Verification & Testing Playbook

Run these commands during preparation or in front of examiners to prove software quality.

### 1. Automated Server Unit Tests (83 Tests)
```bash
cd server
npm test
```
*Result:* **16 test files passed, 83 tests passed (100% green)**.
Covers:
* `auth.service.test.ts` & `auth.middleware.test.ts` (JWT generation, expiration, revocation, role guards)
* `services.service.test.ts` (Validation, team ownership, duplicate name constraints)
* `teams.service.test.ts` (Team isolation, member assignment)
* `terraform-runner.test.ts` (Command spawning, exit codes, timeout handling)
* `state-manager.test.ts` (S3 backend configuration, DynamoDB lock mapping)
* `log-sanitizer.test.ts` (16 test cases redacting AWS secrets, GitHub tokens, passwords)
* `rollback-coordinator.test.ts` (Failure recovery and status transitions)
* `cicd-integrator.test.ts` & `workflow-renderer.test.ts` (Handlebars YAML templating)
* `webhook.controller.test.ts` (HMAC-SHA256 signature verification)
* `cost.service.test.ts` & `deployments.service.test.ts`

### 2. Automated Client Smoke Tests
```bash
cd client
npm test
```
*Result:* **1 test file passed, 2 tests passed**. Confirms unauthenticated redirection to `/login` and rendering of login elements.

### 3. Code Quality & Linting
```bash
# Server Linting
cd server && npm run lint

# Client Linting
cd client && npm run lint
```
*Result:* **0 errors**. Fully compliant with ESLint 9 Flat Config and TypeScript-ESLint.

### 4. Production Build Verification
```bash
cd server && npm run build
cd client && npm run build
```
*Result:* TypeScript emits clean JS to `server/dist`, and Vite bundles optimized SPA assets to `client/dist`.

---

## 6. Detailed Feature Inventory: What Is Done vs What Is Left

### What Is Done & Fully Working (Sprints 1–8)

| Feature Area | Implemented Capabilities | Status |
| :--- | :--- | :---: |
| **Authentication & IAM** | JWT access tokens (15m) + refresh tokens (7d), in-memory revocation Set, bcrypt password hashing (cost factor 12), RBAC middleware with 4 role tiers. | **Done (100%)** |
| **Database Architecture** | PostgreSQL 15 relational schema with 11 migrations, foreign key constraints, composite unique indexes (`name + team_id`), UUID primary keys. | **Done (100%)** |
| **Service Catalog** | Template-driven catalog (`Node.js API`, `Static Frontend`), parameter schemas, resource tagging (`ManagedBy: scape`). | **Done (100%)** |
| **Self-Service Wizard** | 4-step interactive UI: template selection, metadata & region selection, resource dimensioning (CPU/RAM/DB), review & launch. | **Done (100%)** |
| **Provisioning Engine** | Redis BullMQ asynchronous queue, worker concurrency (5), Terraform runner with streaming logs, execution timeout protection (10 min). | **Done (100%)** |
| **State & Concurrency** | S3 remote state isolation per service (`services/${id}/terraform.tfstate`), DynamoDB distributed state locking. | **Done (100%)** |
| **Resilience & Safety** | Automatic failure rollback coordinator triggering `terraform destroy` on error, regex-based log sanitization redacting credentials. | **Done (100%)** |
| **CI/CD Integration** | GitHub App authentication (RS256 JWT + installation token), Handlebars pipeline renderer, automated `.github/workflows/deploy.yml` commit. | **Done (100%)** |
| **Webhook Ingestion** | GitHub webhook receiver verifying HMAC-SHA256 signatures with timing-safe comparison, event handling (`workflow_run`, `push`). | **Done (100%)** |
| **Cost Dashboard** | Aggregated daily cost tracking, 30-day historical trend graphs (Recharts), per-service cloud spend breakdown. | **Done (100%)** |
| **Audit Trail** | Append-only audit log capturing every administrative action, service mutation, deployment, and security event. | **Done (100%)** |

### What Is Left (Sprints 9–12 Post Mid-Sem Roadmap)

| Sprint | Focus Area | Planned Work & Implementation Strategy |
| :--- | :--- | :--- |
| **Sprint 9–10** | **Live Cloud Cost Sync & Metrics** | <ul><li>Connect live AWS Cost Explorer API / GCP Billing credentials to scheduled daily cron (`cost.scheduler.ts`).</li><li>Expose Prometheus metrics endpoint (`/metrics`) using `prom-client` tracking provisioning duration, queue latency, and error counters.</li><li>Provide pre-built Grafana dashboard JSON configurations.</li></ul> |
| **Sprint 11–12** | **End-to-End Testing & Staging Deploy** | <ul><li>Playwright end-to-end browser test automation testing complete user journeys from login to provisioning.</li><li>Staging environment deployment on Kubernetes using manifests in `infra/k8s`.</li><li>OWASP ZAP baseline automated security vulnerability scanning in GitHub Actions CI.</li><li>Final Capstone thesis documentation and project report.</li></ul> |

---

## 7. Mid-Sem Live Demonstration Script (Step-by-Step)

Follow this 10-minute presentation flow to impress your project guide and examiners:

### Part 1: Problem Statement & Motivation (1.5 Minutes)
* **Speaker:** Aksh Chauhan
* **Talking Points:**
  * "Modern engineering teams face a bottleneck: whenever a developer needs a new service, they must submit tickets to DevOps for cloud infrastructure, wait days for approvals, and manually configure CI/CD pipelines."
  * "SCAPE (Self-Service Cloud Provisioning Platform) solves this by providing an Internal Developer Platform (IDP) where developers can provision production-ready cloud services with CI/CD and cost tracking in under 5 minutes, without cloud console access."

### Part 2: Authentication & Team Isolation (2 Minutes)
* **Action:** Open `http://localhost:5173` in your browser.
* **Step 1:** Log in with `admin@scape.dev` (Password: `Password123!`).
* **Talking Points:**
  * Point out the dark modern UI built with Tailwind CSS.
  * Explain JWT authentication: short-lived 15-minute access tokens with 7-day refresh tokens and server-side token revocation on logout.
  * Show the top-right profile badge showing the role `admin` and team `Platform Engineering`.

### Part 3: Service Catalog & Pre-Provisioned Services (2 Minutes)
* **Action:** Navigate to **Services** (`/services`).
* **Talking Points:**
  * Show the existing seeded services: `payment-gateway-api` (Active Node.js API) and `customer-portal-web` (Active Static Frontend).
  * Highlight the team isolation and status badges (`active`, `provisioning`, `failed`).
* **Action:** Click into `payment-gateway-api`.
  * Click the **Provisioning Progress** tab: Show the actual simulated Terraform execution log with VPC, ECS cluster, RDS PostgreSQL, and ALB DNS creation.
  * Click the **Deployments** tab: Show the automated GitHub Actions deployment records triggered via the CI/CD integrator.

### Part 4: Live Service Creation Wizard (2.5 Minutes)
* **Action:** Click **New Service** (`/services/new`).
* **Step-by-Step Flow:**
  1. **Step 1 (Template):** Select `Node.js API`. Explain that this template packages an AWS VPC, ECS Fargate cluster, Application Load Balancer, and RDS PostgreSQL database.
  2. **Step 2 (Metadata):** Enter service name `billing-service`, environment `staging`, region `ap-south-1`.
  3. **Step 3 (Configuration):** Review CPU, RAM, and Database instance dimensions.
  4. **Step 4 (Review & Submit):** Click **Launch Service**.
* **Talking Points:**
  * "When I click submit, the backend validates the request, checks for team name uniqueness, creates a pending service record, and enqueues a job into Redis BullMQ."
  * "The provisioning worker picks up the job, dynamically synthesizes an isolated Terraform workspace, configures S3 remote state with DynamoDB locking, and triggers the Terraform runner."

### Part 5: Cost Visibility & Audit Trail (2 Minutes)
* **Action:** Navigate to **Cost Dashboard** (`/costs`).
* **Talking Points:**
  * Show the 30-day cloud expenditure trend graph and per-service breakdown.
  * Explain that developers usually lack cost visibility; SCAPE attributes AWS cloud costs directly to the responsible service and team.
* **Action:** Navigate to **Audit Logs** (`/admin/audit`).
* **Talking Points:**
  * Show the append-only operational audit log tracking every service creation, deployment, and administrative action with timestamps and user attribution.

---

## 8. Expected Examiner Questions & Model Answers

### Q1: "How does SCAPE prevent two developers from modifying infrastructure at the same time?"
**Answer:** "We enforce two layers of concurrency locking:
1. **Application layer:** When a provisioning job is running, the service status transitions to `provisioning`, preventing conflicting mutations through the API.
2. **Infrastructure layer:** Every service workspace uses an isolated Terraform S3 backend with a DynamoDB lock table (`TF_LOCK_TABLE`). If another operation attempts to modify the workspace, DynamoDB denies state acquisition."

### Q2: "What happens if a Terraform apply fails halfway through?"
**Answer:** "We built an automated **Rollback Coordinator** (`rollback-coordinator.ts`). When Terraform exits with a non-zero exit code or encounters a timeout, the runner captures the failure, automatically triggers `terraform destroy` on any partially created resources, restores the previous state, marks the service as `failed`, sanitizes the error logs, and alerts the developer."

### Q3: "How do you handle sensitive credentials like AWS secret keys and database passwords?"
**Answer:** "Three principles:
1. **STS Assumption:** The provisioning worker uses AWS STS (`AssumeRoleCommand`) to obtain short-lived 1-hour temporary credentials rather than permanent access keys.
2. **Log Sanitization:** All Terraform logs pass through a dedicated `LogSanitizer` (`log-sanitizer.ts`) using regular expressions to redact AWS access keys, GitHub tokens, Bearer tokens, and database passwords before anything is saved to PostgreSQL.
3. **No hardcoding:** All keys and secrets are loaded through environment variables."

### Q4: "How does the CI/CD integration work without manual developer setup?"
**Answer:** "When provisioning completes successfully, the `CicdIntegrator` is triggered. It uses a GitHub App with RS256 JWT authentication to create or access the service repository, renders a production `.github/workflows/deploy.yml` pipeline using Handlebars templates, commits the file to `main`, and registers an HMAC-SHA256 signed webhook so subsequent code pushes report deployment status directly back to our portal."

---

## 9. Emergency Troubleshooting Runbook

If anything unexpected occurs before or during your presentation, use these quick recovery commands:

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **API returns 500 or DB connection refused** | Docker containers stopped | Run `docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d` |
| **Port 3000 or 5173 already in use** | Lingering background process | Run `lsof -ti :3000 -ti :5173 \| xargs kill -9` |
| **Empty service catalog or no users** | Database not seeded | Run `cd server && npm run db:migrate && npm run db:seed` |
| **Login fails with invalid credentials** | Password mismatch | Use `admin@scape.dev` with password `Password123!` |
| **Client build or lint errors** | Cache issue | Run `cd client && rm -rf node_modules/.vite && npm run build` |
