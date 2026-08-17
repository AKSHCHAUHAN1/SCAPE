# Node.js API Module
#
# Provisions a complete Node.js API stack on AWS:
# - VPC with public/private subnets
# - ECS Fargate cluster + service + task definition
# - RDS PostgreSQL instance
# - Application Load Balancer
# - Security groups
# - IAM task execution and task roles
#
# This module is invoked by the SCAPE provisioning engine.
# See terraform/README.md for the variable/output contract.
