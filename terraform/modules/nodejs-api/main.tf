# Node.js API service stack. Application tasks stay at zero until the generated
# GitHub Actions workflow has pushed the first image to ECR.

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_ssm_parameter" "ecs_ami" {
  count = var.compute_mode == "ec2" ? 1 : 0
  name  = "/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id"
}

locals {
  service_slug = "${substr(replace(lower(var.service_name), "/[^a-z0-9-]/", "-"), 0, 14)}-${substr(replace(var.service_id, "-", ""), 0, 8)}"
  tags = merge(var.tags, {
    "forge:service-id"  = var.service_id
    "forge:team-id"     = var.owner_team
    "forge:template-id" = lookup(var.tags, "forge:template-id", "nodejs-api")
    Environment         = var.environment
    ManagedBy           = "scape"
  })
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = merge(local.tags, { Name = "${local.service_slug}-vpc" })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = merge(local.tags, { Name = "${local.service_slug}-igw" })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = merge(local.tags, { Name = "${local.service_slug}-public-rt" })
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = merge(local.tags, {
    Name = "${local.service_slug}-public-${count.index + 1}"
    Tier = "public"
  })
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Isolated subnets keep the database off the public internet and do not need a NAT gateway.
resource "aws_subnet" "database" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = merge(local.tags, {
    Name = "${local.service_slug}-database-${count.index + 1}"
    Tier = "database"
  })
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.service_slug}-db-subnets"
  subnet_ids = aws_subnet.database[*].id
  tags       = local.tags
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${local.service_slug}"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_ecs_cluster" "main" {
  name = "${local.service_slug}-cluster"
  tags = local.tags
}

resource "aws_iam_role" "ecs_instance" {
  count = var.compute_mode == "ec2" ? 1 : 0
  name  = "${local.service_slug}-ecs-instance"
  path  = "/scape/services/"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "ecs_instance" {
  count      = var.compute_mode == "ec2" ? 1 : 0
  role       = aws_iam_role.ecs_instance[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "ecs_instance" {
  count = var.compute_mode == "ec2" ? 1 : 0
  name  = "${local.service_slug}-ecs-instance"
  path  = "/scape/services/"
  role  = aws_iam_role.ecs_instance[0].name
  tags  = local.tags
}

resource "aws_ecr_repository" "app" {
  name                 = "${local.service_slug}-repo"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = local.tags
}

resource "aws_iam_role" "ecs_execution" {
  name = "${local.service_slug}-ecs-execution"
  path = "/scape/services/"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "read_database_secret" {
  name = "read-database-secret"
  role = aws_iam_role.ecs_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = aws_db_instance.postgres.master_user_secret[0].secret_arn
    }]
  })
}

