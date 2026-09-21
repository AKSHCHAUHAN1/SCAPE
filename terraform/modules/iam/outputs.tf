output "provisioning_role_arn" {
  description = "ARN of the IAM role to be assumed by SCAPE backend for provisioning"
  value       = aws_iam_role.provisioning.arn
}

output "deploy_role_arn" {
  description = "ARN of the IAM role to be assumed by GitHub Actions for deployment"
  value       = aws_iam_role.deploy.arn
}

output "cost_explorer_role_arn" {
  description = "ARN of the IAM role to be assumed for reading Cost Explorer"
  value       = aws_iam_role.cost_explorer.arn
}
