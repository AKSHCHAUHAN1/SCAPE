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

variable "compute_mode" {
  description = "Underlying task compute platform"
  type        = string
  default     = "fargate"

  validation {
    condition     = contains(["fargate", "ec2"], var.compute_mode)
    error_message = "compute_mode must be fargate or ec2."
  }
}

variable "ec2_instance_type" {
  description = "EC2 instance type used by the ECS service when compute_mode is ec2"
  type        = string
  default     = "t3.small"

  validation {
    condition     = can(regex("^[a-z][a-z0-9]*\\.[a-z0-9-]+$", var.ec2_instance_type))
    error_message = "ec2_instance_type must look like a valid AWS instance type, for example t3.small."
  }
}

variable "requested_vcpu" {
  description = "Requested task CPU in vCPU units"
  type        = number
  default     = 1

  validation {
    condition     = var.requested_vcpu >= 0.25 && var.requested_vcpu <= 192
    error_message = "requested_vcpu must be between 0.25 and 192."
  }
}

variable "requested_memory_gib" {
  description = "Requested task memory in GiB"
  type        = number
  default     = 2

  validation {
    condition     = var.requested_memory_gib >= 0.5 && var.requested_memory_gib <= 1536
    error_message = "requested_memory_gib must be between 0.5 and 1536."
  }
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
