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
./scripts/setup.sh
```

This installs dependencies, starts PostgreSQL and Redis, and launches the
backend and frontend development servers.

### 4. Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health**: http://localhost:3000/health

### Stop and clean up

To stop the development servers and remove the PostgreSQL and Redis containers
and their local data volumes:

```bash
./scripts/cleanup.sh
```

This preserves source code, environment files, and installed dependencies.

## Development Workflow

We follow **GitHub Flow**:

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Make changes, commit with conventional commits
3. Push and open a Pull Request
4. Get at least 1 approval from a teammate
5. Merge to `main` → auto-deploys to staging

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines.

## Sprint Roadmap & Status

| Sprint | Weeks | Focus | Status |
| :--- | :--- | :--- | :---: |
| **Sprint 1–2** | 01–04 | Requirement Analysis & Relational Database Schemas | ✅ Done |
| **Sprint 3–4** | 05–08 | Backend APIs & Terraform Provisioning Engine | ✅ Done |
| **Sprint 5–6** | 09–12 | Web Portal & Service Request UI | ✅ Done |
| **Sprint 7–8** | 13–16 | CI/CD Automation & GitHub App Repo Integration | ✅ Done |
| **Sprint 9–10** | 17–20 | Dashboard: Health Monitoring, Cost & Deployment Feed | ✅ Done |
| **Sprint 11–12** | 21–24 | Testing (Unit, Integration, E2E), Bug Fixing & Production Deploy (K8s/Docker) | ✅ Done |

## Running Tests

### Client Tests (Unit & Component)
```bash
cd client
npm test        # Run Vitest test suite
npm run lint    # Run ESLint
npm run build   # Production bundle verification
```

### Server Tests (Unit & Integration)
```bash
cd server
npm test               # Run all 96 unit and integration tests
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
