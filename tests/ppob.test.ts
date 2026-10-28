import 'dotenv/config';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import express, { type RequestHandler } from 'express';
import session from 'express-session';
import type { Server } from 'node:http';
import { Pool } from 'pg';
import { ensurePpobSchema } from '../src/server/ppob-schema';
import { DigiflazzClient, normalizeResult, normalizeProduct, rupiah } from '../src/server/digiflazz-client';
import { PpobService, inCutOff, requireNonDefaultPpobPassword } from '../src/server/ppob-service';
import { ppobCsrf, validPpobCsrf, sameOrigin, registerPpobRoutes } from '../src/server/ppob-routes';

// Isolated schema + injected fetch ONLY. Never send a real supplier request or debit an app account.
const schema = `test_ppob_${crypto.randomBytes(6).toString('hex')}`;
const fixtureCredentials = { username: 'fixture-buyer', apiKey: 'fixture-only-api-key-not-real',
  webhookSecret: 'fixture-only-webhook-secret-32-characters' };
const baseProduct = { buyer_sku_code: 'TEST10', product_name: 'Fixture Pulsa 10.000', category: 'Pulsa', brand: 'TEST',
  desc: 'Isolated test fixture', price: 10000, buyer_product_status: true, seller_product_status: true,
  unlimited_stock: true, stock: 0, multi: true, start_cut_off: '00:00', end_cut_off: '00:00' };
