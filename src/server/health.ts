import type { RequestHandler } from 'express';
import type { Pool } from 'pg';

export interface StartupReadiness {
  schemaReady: boolean;
}

export function createHealthHandler(
  pool: Pick<Pool, 'query'>,
  readiness: StartupReadiness,
): RequestHandler {
  return async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      if (!readiness.schemaReady) {
        res.status(503).json({
          status: 'starting',
          db_connected: true,
          schema_ready: false,
        });
        return;
      }
      res.status(200).json({
        status: 'ok',
        db_connected: true,
        schema_ready: true,
      });
    } catch {
      res.status(503).json({
        status: 'unhealthy',
        db_connected: false,
        schema_ready: readiness.schemaReady,
      });
    }
  };
}
