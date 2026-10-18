import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { config } from '../config/env.js';

export const pool: Pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: '+07:00',
});

/**
 * Execute a callback within an isolated database transaction.
 * Automatically commits on success, and rolls back on error.
 */
export async function withTransaction<T>(
  callback: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error('Error rolling back transaction:', rollbackErr);
    }
    throw error;
  } finally {
    conn.release();
  }
}

