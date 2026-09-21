# IAM Module
# Provisions the foundational IAM roles for SCAPE platform

# 1. Provisioning Role
# Assumed by the backend worker to run Terraform
resource "aws_iam_role" "provisioning" {
  name = "ForgeProvisioningRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          # In a real setup, this would be restricted to the backend ECS task role ARN
          AWS = "arn:aws:iam::${var.aws_account_id}:root"
        }
      }
    ]
  })
}

# Attach AdministratorAccess for provisioning (Note: in strict prod this would be bounded)
resource "aws_iam_role_policy_attachment" "provisioning_admin" {
  role       = aws_iam_role.provisioning.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# 2. Cost Explorer Read Role
# Assumed by backend scheduled job to sync costs
resource "aws_iam_role" "cost_explorer" {
  name = "CostExplorerReadRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.aws_account_id}:root"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "cost_explorer" {
  name = "CostExplorerReadAccess"
  role = aws_iam_role.cost_explorer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ce:GetCostAndUsage",
          "ce:GetDimensionValues",
          "ce:GetTags"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# 3. GitHub Actions OIDC Provider & Deploy Role
# Allows GitHub Actions to deploy to AWS without stored credentials

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"] # Current GitHub thumbprints
}

resource "aws_iam_role" "deploy" {
  name = "ForgeDeployRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo_owner}/${var.github_repo_name}:*"
          }
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

# ECR Push/Pull and ECS Deploy policy
resource "aws_iam_role_policy" "deploy" {
  name = "DeployAccess"
  role = aws_iam_role.deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetRepositoryPolicy",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:RegisterTaskDefinition",
          "iam:PassRole",
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject",
          "cloudfront:CreateInvalidation"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}
