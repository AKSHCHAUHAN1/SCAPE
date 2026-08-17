output "service_endpoint" {
  description = "CloudFront distribution URL"
  value       = "" # Will be populated when module is implemented
}

output "resource_arns" {
  description = "List of ARNs for all provisioned resources"
  value       = [] # Will be populated when module is implemented
}

output "s3_bucket_name" {
  description = "S3 bucket name for static assets"
  value       = "" # Will be populated when module is implemented
}
