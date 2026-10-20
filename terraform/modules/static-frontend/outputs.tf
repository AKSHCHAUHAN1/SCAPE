output "service_endpoint" {
  description = "CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}

output "resource_arns" {
  description = "List of ARNs for all provisioned resources"
  value = [
    aws_s3_bucket.website.arn,
    aws_cloudfront_distribution.cdn.arn
  ]
}

output "s3_bucket_name" {
  description = "S3 bucket name for static assets"
  value       = aws_s3_bucket.website.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront Distribution ID (needed for invalidation)"
  value       = aws_cloudfront_distribution.cdn.id
}

output "deploy_role_arn" {
  description = "GitHub Actions OIDC role scoped to this service's repository"
  value       = aws_iam_role.github_deploy.arn
}

output "repository_url" {
  description = "No container repository is used by this template"
  value       = null
}

output "ecr_repository_url" {
  description = "No container repository is used by this template"
  value       = null
}

output "ecs_cluster_name" {
  description = "No ECS cluster is used by this template"
  value       = null
}

output "ecs_service_name" {
  description = "No ECS service is used by this template"
  value       = null
}

output "ecs_task_definition_family" {
  description = "No ECS task definition is used by this template"
  value       = null
}
