import type { Pool } from 'pg';

export interface NewUserInput {
  name: string;
  email: string;
  phoneNumber?: string | null;
  passwordHash: string;
}

export async function insertPublicUser(
  pool: Pick<Pool, 'query'>,
  input: NewUserInput,
) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, phone_number, password, role, balance)
     VALUES ($1, $2, $3, $4, 'user', 0) RETURNING *`,
    [input.name, input.email, input.phoneNumber || null, input.passwordHash],
  );
  return rows[0];
}

export async function provisionFirstAdmin(pool: Pool, input: NewUserInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize all provisioning attempts, including concurrent CLI invocations.
    await client.query("SELECT pg_advisory_xact_lock(730021, 1)");
    const existingAdmin = await client.query(
      "SELECT id FROM users WHERE role IN ('admin', 'superadmin') LIMIT 1",
    );
    if (existingAdmin.rows.length > 0) {
      throw new Error('Administrator sudah ada; provisioning awal hanya dapat dilakukan sekali.');
    }

    const { rows } = await client.query(
      `INSERT INTO users (name, email, phone_number, password, role, balance)
       VALUES ($1, $2, $3, $4, 'superadmin', 0) RETURNING id, name, email, role`,
      [input.name, input.email, input.phoneNumber || null, input.passwordHash],
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
