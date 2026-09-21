import { query } from '../../database/index.js';
import { logger } from '../../utils/logger.js';

interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  payload: any;
  ip_address: string | null;
  created_at: Date;
}

interface LogActionInput {
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  payload?: any;
  ipAddress?: string;
}

/**
 * Log an action to the audit_logs table.
 * Does not throw errors to prevent failing the main request.
 */
export async function logAction(input: LogActionInput) {
  try {
    await query(
      `INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, payload, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.actorId || null,
        input.action,
        input.resourceType,
        input.resourceId || null,
        input.payload || {},
        input.ipAddress || null,
      ],
    );
  } catch (err) {
    logger.error({ err, input }, 'Failed to write audit log');
  }
}

/**
 * Get audit logs with pagination and filtering.
 */
export async function getAuditLogs(options: {
  resourceId?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  let result;
  if (options.resourceId) {
    result = await query<AuditLogRow>(
      `SELECT * FROM audit_logs WHERE resource_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [options.resourceId, limit, offset],
    );
  } else {
    result = await query<AuditLogRow>(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
  }

  return result.rows.map((r) => ({
    id: r.id,
    actorId: r.actor_id,
    action: r.action,
    resourceType: r.resource_type,
    resourceId: r.resource_id,
    payload: r.payload,
    ipAddress: r.ip_address,
    createdAt: r.created_at,
  }));
}
