output "service_endpoint" {
  description = "CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}

output "resource_arns" {
  description = "List of ARNs for all provisioned resources"
  value       = [
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