resource "aws_iam_role" "ecs_task" {
  name = "${local.service_slug}-ecs-task"
  path = "/scape/services/"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
  tags = local.tags
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${local.service_slug}-task"
  network_mode             = var.compute_mode == "ec2" ? "bridge" : "awsvpc"
  requires_compatibilities = [var.compute_mode == "ec2" ? "EC2" : "FARGATE"]
  cpu                      = tostring(var.requested_vcpu * 1024)
  memory                   = tostring(var.requested_memory_gib * 1024)
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "app"
    image     = "${aws_ecr_repository.app.repository_url}:latest"
    essential = true
    portMappings = [{
      containerPort = 3000
      hostPort      = var.compute_mode == "ec2" ? 3000 : 0
      protocol      = "tcp"
    }]
    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "DB_HOST", value = aws_db_instance.postgres.address },
      { name = "DB_PORT", value = tostring(aws_db_instance.postgres.port) },
      { name = "DB_NAME", value = aws_db_instance.postgres.db_name },
      { name = "DB_USER", value = aws_db_instance.postgres.username }
    ]
    secrets = [{
      name      = "DB_PASSWORD"
      valueFrom = "${aws_db_instance.postgres.master_user_secret[0].secret_arn}:password::"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = local.tags
}

resource "aws_security_group" "alb" {
  name        = "${local.service_slug}-alb"
  description = "Public HTTP entry point for ${var.service_name}"
  vpc_id      = aws_vpc.main.id
  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = local.tags
}

resource "aws_security_group" "ecs" {
  name        = "${local.service_slug}-ecs"
  description = "Allow application traffic only from the load balancer"
  vpc_id      = aws_vpc.main.id
  ingress {
    protocol        = "tcp"
    from_port       = 3000
    to_port         = 3000
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = local.tags
}

resource "aws_launch_template" "ecs" {
  count         = var.compute_mode == "ec2" ? 1 : 0
  name_prefix   = "${local.service_slug}-ecs-"
  image_id      = data.aws_ssm_parameter.ecs_ami[0].value
  instance_type = var.ec2_instance_type
  iam_instance_profile {
    arn = aws_iam_instance_profile.ecs_instance[0].arn
  }
  network_interfaces {
    device_index                = 0
    associate_public_ip_address = true
    security_groups             = [aws_security_group.ecs.id]
  }
  user_data = base64encode(<<-EOT
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.main.name} >> /etc/ecs/ecs.config
  EOT
  )
  tag_specifications {
    resource_type = "instance"
    tags          = merge(local.tags, { Name = "${local.service_slug}-ecs" })
  }
  tag_specifications {
    resource_type = "volume"
    tags          = local.tags
  }
  tags       = local.tags
  depends_on = [aws_iam_role_policy_attachment.ecs_instance]
}

resource "aws_autoscaling_group" "ecs" {
  count                     = var.compute_mode == "ec2" ? 1 : 0
  name                      = "${local.service_slug}-ecs"
  min_size                  = 1
  max_size                  = 1
  desired_capacity          = 1
  vpc_zone_identifier       = aws_subnet.public[*].id
  health_check_type         = "EC2"
  health_check_grace_period = 300
  launch_template {
    id      = aws_launch_template.ecs[0].id
    version = "$Latest"
  }
  tag {
    key                 = "Name"
    value               = "${local.service_slug}-ecs"
    propagate_at_launch = true
  }
  tag {
    key                 = "ManagedBy"
    value               = "scape"
    propagate_at_launch = true
  }
  tag {
    key                 = "forge:service-id"
    value               = var.service_id
    propagate_at_launch = true
  }
  tag {
    key                 = "forge:team-id"
    value               = var.owner_team
    propagate_at_launch = true
  }
  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
  depends_on = [aws_ecs_cluster.main]
}

resource "aws_lb" "main" {
  name               = "${local.service_slug}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  tags               = local.tags
}

resource "aws_lb_target_group" "app" {
  name        = "${local.service_slug}-tg"
  port        = 3000
  protocol    = "HTTP"
  target_type = var.compute_mode == "ec2" ? "instance" : "ip"
  vpc_id      = aws_vpc.main.id
  health_check {
    enabled             = true
    path                = "/health"
    matcher             = "200-399"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
  tags = local.tags
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
  tags = local.tags
}

resource "aws_db_instance" "postgres" {
  identifier                  = "${local.service_slug}-db"
  allocated_storage           = 20
  max_allocated_storage       = 100
  storage_type                = "gp3"
  storage_encrypted           = true
  engine                      = "postgres"
  instance_class              = "db.t3.micro"
  db_name                     = "app"
  username                    = "scape_admin"
  manage_master_user_password = true
  backup_retention_period     = 7
  auto_minor_version_upgrade  = true
  publicly_accessible         = false
  skip_final_snapshot         = true
  deletion_protection         = false
  db_subnet_group_name        = aws_db_subnet_group.main.name
  vpc_security_group_ids      = [aws_security_group.database.id]
  tags                        = local.tags
}

resource "aws_security_group" "database" {
  name        = "${local.service_slug}-database"
  description = "PostgreSQL is reachable only from the application tasks"
  vpc_id      = aws_vpc.main.id
  ingress {
    protocol        = "tcp"
    from_port       = 5432
    to_port         = 5432
    security_groups = [aws_security_group.ecs.id]
  }
  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = local.tags
}

resource "aws_ecs_service" "app" {
  name            = "${local.service_slug}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  launch_type     = var.compute_mode == "ec2" ? "EC2" : "FARGATE"
  desired_count   = 0

  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
  health_check_grace_period_seconds  = 120

  deployment_circuit_breaker {
    enable   = true
    rollback = false
  }

  dynamic "network_configuration" {
    for_each = var.compute_mode == "ec2" ? [] : [1]
    content {
      subnets          = aws_subnet.public[*].id
      security_groups  = [aws_security_group.ecs.id]
      assign_public_ip = true
    }
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_execution,
    aws_autoscaling_group.ecs,
  ]
  tags = local.tags
}

resource "aws_iam_role" "github_deploy" {
  name = "${local.service_slug}-github-deploy"
  path = "/scape/services/"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRoleWithWebIdentity"
      Effect    = "Allow"
      Principal = { Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com" }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:ref:refs/heads/main"
        }
      }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy" "github_deploy" {
  name = "${local.service_slug}-github-deploy"
  role = aws_iam_role.github_deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart"
        ]
        Resource = aws_ecr_repository.app.arn
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:DescribeServices", "ecs:UpdateService"]
        Resource = "arn:aws:ecs:${var.region}:${data.aws_caller_identity.current.account_id}:service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
      }
    ]
  })
}
