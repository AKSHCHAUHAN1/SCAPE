# cicd module

## Structure

Each module follows a consistent pattern:

- `cicd.routes.ts` — Express router with all endpoint definitions
- `cicd.controller.ts` — Request handlers (parse input, call service, send response)
- `cicd.service.ts` — Business logic (DB queries, validations, orchestration)
- `cicd.schema.ts` — Zod schemas for request validation

### Module-specific files
- `github-client.ts` — Octokit wrapper for GitHub App auth
- `workflow-renderer.ts` — Handlebars template renderer for CI/CD workflows
- `webhook.controller.ts` — GitHub webhook event handler
- `webhook.routes.ts` — Webhook route (POST /webhooks/github)
