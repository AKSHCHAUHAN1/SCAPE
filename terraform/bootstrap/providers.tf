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
}

variable "aws_region" {
  description = "AWS region for the Terraform state lock table"
  type        = string
  default     = "ap-south-1"
}

variable "state_bucket_name" {
  description = "Globally unique name for the encrypted Terraform state bucket"
  type        = string
}

variable "state_lock_table_name" {
  description = "Name for the Terraform state lock table"
  type        = string
  default     = "scape-tf-locks"
}
