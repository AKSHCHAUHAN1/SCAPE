terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      ManagedBy = "scape"
      Project   = "scape"
    }
  }
}

variable "aws_region" {
  description = "AWS region for resource provisioning"
  type        = string
  default     = "ap-south-1"
}
