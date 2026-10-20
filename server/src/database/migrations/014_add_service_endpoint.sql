-- Migration 014: Keep the endpoint returned by Terraform with the service record.

ALTER TABLE services ADD COLUMN service_endpoint TEXT;
