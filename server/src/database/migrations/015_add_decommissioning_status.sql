-- Migration 015: Track asynchronous infrastructure teardown.

ALTER TYPE service_status ADD VALUE IF NOT EXISTS 'decommissioning';
