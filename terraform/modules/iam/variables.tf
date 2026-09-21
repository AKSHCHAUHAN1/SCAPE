variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
}

variable "github_repo_owner" {
  description = "GitHub repository owner for OIDC"
  type        = string
}

variable "github_repo_name" {
  description = "GitHub repository name for OIDC"
  type        = string
}
