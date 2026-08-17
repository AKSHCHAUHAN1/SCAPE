# cost module

## Structure

Each module follows a consistent pattern:

- `cost.routes.ts` — Express router with all endpoint definitions
- `cost.controller.ts` — Request handlers (parse input, call service, send response)
- `cost.service.ts` — Business logic (DB queries, validations, orchestration)
- `cost.schema.ts` — Zod schemas for request validation

### Module-specific files
- `cost.scheduler.ts` — Daily cron for AWS Cost Explorer sync
- `explorer-client.ts` — AWS Cost Explorer API client