let root: Pool, pool: Pool, service: PpobService, server: Server, baseUrl: string;
let products: any[], requests: any[], credentials: typeof fixtureCredentials;
let outcome: 'Sukses' | 'Pending' | 'Gagal', transportFails: boolean, override: Record<string, unknown>;
const fakeFetch: typeof fetch = async (url, options) => {
  assert.match(String(url), /^https:\/\/api\.digiflazz\.com\/v1\/(transaction|price-list|cek-saldo)$/);
  const body = JSON.parse(String(options?.body));
  assert.equal(options?.redirect, 'error');
  const suffix = String(url).endsWith('price-list') ? 'pricelist' : String(url).endsWith('cek-saldo') ? 'depo' : body.ref_id;
  assert.equal(body.sign, crypto.createHash('md5').update(credentials.username + credentials.apiKey + suffix).digest('hex'));
  if (String(url).endsWith('price-list')) return Response.json({ data: products });
  if (String(url).endsWith('cek-saldo')) return Response.json({ data: { deposit: 500000 } });
  requests.push(body);
  if (transportFails) throw new Error('fixture timeout');
  return Response.json({ data: { ref_id: body.ref_id, buyer_sku_code: body.buyer_sku_code,
    customer_no: body.customer_no, status: outcome, rc: outcome === 'Sukses' ? '00' : outcome === 'Pending' ? '03' : '02',
    price: 10000, sn: 'FIXTURE-SERIAL-NOT-A-REAL-TOKEN', ...override } });
};
const balance = async (id = 1) => Number((await pool.query('SELECT balance FROM users WHERE id=$1', [id])).rows[0].balance);
const count = async (table: string) => Number((await pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count);
const key = () => crypto.randomUUID();
async function live() {
  await service.checkConnection(3);
  await service.sync(3);
  await service.editProduct(3, 'TEST10', { name: 'Fixture Product', description: '', enabled: true, fixed_price: null, markup: null });
  await service.configure(3, { enabled: true, mode: 'live', default_markup: 1500, max_order: 500000, daily_limit: 1000000 });
}
async function buy(customer = '081234567890', user = 1, sku = 'TEST10') {
  const quote = await service.quote(user, sku, customer), idempotency_key = key();
  const order = await service.purchase(user, { quote_id: quote.id, pin: '123456', idempotency_key });
  return { quote, order, idempotency_key };
}
async function due(id: string) {
  await pool.query("UPDATE ppob_orders SET next_check_at=now()-interval '1 second',lease_until=NULL WHERE id=$1", [id]);
}
async function login(id: number) {
  const result = await fetch(`${baseUrl}/test-session/${id}`);
  return result.headers.get('set-cookie')!.split(';')[0];
}
async function api(path: string, cookie?: string, method = 'GET', body?: unknown, token?: string, origin = baseUrl) {
  return fetch(baseUrl + '/api/ppob' + path, { method, headers: {
    ...(cookie ? { Cookie: cookie } : {}), Origin: origin,
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { 'X-PPOB-CSRF': token } : {}),
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
before(async () => {
  assert.ok(process.env.DATABASE_URL, 'Development DATABASE_URL required for isolated-schema tests');
  root = new Pool({ connectionString: process.env.DATABASE_URL });
  await root.query(`CREATE SCHEMA ${schema}`);
  pool = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}`, max: 12 });
  await pool.query(`CREATE TABLE users(id integer PRIMARY KEY,name text,role text,status text,pin text,password text,balance numeric(10,2));
    CREATE TABLE notifications(id serial PRIMARY KEY,user_id integer,title text,body text,type text);
    INSERT INTO users(id,name,role,status,balance) VALUES(1,'Fixture Customer','user','active',100000),
      (2,'Other Fixture','user','active',100000),(3,'Fixture Admin','admin','active',0)`);
  const pin = await bcrypt.hash('123456', 4);
  await pool.query('UPDATE users SET pin=$1,password=$2', [pin, await bcrypt.hash('FixtureSecure!246', 4)]);
  await ensurePpobSchema(pool);
  await ensurePpobSchema(pool);
  const app = express();
  app.use('/api/ppob/webhook', express.raw({ type: 'application/json', limit: '64kb' }));
  app.use(express.json());
  app.use(session({ secret: 'fixture-session-secret-no-production-value', resave: false, saveUninitialized: false }));
  app.get('/test-session/:id', async (req, res) => {
    req.session.userId = Number(req.params.id);
    req.session.role = (await pool.query('SELECT role FROM users WHERE id=$1', [req.session.userId])).rows[0].role;
    res.json({ ok: true });
  });
  const auth: RequestHandler = (req, res, next) => req.session.userId ? next() : void res.status(401).json({ success: false });
  const admin: RequestHandler = (req, res, next) => req.session.userId && req.session.role === 'admin' ? next() : void res.status(403).json({ success: false });
  // Routes retain the same service instance; each test resets its injected supplier fixture.
  service = new PpobService(pool, new DigiflazzClient(() => credentials, fakeFetch));
  registerPpobRoutes(app, pool, service, auth, admin, 'fixture-session-secret-no-production-value');
  await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  service?.stop();
  if (server) await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  await pool?.end();
  if (root) { await root.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await root.end(); }
});
beforeEach(async () => {
  products = [{ ...baseProduct }]; requests = []; credentials = { ...fixtureCredentials };
  outcome = 'Sukses'; transportFails = false; override = {};
  await pool.query(`TRUNCATE ppob_wallet_entries,ppob_orders,ppob_quotes,ppob_products,ppob_pin_guard,ppob_audit,notifications CASCADE;
    UPDATE ppob_config SET enabled=false,mode='test',default_markup=1500,max_order=500000,daily_limit=1000000,
      last_sync_at=NULL,last_sync_attempt_at=NULL,last_connection_attempt_at=NULL,connection_checked_at=NULL,
      catalog_account_hash=NULL,connection_account_hash=NULL,provider_balance=NULL;
    UPDATE users SET balance=100000,status='active',role=CASE WHEN id=3 THEN 'admin' ELSE 'user' END`);
});

test('credentials absent locks purchases, with no fake catalogue or debit', async () => {
  credentials = { username: '', apiKey: '', webhookSecret: '' };
  const data = await service.customer(1);
  assert.equal(data.enabled, false); assert.deepEqual(data.products, []); assert.deepEqual(data.orders, []);
  await assert.rejects(service.configure(3, { enabled: true, mode: 'live', default_markup: 0, max_order: 10000, daily_limit: 10000 }), /belum lengkap/);
  assert.equal(await balance(), 100000); assert.equal(await count('ppob_orders'), 0);
});
test('known seeded passwords cannot unlock production financial transactions', async () => {
  await assert.rejects(requireNonDefaultPpobPassword(await bcrypt.hash('admin', 4), true), /bawaan/);
  await assert.rejects(requireNonDefaultPpobPassword(await bcrypt.hash('user123', 4), false), /demo/);
  await assert.rejects(requireNonDefaultPpobPassword(undefined, true), /bawaan/);
  await requireNonDefaultPpobPassword(await bcrypt.hash('FixtureSecure!246', 4), true);
});
test('imports only supported prepaid products, inactive until selected by admin', async () => {
  products.push({ ...baseProduct, category: 'Games', buyer_sku_code: 'UNSUPPORTED' });
  assert.deepEqual(await service.sync(3), { count: 1 });
  const admin = await service.admin(); assert.equal(admin.products.length, 1); assert.equal(admin.products[0].enabled, false);
  assert.equal((await service.customer(1)).products.length, 0);
  assert.equal(JSON.stringify(admin).includes('account_hash'), false);
});
test('test mode never charges a real customer wallet', async () => {
  await live(); await pool.query("UPDATE ppob_config SET mode='test'");
  await assert.rejects(service.quote(1, 'TEST10', '081234567890'), /transaksi nyata/);
  assert.equal(await balance(), 100000);
});
test('quote verifies recipient, creates no debit, and price is server-owned', async () => {
  await live();
  const quote = await service.quote(1, 'TEST10', '081234567890');
  assert.equal(quote.price, 11500); assert.equal(await balance(), 100000); assert.equal(requests.length, 0);
  await assert.rejects(service.quote(1, 'TEST10', 'a/../../'), /Nomor HP/);
  await assert.rejects(service.quote(1, 'TEST10', '6281234567890'), /diawali 0/);
});
test('PIN rejection is persistent and five failures lock even the correct PIN', async () => {
  await live(); const quote = await service.quote(1, 'TEST10', '081234567890');
  for (let i = 0; i < 5; i++)
    await assert.rejects(service.purchase(1, { quote_id: quote.id, pin: '000000', idempotency_key: key() }), /PIN/);
  assert.equal((await pool.query('SELECT failures FROM ppob_pin_guard WHERE user_id=1')).rows[0].failures, 5);
  await assert.rejects(service.purchase(1, { quote_id: quote.id, pin: '123456', idempotency_key: key() }), /terkunci/);
  assert.equal(await balance(), 100000); assert.equal(await count('ppob_wallet_entries'), 0);
});
test('eight concurrent retries debit once and reserve one immutable reference', async () => {
  await live(); const quote = await service.quote(1, 'TEST10', '081234567890'), idempotency_key = key();
  const orders = await Promise.all(Array.from({ length: 8 }, () => service.purchase(1, { quote_id: quote.id, pin: '123456', idempotency_key })));
  assert.equal(new Set(orders.map(o => o.id)).size, 1);
  assert.equal(await balance(), 88500); assert.equal(await count('ppob_orders'), 1); assert.equal(await count('ppob_wallet_entries'), 1);
  assert.equal(requests.length, 0, 'Provider cannot be called before committed outbox processing');
});
test('changing retry key cannot charge an already-used quote again', async () => {
  await live(); const original = await buy();
  await assert.rejects(service.purchase(1, { quote_id: original.quote.id, pin: '123456', idempotency_key: key() }), /sudah menjadi/);
  const second = await service.quote(1, 'TEST10', '081234567891');
  await assert.rejects(service.purchase(1, { quote_id: second.id, pin: '123456', idempotency_key: original.idempotency_key }), /pesanan lain/);
  assert.equal(await balance(), 88500);
});
test('different keys cannot create concurrent duplicate recipient purchases', async () => {
  await live();
  const quotes = await Promise.all([service.quote(1, 'TEST10', '081234567890'), service.quote(2, 'TEST10', '081234567890')]);
  const outcomes = await Promise.allSettled(quotes.map((quote, index) => service.purchase(index+1, { quote_id: quote.id, pin: '123456', idempotency_key: key() })));
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
  assert.equal(await count('ppob_orders'), 1);
  assert.equal(await balance(1) + await balance(2), 188500);
});
test('insufficient balance rolls back order, debit, and ledger together', async () => {
  await live(); await pool.query('UPDATE users SET balance=1000 WHERE id=1');
  await assert.rejects(buy(), /Saldo tidak mencukupi/);
  assert.equal(await balance(), 1000); assert.equal(await count('ppob_orders'), 0); assert.equal(await count('ppob_wallet_entries'), 0);
});
test('expired quote rejects before debit', async () => {
  await live(); const quote = await service.quote(1, 'TEST10', '081234567890');
  await pool.query("UPDATE ppob_quotes SET expires_at=now()-interval '1 second' WHERE id=$1", [quote.id]);
  await assert.rejects(service.purchase(1, { quote_id: quote.id, pin: '123456', idempotency_key: key() }), /kedaluwarsa/);
  assert.equal(await balance(), 100000);
});
test('cost or sell-price changes invalidate quote instead of silently repricing', async () => {
  await live(); const quote = await service.quote(1, 'TEST10', '081234567890');
  await pool.query('UPDATE ppob_products SET cost_price=12000');
  await assert.rejects(service.purchase(1, { quote_id: quote.id, pin: '123456', idempotency_key: key() }), /Harga atau ketersediaan berubah/);
  assert.equal(await balance(), 100000);
});
test('stale catalogue and stock outage block new purchases', async () => {
  await live(); await pool.query("UPDATE ppob_products SET synced_at=now()-interval '31 minutes'");
  await assert.rejects(service.quote(1, 'TEST10', '081234567890'), /Produk tidak tersedia/);
  await pool.query("UPDATE ppob_products SET synced_at=now(),unlimited_stock=false,stock=0");
  await assert.rejects(service.quote(1, 'TEST10', '081234567890'), /Produk tidak tersedia/);
});
test('price loss is not sellable and settings enforce integer rupiah', async () => {
  await live();
  await assert.rejects(service.editProduct(3, 'TEST10', { name: 'Fixture', description: '', enabled: true, fixed_price: 9999, markup: null }), /modal/);
  assert.throws(() => rupiah(1.5)); assert.throws(() => rupiah('10000')); assert.throws(() => rupiah(-1));
});
test('daily account limit includes reserved pending orders', async () => {
  await live(); await pool.query('UPDATE ppob_config SET max_order=12000,daily_limit=12000');
  await buy();
  await assert.rejects(buy('081234567891'), /Batas belanja/);
  assert.equal(await balance(), 88500);
});
test('supplier non-multi rule respects Jakarta daily boundary', async () => {
  products[0].multi = false; await live(); await buy(); await service.reconcileOne();
  await assert.rejects(buy(), /batas harian pemasok/);
  assert.equal(await balance(), 88500);
});
test('outbox success verifies identity and records serial without refund', async () => {
  await live(); const { order } = await buy(); await service.reconcileOne();
  const fresh = await service.order(1, order.id);
  assert.equal(fresh.status, 'success'); assert.equal(fresh.serial, 'FIXTURE-SERIAL-NOT-A-REAL-TOKEN');
  assert.equal(await balance(), 88500); assert.equal(await count('ppob_wallet_entries'), 1);
  assert.equal(requests[0].max_price, 10000); assert.equal(requests[0].testing, false);
});
test('transport timeout remains pending and retries with the original reference', async () => {
  await live(); const { order } = await buy(); transportFails = true;
  await service.reconcileOne(); assert.equal((await service.order(1, order.id)).status, 'pending');
  assert.equal(await balance(), 88500); transportFails = false; await due(order.id); await service.reconcileOne();
  assert.equal(requests.length, 2); assert.equal(requests[0].ref_id, requests[1].ref_id);
  assert.equal((await service.order(1, order.id)).status, 'success');
});
test('final authenticated failure refunds once under concurrent workers and callback replay', async () => {
  await live(); const { order } = await buy(); outcome = 'Gagal';
  await Promise.all([service.reconcileOne(), service.reconcileOne(), service.reconcileOne()]);
  assert.equal(await balance(), 100000); assert.equal((await service.order(1, order.id)).status, 'failed');
  assert.equal(await count('ppob_wallet_entries'), 2);
  await due(order.id); await service.reconcileOne();
  assert.equal(await balance(), 100000); assert.equal(requests.length, 1);
});
test('request-level error after an ambiguous submission cannot refund a possibly fulfilled order', async () => {
  await live(); const { order } = await buy(); transportFails = true;
  await service.reconcileOne(); transportFails = false;
  override = { status: 'Gagal', rc: '41', price: 0 }; await due(order.id); await service.reconcileOne();
  assert.equal((await service.order(1, order.id)).status, 'review');
  assert.equal(await balance(), 88500); assert.equal(await count('ppob_wallet_entries'), 1);
  override = {}; await due(order.id); await service.reconcileOne();
  assert.equal((await service.order(1, order.id)).status, 'success'); assert.equal(await balance(), 88500);
});
test('initial definite supplier price-cap rejection refunds an unsubmitted purchase', async () => {
  await live(); const { order } = await buy();
  override = { status: 'Gagal', rc: '69', price: 0 }; await service.reconcileOne();
  assert.equal((await service.order(1, order.id)).status, 'failed'); assert.equal(await balance(), 100000);
});
test('not-found, reference conflict, rate-limit and unknown failure codes cannot refund', async () => {
  await live(); const { order } = await buy();
  for (const rc of ['50','49','85','86','06']) {
    override = { status: 'Gagal', rc, price: 0 }; await due(order.id); await service.reconcileOne();
    assert.equal((await service.order(1, order.id)).status, 'review'); assert.equal(await balance(), 88500);
  }
  assert.equal(await count('ppob_wallet_entries'), 1);
});
test('wrong reference, recipient or excessive supplier price holds money for review', async () => {
  await live(); const { order } = await buy(); override = { ref_id: 'WRONG-REFERENCE' };
  await service.reconcileOne();
  assert.equal((await service.order(1, order.id)).status, 'review'); assert.equal(await balance(), 88500);
  override = { price: 15000 }; await due(order.id); await service.reconcileOne();
  assert.equal((await service.order(1, order.id)).status, 'review'); assert.equal(await balance(), 88500);
});
test('missing PLN serial cannot be displayed as successful token delivery', async () => {
  products[0].category = 'PLN'; await live(); const { order } = await buy('123456789012');
  override = { sn: '' }; await service.reconcileOne();
  assert.equal((await service.order(1, order.id)).status, 'review'); assert.equal(await balance(), 88500);
  override = {}; await due(order.id); await service.reconcileOne();
  assert.equal((await service.order(1, order.id)).status, 'success');
});
test('account credential rotation does not send an old order using a different merchant account', async () => {
  await live(); const { order } = await buy(); credentials = { ...fixtureCredentials, username: 'different-fixture-account' };
  await service.reconcileOne(); assert.equal(requests.length, 0);
  assert.equal((await service.order(1, order.id)).status, 'review'); assert.equal(await balance(), 88500);
  await assert.rejects(service.quote(1, 'TEST10', '081234567891'), /akun Digiflazz/);
});
test('server recovery returns same committed order even after quote expiration without re-debit', async () => {
  await live(); const bought = await buy();
  await pool.query("UPDATE ppob_quotes SET expires_at=now()-interval '1 second'");
  const recovered = await service.recover(1, bought.idempotency_key, bought.quote.id);
  assert.equal(recovered.order?.id, bought.order.id); assert.equal(recovered.quote_expired, true);
  const retry = await service.purchase(1, { quote_id: bought.quote.id, pin: '000000', idempotency_key: bought.idempotency_key });
  assert.equal(retry.id, bought.order.id); assert.equal(await balance(), 88500);
});
test('recovery with no order proves expired quote but does not reveal another account order', async () => {
  await live(); const quote = await service.quote(1, 'TEST10', '081234567890');
  await pool.query("UPDATE ppob_quotes SET expires_at=now()-interval '1 second'");
  assert.deepEqual(await service.recover(1, key(), quote.id), { order: null, quote_expired: true });
  const other = await buy('081234567891', 2);
  assert.equal((await service.recover(1, other.idempotency_key, other.quote.id)).order, null);
  await assert.rejects(service.order(1, other.order.id), /tidak ditemukan/);
});
test('signed callback is only a wake-up, never authority to refund or fulfil', async () => {
  await live(); const { order } = await buy();
  const raw = Buffer.from(JSON.stringify({ data: { ref_id: order.reference, buyer_sku_code: order.sku, customer_no: order.customer_no, status: 'Gagal' } }));
  const signature = 'sha1=' + crypto.createHmac('sha1', fixtureCredentials.webhookSecret).update(raw).digest('hex');
  await service.webhook(raw, signature);
  assert.equal(await balance(), 88500); assert.equal((await service.order(1, order.id)).status, 'pending');
  await assert.rejects(service.webhook(Buffer.concat([raw, Buffer.from(' ')]), signature), /Signature/);
  await service.reconcileOne(); assert.equal((await service.order(1, order.id)).status, 'success');
});
test('auth and ownership deny unauthenticated and customer-to-admin access', async () => {
  assert.equal((await api('/customer')).status, 401);
  const cookie = await login(1); assert.equal((await api('/admin', cookie)).status, 403);
});
test('missing token and cross-origin POST cannot create a quote or debit', async () => {
  await live(); const cookie = await login(1);
  const data = (await (await api('/customer', cookie)).json()).data;
  assert.equal((await api('/quotes', cookie, 'POST', { sku: 'TEST10', customer_no: '081234567890' })).status, 403);
  assert.equal((await api('/quotes', cookie, 'POST', { sku: 'TEST10', customer_no: '081234567890' }, data.csrf_token, 'https://attacker.invalid')).status, 403);
  assert.equal(await count('ppob_quotes'), 0); assert.equal(await balance(), 100000);
});
test('stale admin session cannot administer PPOB after role revocation', async () => {
  const cookie = await login(3); await pool.query("UPDATE users SET role='user' WHERE id=3");
  assert.equal((await api('/admin', cookie)).status, 403);
});
test('API purchase honours valid session-bound token and conceals cost from customer', async () => {
  await live(); const cookie = await login(1), data = (await (await api('/customer', cookie)).json()).data;
  assert.equal(data.products[0].cost_price, undefined); assert.equal(data.products[0].margin, undefined);
  const quote = (await (await api('/quotes', cookie, 'POST', { sku: 'TEST10', customer_no: '081234567890' }, data.csrf_token)).json()).data;
  const response = await api('/orders', cookie, 'POST', { quote_id: quote.id, pin: '123456', idempotency_key: key(), amount: 1, user_id: 2 }, data.csrf_token);
  assert.equal(response.status, 200); assert.equal((await response.json()).data.amount, 11500);
  assert.equal(await balance(1), 88500); assert.equal(await balance(2), 100000);
});
test('webhook route authenticates exact bytes without requiring user session', async () => {
  const raw = JSON.stringify({ sed: 'fixture-ping', hook_id: 'fixture' });
  const signature = 'sha1=' + crypto.createHmac('sha1', fixtureCredentials.webhookSecret).update(raw).digest('hex');
  const response = await fetch(baseUrl + '/api/ppob/webhook', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature': signature }, body: raw });
  assert.equal(response.status, 200);
  assert.equal((await api('/webhook', undefined, 'POST', { sed: 'bad' })).status, 401);
});
test('financial history cannot be deleted by deleting its account', async () => {
  await live(); await buy();
  await assert.rejects(pool.query('DELETE FROM users WHERE id=1'), /foreign key constraint/);
  assert.equal(await count('ppob_orders'), 1); assert.equal(await count('ppob_wallet_entries'), 1);
});
test('cut-off windows handle Jakarta midnight and normal daytime', () => {
  assert.equal(inCutOff('23:00', '01:00', new Date('2026-10-03T17:30:00Z')), true);
  assert.equal(inCutOff('23:00', '01:00', new Date('2026-10-03T03:00:00Z')), false);
  assert.equal(inCutOff('08:00', '09:00', new Date('2026-10-03T01:30:00Z')), true);
  assert.equal(inCutOff('00:00', '00:00', new Date()), false);
});
test('HMAC, CSRF and supplier parser reject altered and inconsistent inputs', () => {
  const client = new DigiflazzClient(() => fixtureCredentials, fakeFetch), raw = Buffer.from('{}');
  const signature = 'sha1=' + crypto.createHmac('sha1', fixtureCredentials.webhookSecret).update(raw).digest('hex');
  assert.equal(client.validWebhook(raw, signature), true); assert.equal(client.validWebhook(raw, 'sha1=x'), false);
  const token = ppobCsrf('fixture', 'session1', 1);
  assert.equal(validPpobCsrf(token, token), true); assert.equal(validPpobCsrf(ppobCsrf('fixture', 'session2', 1), token), false);
  assert.equal(sameOrigin('https://site.test', 'site.test', 'https'), true);
  assert.equal(sameOrigin('https://evil.test', 'site.test'), false); assert.equal(sameOrigin('null', 'site.test'), false);
  assert.throws(() => normalizeResult({ ref_id: 'fixture', buyer_sku_code: 'TEST10', customer_no: '081234567890', status: 'Sukses', rc: '06', price: 10000 }));
  assert.throws(() => normalizeProduct({ ...baseProduct, price: -1 }));
});