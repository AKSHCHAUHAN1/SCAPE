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

variable "github_repository" {
  description = "Owner/repository slug used to restrict the deployment role's GitHub OIDC trust"
  type        = string
}

variable "github_owner_id" {
  description = "Immutable numeric GitHub owner ID used in the deployment role OIDC subject"
  type        = number
  default     = null
}

variable "github_repository_id" {
  description = "Immutable numeric GitHub repository ID used in the deployment role OIDC subject"
  type        = number
  default     = null
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
