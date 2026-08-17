# users module

## Structure

Each module follows a consistent pattern:

- `users.routes.ts` — Express router with all endpoint definitions
- `users.controller.ts` — Request handlers (parse input, call service, send response)
- `users.service.ts` — Business logic (DB queries, validations, orchestration)
- `users.schema.ts` — Zod schemas for request validation

### Module-specific files
(standard pattern only)
