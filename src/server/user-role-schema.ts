import type { Pool } from 'pg';

/** Keep the role column wide enough without assigning roles during startup. */
export async function ensureUserRoleSchema(pool: Pick<Pool, 'query'>): Promise<void> {
  await pool.query('ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20)');
}
