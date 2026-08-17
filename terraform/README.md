# SCAPE — Terraform Modules

This directory contains the Terraform infrastructure-as-code for SCAPE.

## Structure

```
terraform/
├── modules/
│   ├── nodejs-api/        # Node.js API template (VPC, ECS, RDS, ALB)
│   └── static-frontend/   # Static frontend template (S3, CloudFront)
├── environments/          # Per-service generated configs (gitignored)
├── backend.tf             # S3 + DynamoDB remote state config
└── providers.tf           # AWS provider configuration
```

## Module Contract

Every template module accepts these variables:
- `service_name` — Name of the service
- `region` — AWS region
- `environment` — Environment (dev/staging/prod)
- `owner_team` — Team ID
- `tags` — Map of resource tags

Every template module outputs:
- `service_endpoint` — URL of the deployed service
- `resource_arns` — List of created resource ARNs
- `repository_url` — ECR repository URL (if applicable)

## Tagging

All resources are tagged with:
- `scape:service-id`
- `scape:team-id`
- `scape:template-id`
- `Environment`
- `ManagedBy = scape`
