variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
}

variable "backend_role_arn" {
  description = "IAM user or role ARN used by the local SCAPE backend runtime"
  type        = string
}

variable "state_bucket_arn" {
  description = "ARN of the encrypted Terraform state bucket"
  type        = string
}

variable "state_lock_table_arn" {
  description = "ARN of the Terraform state lock DynamoDB table"
  type        = string
}
