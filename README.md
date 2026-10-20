# SCAPE — Self-Service Cloud Provisioning Platform

> An Internal Developer Platform that empowers developers to self-service provision AWS cloud infrastructure, with automated Terraform provisioning, GitHub Actions CI/CD generation, cost dashboards, RBAC, and audit logging.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React SPA (Client)                       │
│   Login · Service Catalog · Create Service · Cost Dashboard     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API (JWT Auth)
┌──────────────────────────▼──────────────────────────────────────┐
│                     Node.js API Server                          │
│   Auth · Services · Templates · Provisioning · Cost · Audit     │
├──────────────┬───────────────────┬──────────────────────────────┤
│  PostgreSQL  │  Redis (BullMQ)   │  AWS (STS, Cost Explorer)   │
└──────────────┴───────────────────┴──────────────────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │    Terraform Provisioning Engine  │
          │    (Async Workers · S3 State)     │
          └────────────────┬────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │         AWS Infrastructure       │
          │   ECS · RDS · S3 · CloudFront    │
          └─────────────────────────────────┘
```

## Tech Stack

| Layer            | Technology                                      |
| ---------------- | ----------------------------------------------- |
| Frontend         | React 18, TypeScript, Vite, React Router v6     |
| State Management | Zustand (client state), React Query (server)    |
| Backend          | Node.js, Express, TypeScript                    |
| Database         | PostgreSQL 15+                                  |
| Job Queue        | BullMQ + Redis                                  |
| Provisioning     | Terraform CLI (async worker)                    |
| CI/CD Generation | GitHub App + Octokit                            |
| Cloud            | AWS (ECS, RDS, S3, CloudFront, IAM/STS)         |
| Local Dev        | Docker Compose                                  |
| CI/CD (SCAPE)    | GitHub Actions                                  |

## Repo Structure

```
SCAPE/
├── client/          # React frontend (Vite + TypeScript)
├── server/          # Node.js REST API (Express + TypeScript)
├── terraform/       # Terraform modules & environment configs
├── infra/           # Docker Compose, Dockerfiles, K8s manifests
└── .github/         # CI/CD workflows, PR & issue templates
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Clone & Install

```bash
git clone https://github.com/AKSHCHAUHAN1/SCAPE.git
cd SCAPE
```

### 2. Start local dependencies

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 3. Install and start the API

```bash
cd server
cp .env.example .env
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Run these commands from a second terminal to start the portal:

```bash
cd client
cp .env.example .env
npm ci
npm run dev
```

### 4. Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health**: http://localhost:3000/health

### Stop local dependencies

Stop the API and portal with `Ctrl+C`, then stop PostgreSQL and Redis:

```bash
docker compose -f infra/docker-compose.yml down
```

The named database volumes are preserved. Add `-v` only when you want to remove local database data.

### Cloud integrations

Creating a cloud service requires a configured GitHub App, GitHub template repositories, an AWS backend role, an encrypted remote Terraform state bucket and lock table, and a public webhook URL. Bootstrap the state bucket, lock table, IAM roles, and GitHub OIDC provider using [the Terraform setup guide](./terraform/README.md). Configure the returned role ARNs as `AWS_PROVISIONING_ROLE_ARN` and `AWS_COST_EXPLORER_ROLE_ARN` in `server/.env`, and provide the GitHub App settings there. Deployment workflows use a per-service OIDC role created by Terraform. The application does not fabricate successful provisioning or cost data when these integrations are unavailable.

## Development Workflow

We follow **GitHub Flow**:

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Make changes, commit with conventional commits
3. Push and open a Pull Request
4. Get at least 1 approval from a teammate
5. Merge to `main` → auto-deploys to staging

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines.

## Delivery roadmap

The project specification defines a 12-week plan with six two-week sprints: foundation, core provisioning, then portal and integrations. The repository contains the application modules and infrastructure configuration; running the end-to-end cloud workflow still depends on the external AWS and GitHub setup described above.

## Running Tests

### Client Tests (Unit & Component)
```bash
cd client
npm test        # Run Vitest suite
npm run lint    # Run ESLint
npm run build   # Type-check and build the production bundle
```

### Server Tests (Unit & Integration)
```bash
cd server
npm test               # Run unit and integration suites
npm run test:integration # Run API integration tests
npm run lint           # Run ESLint
npm run build          # Build TypeScript and copy migration/template assets
```

## Team

| Role | Member |
| :--- | :--- |
| **Project Lead & Systems Architect** | Aksh Chauhan |
| **Database & Integration Engineer** | Prince Singhalia |
| **Frontend Developer** | Mohd. Anas |
| **DevOps & Cloud Engineer** | Vijay Kumar Mishra |

## License

This project is licensed under the [MIT License](./LICENSE).
