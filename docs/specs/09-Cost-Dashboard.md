# 09-Cost-Dashboard

## Role
You are a Principal Software Architect and Staff Engineer.

## Goal
Generate a production-ready, enterprise-grade implementation specification for the **Forge Cost Dashboard module** — the subsystem that integrates with the AWS Cost Explorer API to collect, aggregate, and display per-service cloud infrastructure costs within the Forge portal.

## Document Requirements
- Executive Summary
- Design Goals (accurate per-service cost attribution, scheduled data freshness without hitting API rate limits, intuitive visualisations for developers unfamiliar with billing)
- Functional Requirements:
  - Poll AWS Cost Explorer API daily (scheduled cron job) to retrieve costs for the preceding day
  - Attribute costs to individual services using AWS resource tags (`forge:service-id`, `forge:team-id`) — all Terraform-provisioned resources must be tagged at creation
  - Aggregate costs by service, by resource type (EC2, RDS, ECS, S3, CloudFront, Data Transfer), and by calendar month
  - Store aggregated results in the `cost_records` table (see 04-Database-Design)
  - Expose cost data via GET /services/:id/costs and GET /services/:id/costs?period=YYYY-MM (see 05-Backend-API)
  - Frontend Cost Dashboard page renders: monthly cost trend line chart, current month breakdown by resource type (donut/bar chart), total cost to date, comparison to previous month (delta + percentage)
  - Admin view: aggregate cost across all services, sortable leaderboard
- Non-Functional Requirements (Cost Explorer API has 10 req/s limit — implement token bucket; cost data freshness: updated once per day by 06:00 UTC; chart render < 1s; no raw AWS account IDs or billing credentials exposed to frontend)
- Architecture:
  - Cost Sync Worker: scheduled cron (daily at 04:00 UTC, implemented with `node-cron` or Kubernetes CronJob), calls AWS Cost Explorer `GetCostAndUsage` with `GROUP BY RESOURCE_TAG` filter on `forge:service-id`
  - Cost Aggregator: processes raw Cost Explorer response, groups by service_id and resource type, upserts into cost_records (idempotent on service_id + period_start + period_end)
  - Cost API: read-only REST layer returning pre-aggregated records from PostgreSQL — no live Cost Explorer calls on request path
  - Tagging Enforcement: Terraform modules must apply tags `forge:service-id`, `forge:team-id`, `forge:template-id`, `Environment`, `ManagedBy=forge` to all provisioned resources
- Data Flow: cron triggers → assume CostExplorerReadRole via STS → call GetCostAndUsage (DateInterval: yesterday, Granularity: DAILY, GroupBy: TAG[forge:service-id], TAG[service]) → parse response → for each service_id group: upsert cost_record → update synced_at
- Component Responsibilities (CostSyncScheduler, CostExplorerClient, CostAggregator, CostRepository, CostAPI controller)
- Folder Structure (`src/cost/` — scheduler, explorer-client, aggregator, repository, controller)
- Interfaces (CostExplorerResponse, CostRecord, CostSummary, CostBreakdown)
- Error Handling (Cost Explorer 429 → exponential backoff up to 5 retries, missing tag on resource → cost attributed to "untagged" bucket and alerted, DB upsert conflict → last-write-wins by synced_at)
- Security (CostExplorerReadRole with policy `ce:GetCostAndUsage` only, assumed via STS, credentials never exposed beyond worker process, cost_records readable only by service owner or admin, no raw AWS cost response cached in API)
- Performance (Cost Explorer batch size: 30-day window max per call, pagination handled; PostgreSQL cost query uses composite index on (service_id, period_start); frontend chart data fetched once and cached in React Query for 1 hour)
- Accessibility (colour-blind safe chart palette, data table alternative for all charts, ARIA labels on chart elements)
- Testing Strategy (unit tests for aggregator with mock Cost Explorer JSON fixtures, integration test with mocked AWS SDK, React Testing Library tests for chart rendering with static data, snapshot tests for cost summary component)
- Mermaid diagrams where appropriate (cost sync data flow, tagging strategy diagram, cost attribution model)
- Architecture Decision Records (ADRs): ADR-022 Pre-aggregated DB over live Cost Explorer on request path for latency and rate-limit safety; ADR-023 Tag-based attribution over resource group tagging API for simplicity; ADR-024 Daily sync cadence over real-time for Cost Explorer API cost control
- Anti-patterns (no calling Cost Explorer API on every dashboard load, no storing raw AWS billing JSON in cost_records, no omitting tags from Terraform modules, no single shared AWS root credential for cost reads)
- Acceptance Criteria

## Quality Requirements
- Self-contained
- Extremely detailed
- Implementation-ready
- AI-agent friendly
- No placeholders
- No TODOs
- Cross-reference 04-Database-Design, 05-Backend-API, 07-Terraform-Provisioning-Engine, 10-Security-and-IAM, 06-Frontend-Portal
- Prefer explicit engineering decisions over ambiguity

## Output
Produce a complete specification, not an outline.
