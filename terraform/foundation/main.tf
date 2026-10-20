data "aws_caller_identity" "current" {}

module "iam" {
  source = "../modules/iam"

  aws_account_id       = data.aws_caller_identity.current.account_id
  backend_role_arn     = var.backend_role_arn
  state_bucket_arn     = "arn:aws:s3:::${var.state_bucket_name}"
  state_lock_table_arn = "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.state_lock_table_name}"
}

output "provisioning_role_arn" {
  value = module.iam.provisioning_role_arn
}

output "cost_explorer_role_arn" {
  value = module.iam.cost_explorer_role_arn
}

output "github_oidc_provider_arn" {
  value = module.iam.github_oidc_provider_arn
}
