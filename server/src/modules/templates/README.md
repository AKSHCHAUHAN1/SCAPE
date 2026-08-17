# templates module

## Structure

Each module follows a consistent pattern:

- `templates.routes.ts` — Express router with all endpoint definitions
- `templates.controller.ts` — Request handlers (parse input, call service, send response)
- `templates.service.ts` — Business logic (DB queries, validations, orchestration)
- `templates.schema.ts` — Zod schemas for request validation

### Module-specific files
(standard pattern only)
