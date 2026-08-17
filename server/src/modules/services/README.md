# services module

## Structure

Each module follows a consistent pattern:

- `services.routes.ts` — Express router with all endpoint definitions
- `services.controller.ts` — Request handlers (parse input, call service, send response)
- `services.service.ts` — Business logic (DB queries, validations, orchestration)
- `services.schema.ts` — Zod schemas for request validation

### Module-specific files
(standard pattern only)
