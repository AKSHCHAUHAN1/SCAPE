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
  type    = string
  default = "ap-south-1"
}

variable "backend_role_arn" {
  description = "Exact IAM role ARN used by the SCAPE backend runtime"
  type        = string
}

variable "state_bucket_name" {
  type = string
}

variable "state_lock_table_name" {
  type    = string
  default = "scape-tf-locks"
}
