import type { RequestHandler } from 'express';
import type { Pool } from 'pg';

export function createHealthHandler(pool: Pick<Pool, 'query'>): RequestHandler {
  return async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.status(200).json({ status: 'ok', db_connected: true });
    } catch {
      res.status(503).json({ status: 'unhealthy', db_connected: false });
    }
  };
}
