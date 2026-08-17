variable "service_name" {
  description = "Name of the service being provisioned"
  type        = string
}

variable "service_id" {
  description = "UUID of the service (used for tagging and state isolation)"
  type        = string
}

variable "region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "staging"
}

variable "owner_team" {
  description = "Team ID that owns this service"
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
