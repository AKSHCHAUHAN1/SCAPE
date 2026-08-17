# deployments module

## Structure

Each module follows a consistent pattern:

- `deployments.routes.ts` — Express router with all endpoint definitions
- `deployments.controller.ts` — Request handlers (parse input, call service, send response)
- `deployments.service.ts` — Business logic (DB queries, validations, orchestration)
- `deployments.schema.ts` — Zod schemas for request validation

### Module-specific files
(standard pattern only)
