# Contributing to SCAPE

Thank you for contributing to SCAPE! This document provides guidelines for the development workflow.

## Git Workflow

We use **GitHub Flow** — a simple, branch-based workflow.

### Branch Naming

```
feat/short-description     # New feature
fix/short-description      # Bug fix
refactor/short-description # Code refactoring
docs/short-description     # Documentation updates
chore/short-description    # Build, CI, dependency updates
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `style`, `perf`

**Scopes**: `client`, `server`, `terraform`, `infra`, `docs`, `ci`

**Examples**:
```
feat(server): add JWT authentication middleware
fix(client): resolve login redirect loop
chore(infra): update Docker Compose Redis version
docs: update API endpoint documentation
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with meaningful commits
3. Ensure all tests pass locally
4. Push your branch and open a PR
5. Fill in the PR template completely
6. Request review from at least **1 teammate**
7. Address review comments
8. Merge once approved (squash merge preferred)

### PR Requirements

- [ ] All CI checks passing (lint, tests, build)
- [ ] At least 1 approval from a teammate
- [ ] PR description explains **what** and **why**
- [ ] No unresolved review comments
- [ ] Branch is up-to-date with `main`

## Code Standards

### TypeScript

- Strict mode enabled (`"strict": true`)
- No `any` types without explicit justification
- Use interfaces for API contracts, types for unions/intersections
- Export types from `types/` directories

### React (Client)

- Functional components only (no class components)
- Custom hooks for shared logic (`hooks/`)
- Co-locate page-specific components with their page
- Use React Query for all server state
- Use Zustand for client-only state (auth, UI)

### Express (Server)

- Domain-driven module structure (`modules/<domain>/`)
- Each module has: `controller`, `service`, `routes`, `schema`
- Validation with Zod on all request inputs
- Structured JSON logging with correlation IDs
- Never throw raw errors — use AppError class

### Terraform

- One module per service template
- All resources tagged with `forge:service-id`, `forge:team-id`
- Variables documented with `description` and `type`
- Outputs documented and typed

## Local Development

```bash
# Start infrastructure
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d

# Backend
cd server && npm install && npm run dev

# Frontend
cd client && npm install && npm run dev
```

## Testing

```bash
# Server tests
cd server && npm test

# Client tests
cd client && npm test

# E2E tests (requires running dev environment)
cd client && npm run test:e2e
```

## Definition of Done

A story/task is "done" when:

- [ ] Code is written and self-reviewed
- [ ] Unit tests cover new logic
- [ ] All existing tests pass
- [ ] PR approved by ≥1 teammate
- [ ] Merged to `main`
- [ ] Deployed to staging and verified
- [ ] Acceptance criteria met
