output "provisioning_role_arn" {
  description = "ARN of the IAM role to be assumed by SCAPE backend for provisioning"
  value       = aws_iam_role.provisioning.arn
}

output "github_oidc_provider_arn" {
  description = "GitHub Actions OIDC provider used by repository-scoped service deploy roles"
  value       = aws_iam_openid_connect_provider.github.arn
}

output "cost_explorer_role_arn" {
  description = "ARN of the IAM role to be assumed for reading Cost Explorer"
  value       = aws_iam_role.cost_explorer.arn
}
