# Account-level SCAPE IAM foundation. Deploy roles are created inside each
# service module so their GitHub OIDC trust and AWS permissions are repository
# and service scoped.

resource "aws_iam_role" "provisioning" {
  name                 = "ForgeProvisioningRole"
  max_session_duration = 3600
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = ["sts:AssumeRole", "sts:TagSession"]
      Effect    = "Allow"
      Principal = { AWS = var.backend_role_arn }
      Condition = {
        StringLike                  = { "sts:ExternalId" = "scape-service-*" }
        "ForAllValues:StringEquals" = { "sts:TagKeys" = ["forge:service-id", "forge:team-id"] }
      }
    }]
  })
  tags = {
    ManagedBy = "scape"
    Purpose   = "per-service-infrastructure-provisioning"
  }
}

resource "aws_iam_role_policy" "provisioning" {
  name = "ForgeProvisioningScopedAccess"
  role = aws_iam_role.provisioning.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "ReadTerraformState"
        Effect    = "Allow"
        Action    = ["s3:ListBucket"]
        Resource  = var.state_bucket_arn
        Condition = { StringLike = { "s3:prefix" = ["services/*"] } }
      },
      {
        Sid      = "ManageOwnTerraformState"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${var.state_bucket_arn}/services/*"
      },
      {
        Sid      = "LockTerraformState"
        Effect   = "Allow"
        Action   = ["dynamodb:DescribeTable", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:UpdateItem"]
        Resource = var.state_lock_table_arn
      },
      {
        Sid    = "DescribeProvisioningResources"
        Effect = "Allow"
        Action = [
          "ec2:DescribeAvailabilityZones", "ec2:DescribeInternetGateways", "ec2:DescribeRouteTables",
          "ec2:DescribeSecurityGroups", "ec2:DescribeSubnets", "ec2:DescribeTags", "ec2:DescribeVpcs",
          "elasticloadbalancing:DescribeListeners", "elasticloadbalancing:DescribeLoadBalancers",
          "elasticloadbalancing:DescribeTargetGroups", "ecs:DescribeClusters", "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition", "ecs:ListTagsForResource", "ecr:DescribeRepositories",
          "logs:DescribeLogGroups", "logs:ListTagsForResource", "rds:DescribeDBInstances",
          "rds:DescribeDBSubnetGroups", "iam:GetRole", "iam:GetRolePolicy", "iam:GetOpenIDConnectProvider",
          "iam:ListAttachedRolePolicies", "iam:ListRolePolicies", "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      },
      {
        Sid    = "CreateTaggedServiceResources"
        Effect = "Allow"
        Action = [
          "ec2:CreateVpc", "ec2:CreateSubnet", "ec2:CreateInternetGateway", "ec2:CreateRouteTable",
          "ec2:CreateSecurityGroup", "ec2:CreateTags", "elasticloadbalancing:CreateLoadBalancer",
          "elasticloadbalancing:CreateTargetGroup", "elasticloadbalancing:CreateListener",
          "elasticloadbalancing:AddTags", "ecs:CreateCluster", "ecs:RegisterTaskDefinition",
          "ecs:CreateService", "ecs:TagResource", "ecr:CreateRepository", "ecr:TagResource",
          "logs:CreateLogGroup", "logs:TagResource",
          "cloudfront:TagResource",
          "rds:CreateDBInstance", "rds:CreateDBSubnetGroup", "rds:AddTagsToResource"
        ]
        Resource = "*"
        Condition = {
          StringEquals = { "aws:RequestTag/forge:service-id" = "$${aws:PrincipalTag/forge:service-id}" }
        }
      },
      {
        Sid      = "CreateServiceWebsiteBucket"
        Effect   = "Allow"
        Action   = ["s3:CreateBucket"]
        Resource = "arn:aws:s3:::scape-frontend-$${aws:PrincipalTag/forge:service-id}"
      },
      {
        Sid    = "ManageServiceWebsiteBucket"
        Effect = "Allow"
        Action = [
          "s3:DeleteBucket", "s3:DeleteBucketTagging", "s3:GetBucketPolicy", "s3:PutBucketPolicy",
          "s3:DeleteBucketPolicy", "s3:PutBucketPublicAccessBlock", "s3:PutBucketOwnershipControls",
          "s3:PutEncryptionConfiguration", "s3:PutBucketVersioning", "s3:PutBucketTagging",
          "s3:ListBucket", "s3:ListBucketVersions"
        ]
        Resource = "arn:aws:s3:::scape-frontend-$${aws:PrincipalTag/forge:service-id}"
      },
      {
        Sid      = "DeleteServiceWebsiteObjects"
        Effect   = "Allow"
        Action   = ["s3:DeleteObject", "s3:DeleteObjectVersion"]
        Resource = "arn:aws:s3:::scape-frontend-$${aws:PrincipalTag/forge:service-id}/*"
      },
      {
        Sid      = "CreateServiceCloudFrontDistribution"
        Effect   = "Allow"
        Action   = ["cloudfront:CreateDistribution"]
        Resource = "*"
      },
      {
        Sid    = "ConfigureTaggedServiceResources"
        Effect = "Allow"
        Action = [
          "ec2:AuthorizeSecurityGroupIngress", "ec2:AuthorizeSecurityGroupEgress",
          "logs:PutRetentionPolicy", "s3:PutBucketPublicAccessBlock",
          "s3:PutBucketOwnershipControls", "s3:PutEncryptionConfiguration",
          "s3:PutBucketVersioning", "s3:PutBucketPolicy", "s3:GetBucketPolicy",
          "s3:DeleteBucketPolicy", "cloudfront:GetDistribution",
          "cloudfront:GetDistributionConfig", "cloudfront:UpdateDistribution",
          "cloudfront:ListTagsForResource"
        ]
        Resource = "*"
        Condition = {
          StringEquals = { "aws:ResourceTag/forge:service-id" = "$${aws:PrincipalTag/forge:service-id}" }
        }
      },
      {
        Sid    = "UpdateOrDeleteTaggedServiceResources"
        Effect = "Allow"
        Action = [
          "ec2:DeleteVpc", "ec2:DeleteSubnet", "ec2:DeleteInternetGateway", "ec2:DetachInternetGateway",
          "ec2:DeleteRouteTable", "ec2:DeleteSecurityGroup", "ec2:ModifyVpcAttribute", "ec2:RevokeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupEgress", "ec2:DeleteTags", "elasticloadbalancing:DeleteLoadBalancer",
          "elasticloadbalancing:DeleteTargetGroup", "elasticloadbalancing:DeleteListener",
          "elasticloadbalancing:RemoveTags", "ecs:DeleteCluster", "ecs:UpdateService", "ecs:DeleteService",
          "ecs:DeregisterTaskDefinition", "ecs:UntagResource", "ecr:DeleteRepository", "ecr:UntagResource",
          "ecr:ListImages", "ecr:BatchDeleteImage", "s3:DeleteBucketTagging",
          "cloudfront:DeleteDistribution", "cloudfront:UntagResource",
          "logs:DeleteLogGroup", "logs:UntagResource", "rds:DeleteDBInstance", "rds:DeleteDBSubnetGroup",
          "rds:RemoveTagsFromResource"
        ]
        Resource = "*"
        Condition = {
          StringEquals = { "aws:ResourceTag/forge:service-id" = "$${aws:PrincipalTag/forge:service-id}" }
        }
      },
      {
        Sid      = "AssociateNetworkResources"
        Effect   = "Allow"
        Action   = ["ec2:AttachInternetGateway", "ec2:CreateRoute", "ec2:AssociateRouteTable", "ec2:DisassociateRouteTable", "ec2:DeleteRoute"]
        Resource = "*"
      },
      {
        Sid      = "CreateRepositoryDeploymentRoles"
        Effect   = "Allow"
        Action   = ["iam:CreateRole", "iam:TagRole"]
        Resource = "arn:aws:iam::${var.aws_account_id}:role/scape/services/*"
        Condition = {
          StringEquals = { "aws:RequestTag/forge:service-id" = "$${aws:PrincipalTag/forge:service-id}" }
        }
      },
      {
        Sid      = "DeleteRepositoryDeploymentRoles"
        Effect   = "Allow"
        Action   = ["iam:DeleteRolePolicy", "iam:DeleteRole", "iam:UntagRole"]
        Resource = "arn:aws:iam::${var.aws_account_id}:role/scape/services/*"
        Condition = {
          StringEquals = { "aws:ResourceTag/forge:service-id" = "$${aws:PrincipalTag/forge:service-id}" }
        }
      },
      {
        Sid      = "ManageServiceIamPolicyAttachments"
        Effect   = "Allow"
        Action   = ["iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:ListAttachedRolePolicies", "iam:PutRolePolicy"]
        Resource = "arn:aws:iam::${var.aws_account_id}:role/scape/services/*"
        Condition = {
          StringEquals = { "aws:ResourceTag/forge:service-id" = "$${aws:PrincipalTag/forge:service-id}" }
        }
      },
      {
        Sid       = "PassServiceTaskRoles"
        Effect    = "Allow"
        Action    = ["iam:PassRole"]
        Resource  = "arn:aws:iam::${var.aws_account_id}:role/scape/services/*"
        Condition = { StringEquals = { "iam:PassedToService" = "ecs-tasks.amazonaws.com" } }
      },
      {
        Sid       = "CreateRdsServiceLinkedRole"
        Effect    = "Allow"
        Action    = ["iam:CreateServiceLinkedRole"]
        Resource  = "arn:aws:iam::*:role/aws-service-role/rds.amazonaws.com/AWSServiceRoleForRDS"
        Condition = { StringEquals = { "iam:AWSServiceName" = "rds.amazonaws.com" } }
      }
    ]
  })
}

resource "aws_iam_role" "cost_explorer" {
  name = "CostExplorerReadRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { AWS = var.backend_role_arn }
    }]
  })
  tags = {
    ManagedBy = "scape"
    Purpose   = "cost-explorer-read-only"
  }
}

resource "aws_iam_role_policy" "cost_explorer" {
  name = "CostExplorerReadAccess"
  role = aws_iam_role.cost_explorer.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["ce:GetCostAndUsage"]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"]
}
