import { PoolConnection } from 'mysql2/promise';
import { pool } from '../database/pool.js';

export interface AuditLogInput {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  details?: Record<string, any> | null;
}

export async function recordAuditLog(
  input: AuditLogInput,
  conn?: PoolConnection
): Promise<void> {
  const query = `
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [
    input.userId ?? null,
    input.action,
    input.entityType,
    input.entityId ? String(input.entityId) : null,
    input.details ? JSON.stringify(input.details) : null,
  ];

  if (conn) {
    await conn.execute(query, params);
  } else {
    await pool.execute(query, params);
  }
}

