import 'dotenv/config';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import {
  insertPublicUser,
  provisionFirstAdmin,
} from '../src/server/first-admin-provisioning';
import { ensureUserRoleSchema } from '../src/server/user-role-schema';

const schema = `test_first_admin_${crypto.randomBytes(6).toString('hex')}`;
const userInput = (email: string) => ({
  name: 'Fixture Admin',
  email,
  phoneNumber: null,
  passwordHash: 'test-only-hash',
});
let root: Pool;
let pool: Pool;

before(async () => {
  assert.ok(process.env.DATABASE_URL, 'Development DATABASE_URL required for isolated-schema tests');
  root = new Pool({ connectionString: process.env.DATABASE_URL });
  await root.query(`CREATE SCHEMA ${schema}`);
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema}`,
    max: 6,
  });
  await pool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      phone_number VARCHAR(30) UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(10) NOT NULL DEFAULT 'user',
      balance DECIMAL(10,2) NOT NULL DEFAULT 0
    )
  `);
});

after(async () => {
  await pool?.end();
  if (root) {
    await root.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await root.end();
  }
});

beforeEach(async () => {
  await pool.query('TRUNCATE users RESTART IDENTITY');
});

test('empty database has no admin until explicit first-admin provisioning', async () => {
  assert.equal((await pool.query('SELECT count(*) FROM users')).rows[0].count, '0');

  const admin = await provisionFirstAdmin(pool, userInput('first@example.test'));

  assert.equal(admin.role, 'superadmin');
  assert.equal((await pool.query("SELECT count(*) FROM users WHERE role IN ('admin','superadmin')")).rows[0].count, '1');
});

test('public registration always creates a regular user', async () => {
  const user = await insertPublicUser(pool, userInput('customer@example.test'));
  assert.equal(user.role, 'user');
  assert.equal((await pool.query("SELECT count(*) FROM users WHERE role IN ('admin','superadmin')")).rows[0].count, '0');
});

test('one explicit admin can be provisioned after public registrations', async () => {
  const customer = await insertPublicUser(pool, userInput('customer@example.test'));
  const admin = await provisionFirstAdmin(pool, userInput('owner@example.test'));

  assert.equal(customer.role, 'user');
  assert.equal(admin.role, 'superadmin');
  assert.equal((await pool.query("SELECT count(*) FROM users WHERE role IN ('admin','superadmin')")).rows[0].count, '1');
});

test('repeat provisioning is rejected without creating another admin', async () => {
  await provisionFirstAdmin(pool, userInput('first@example.test'));
  await assert.rejects(
    provisionFirstAdmin(pool, userInput('second@example.test')),
    /Administrator sudah ada/,
  );
  assert.equal((await pool.query("SELECT count(*) FROM users WHERE role IN ('admin','superadmin')")).rows[0].count, '1');
});

test('concurrent provisioning requests create at most one admin', async () => {
  const results = await Promise.allSettled([
    provisionFirstAdmin(pool, userInput('first@example.test')),
    provisionFirstAdmin(pool, userInput('second@example.test')),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  assert.equal((await pool.query("SELECT count(*) FROM users WHERE role IN ('admin','superadmin')")).rows[0].count, '1');
});

test('restarting role-schema initialization does not promote a user', async () => {
  const user = await insertPublicUser(pool, userInput('customer@example.test'));

  await ensureUserRoleSchema(pool);
  await ensureUserRoleSchema(pool);

  assert.equal((await pool.query('SELECT role FROM users WHERE id=$1', [user.id])).rows[0].role, 'user');
  assert.equal((await pool.query("SELECT count(*) FROM users WHERE role IN ('admin','superadmin')")).rows[0].count, '0');
});

test('restarting with no users does not create an administrator', async () => {
  await ensureUserRoleSchema(pool);
  await ensureUserRoleSchema(pool);
  assert.equal((await pool.query('SELECT count(*) FROM users')).rows[0].count, '0');
});
