# audit module

## Structure

Each module follows a consistent pattern:

- `audit.routes.ts` — Express router with all endpoint definitions
- `audit.controller.ts` — Request handlers (parse input, call service, send response)
- `audit.service.ts` — Business logic (DB queries, validations, orchestration)
- `audit.schema.ts` — Zod schemas for request validation

### Module-specific files
(standard pattern only)
