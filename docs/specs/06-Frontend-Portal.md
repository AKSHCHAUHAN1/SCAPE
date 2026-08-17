# 06-Frontend-Portal

## Role
You are a Principal Software Architect and Staff Engineer.

## Goal
Generate a production-ready, enterprise-grade implementation specification for the **Forge Frontend Portal** — a React-based self-service web portal where developers provision cloud services, monitor deployment status, and view per-service infrastructure costs.

## Document Requirements
- Executive Summary
- Design Goals (developer self-service, minimal cognitive load, real-time feedback during provisioning)
- Functional Requirements (page-by-page: Login, Service Catalog, Create Service, Service Detail, Cost Dashboard, Admin / Audit Log)
- Non-Functional Requirements (< 2s initial load, WCAG 2.1 AA accessibility, mobile-responsive, no full-page reloads)
- Architecture (React 18 SPA, React Router v6, Zustand or Redux Toolkit for state, React Query for server state, Axios for HTTP)
- Page & Route Map:
  - `/login` — email/password login, JWT stored in memory (access) + HttpOnly cookie (refresh)
  - `/services` — service catalog listing all services for the user's team, status badges, cost summary
  - `/services/new` — multi-step service creation form: (1) select template, (2) configure name/region, (3) confirm & submit → shows real-time provisioning status
  - `/services/:id` — service detail: health status, deployment history timeline, provisioning job log stream
  - `/services/:id/costs` — cost breakdown chart (monthly, per resource type)
  - `/admin/audit` — audit log table (admin role only)
  - `/profile` — user profile and team membership
- Component hierarchy (shared: Navbar, Sidebar, StatusBadge, ProvisioningProgress, CostChart, DataTable, EmptyState, ErrorBoundary)
- State management design: auth slice (access token, user profile), services slice (list, selected service), provisioning slice (active job, polling state)
- Data Flow (API polling for provisioning status every 5 seconds via React Query, WebSocket upgrade path noted as future scope)
- Folder Structure (src/pages, src/components, src/hooks, src/store, src/api, src/types, src/utils)
- Interfaces (TypeScript types for all API response shapes: Service, Template, ProvisioningJob, Deployment, CostRecord, AuditLog)
- Error Handling (global Axios interceptor for 401 → token refresh, per-page error boundaries, toast notifications for async errors)
- Security (no access token in localStorage, CSRF protection via SameSite cookie, Content-Security-Policy headers, no secrets in environment variables shipped to browser)
- Performance (code splitting per route, lazy-loaded heavy components like charts, debounced polling back-off on tab hidden)
- Accessibility (keyboard navigation, ARIA labels on status badges and progress indicators, colour-blind safe status palette)
- Testing Strategy (Jest + React Testing Library for unit/integration, Playwright for E2E critical flows: login → create service → check status)
- Mermaid diagrams where appropriate (component tree, auth token lifecycle, provisioning polling state machine)
- Architecture Decision Records (ADRs): ADR-013 React Query over SWR for full cache control; ADR-014 Zustand over Redux for simpler auth/UI state; ADR-015 Polling over WebSocket for v1
- Anti-patterns (no prop-drilling beyond 2 levels, no direct localStorage token storage, no inline fetch calls outside hooks)
- Acceptance Criteria

## Quality Requirements
- Self-contained
- Extremely detailed
- Implementation-ready
- AI-agent friendly
- No placeholders
- No TODOs
- Cross-reference 05-Backend-API, 03-System-Architecture, 10-Security-and-IAM
- Prefer explicit engineering decisions over ambiguity

## Output
Produce a complete specification, not an outline.
