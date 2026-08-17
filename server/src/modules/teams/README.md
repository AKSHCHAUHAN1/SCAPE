# teams module

## Structure

Each module follows a consistent pattern:

- `teams.routes.ts` — Express router with all endpoint definitions
- `teams.controller.ts` — Request handlers (parse input, call service, send response)
- `teams.service.ts` — Business logic (DB queries, validations, orchestration)
- `teams.schema.ts` — Zod schemas for request validation

### Module-specific files
(standard pattern only)
