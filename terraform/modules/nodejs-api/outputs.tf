output "service_endpoint" {
  description = "URL of the deployed service (ALB DNS)"
  value       = "http://${aws_lb.main.dns_name}"
}

output "resource_arns" {
  description = "List of ARNs for all provisioned resources"
  value       = [
    aws_ecs_cluster.main.arn,
    aws_ecr_repository.app.arn,
    aws_lb.main.arn,
    aws_db_instance.postgres.arn
  ]
}

output "repository_url" {
  description = "ECR repository URL for the service"
  value       = aws_ecr_repository.app.repository_url
}
