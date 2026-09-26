# Node.js API Module — Outputs
# All outputs follow the contract defined in spec 07:
# service_endpoint, resource_arns, repository_url
# Plus additional outputs for CI/CD integration (spec 08)

output "service_endpoint" {
  description = "URL of the deployed service (ALB DNS)"
  value       = "http://${aws_lb.main.dns_name}"
}

output "resource_arns" {
  description = "List of ARNs for all provisioned resources"
  value = [
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

# Additional outputs for CI/CD integration (spec 08)

output "ecr_repository_url" {
  description = "ECR repository URL (alias for CI/CD template)"
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = "${var.service_name}-service"
}

output "ecs_task_definition_family" {
  description = "Family name of the ECS task definition"
  value       = aws_ecs_task_definition.app.family
}

output "vpc_id" {
  description = "VPC ID of the provisioned network"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.ecs.name
}
