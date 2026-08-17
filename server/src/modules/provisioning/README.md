# provisioning module

## Structure

Each module follows a consistent pattern:

- `provisioning.routes.ts` — Express router with all endpoint definitions
- `provisioning.controller.ts` — Request handlers (parse input, call service, send response)
- `provisioning.service.ts` — Business logic (DB queries, validations, orchestration)
- `provisioning.schema.ts` — Zod schemas for request validation

### Module-specific files
- `provisioning.worker.ts` — BullMQ worker for async Terraform jobs
- `terraform-runner.ts` — Terraform CLI execution wrapper
