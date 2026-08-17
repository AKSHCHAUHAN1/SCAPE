output "service_endpoint" {
  description = "URL of the deployed service (ALB DNS)"
  value       = "" # Will be populated when module is implemented
}

output "resource_arns" {
  description = "List of ARNs for all provisioned resources"
  value       = [] # Will be populated when module is implemented
}

output "repository_url" {
  description = "ECR repository URL for the service"
  value       = "" # Will be populated when module is implemented
}
