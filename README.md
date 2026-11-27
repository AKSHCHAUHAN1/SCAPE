# SCAPE — Self-Service Cloud Provisioning Platform

> A self-service platform for individually owned AWS infrastructure, with automated Terraform provisioning, GitHub Actions CI/CD generation, and private per-account cost history.

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
│  PostgreSQL  │  Redis (BullMQ)   │ AWS (STS, Pricing, Cost Exp.)│
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

The capstone demo runs with Docker Compose and local Node.js processes. It does not use the optional Kubernetes manifests, and this repository does not create a Kubernetes cluster.

## Quick Start

### Prerequisites

- Node.js 24 LTS
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

The seed command installs the service-template catalog only; it does not create demo users, services, deployments, costs, or audit history. Create an account with your own email. Accounts are independent: users can only access the services, deployments, jobs, and costs they own. **Preview locally** displays the selected configuration without contacting AWS or GitHub and does not create infrastructure.

### Stop local dependencies

Stop the API and portal with `Ctrl+C`, then stop PostgreSQL and Redis:

```bash
docker compose -f infra/docker-compose.yml down
```

The named database volumes are preserved. Add `-v` only when you want to remove local database data.

### Cloud integrations

Requesting real cloud provisioning requires a configured GitHub App installed by each repository owner whose repositories should be deployed, an AWS backend role, an encrypted remote Terraform state bucket and lock table, and a public HTTPS webhook URL. A custom domain is optional for local previews. For a local API connected to GitHub, use an HTTPS tunnel and set `SCAPE_PUBLIC_URL` to its public URL. Bootstrap the state bucket, lock table, IAM roles, and GitHub OIDC provider using [the Terraform setup guide](./terraform/README.md). Configure the returned role ARNs as `AWS_PROVISIONING_ROLE_ARN` and `AWS_COST_EXPLORER_ROLE_ARN` in `server/.env`; the cost role needs `ce:GetCostAndUsage` for AWS-billed actuals. The optional price-estimate endpoint separately uses `pricing:GetProducts`; it is not required to provision services. Users enter their own repository URL, which SCAPE verifies using the GitHub App installation for that repository owner; SCAPE does not present an installation-wide repository picker. The AWS region is selected for each service in the wizard.

The catalog includes **Static Frontend**, **Node.js API**, **Python FastAPI**, and **Containerized API**. In the provisioning wizard, users enter their existing GitHub repository URL and verify that the SCAPE GitHub App installation for that repository's owner can access it; the owner must install the App and grant it repository permissions to manage deployment workflows and webhooks. SCAPE adds its deployment workflow and does not create, archive, or delete the repository or replace application code. The API templates need a Dockerfile that listens on port 3000 and serves `/health`; the Python template also needs `requirements.txt` and tests runnable with `pytest`. The containerized template can use any runtime that meets the same container contract. `AWS_REGION` in the server environment is used for the control plane and Terraform state; it does not select a service region.

For API templates, users can choose Fargate task capacity or an EC2-backed ECS host and enter CPU and memory requirements. Provisioning does not depend on a price estimate. AWS Cost Explorer actuals are synced daily and can be delayed, including after decommissioning; activate the `forge:service-id` user-defined cost-allocation tag in AWS Billing to receive per-service actuals. SCAPE stores those API results for history, including the exact AWS service-group amounts returned by Cost Explorer. The cost summary includes only tagged SCAPE service costs, not the full AWS account bill; missing actuals are shown as unreported, never as zero. Decommissioning removes AWS resources but retains the GitHub repository and SCAPE service, job, runtime, and cost history. Local previews create no cloud resources.

## Development Workflow

We follow **GitHub Flow**:

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Make changes, commit with conventional commits
3. Push and open a Pull Request
4. Get at least 1 approval from a teammate
5. Merge to `main` → CI runs build, lint, and tests

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
