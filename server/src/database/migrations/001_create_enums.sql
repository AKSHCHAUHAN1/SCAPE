-- Migration 001: Create ENUM types
-- All custom enum types used across SCAPE tables

CREATE TYPE user_role AS ENUM ('developer', 'team_lead', 'devops', 'admin');
CREATE TYPE cloud_provider AS ENUM ('aws', 'gcp');
CREATE TYPE service_status AS ENUM ('pending', 'provisioning', 'active', 'failed', 'decommissioned');
CREATE TYPE job_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'rolled_back');
CREATE TYPE deployment_status AS ENUM ('pending', 'running', 'succeeded', 'failed');
