# auth module

## Structure

Each module follows a consistent pattern:

- `auth.routes.ts` — Express router with all endpoint definitions
- `auth.controller.ts` — Request handlers (parse input, call service, send response)
- `auth.service.ts` — Business logic (DB queries, validations, orchestration)
- `auth.schema.ts` — Zod schemas for request validation

### Module-specific files
(standard pattern only)
