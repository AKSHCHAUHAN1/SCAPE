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
├── docs/            # Specifications, ADRs, API docs
├── scripts/         # Dev helper scripts
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

### 2. Set Up Environment

```bash
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env
```

### 3. Start Local Development

```bash
# Start PostgreSQL + Redis via Docker
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d

# Start the backend
cd server && npm install && npm run dev

# Start the frontend (in another terminal)
cd client && npm install && npm run dev
```

### 4. Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health**: http://localhost:3000/health

## Development Workflow

We follow **GitHub Flow**:

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Make changes, commit with conventional commits
3. Push and open a Pull Request
4. Get at least 1 approval from a teammate
5. Merge to `main` → auto-deploys to staging

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines.

## Sprint Plan

| Sprint   | Weeks  | Focus                                     |
| -------- | ------ | ----------------------------------------- |
| Sprint 1–2 | 1–4  | Foundation: Auth, DB, Docker, CI pipeline |
| Sprint 3–4 | 5–8  | Core: Provisioning engine, Terraform, IAM |
| Sprint 5–6 | 9–12 | Portal: React UI, CI/CD integrator, Cost  |

## Team

| Role                       | Member |
| -------------------------- | ------ |
| Frontend Developer         | TBD    |
| Backend Developer          | TBD    |
| DevOps / Cloud Engineer    | TBD    |
| Database / Integration Eng | TBD    |

## License

This project is licensed under the [MIT License](./LICENSE).
