import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Pool, PoolClient } from 'pg';
import { DigiflazzClient, PpobError, rupiah, validSku, validUuid, cleanText, definiteProviderFailure, type ProviderResult } from './digiflazz-client';

type Db = Pick<Pool, 'query'> | PoolClient;
const dateMs = (value: unknown) => new Date(String(value)).getTime();
const CATALOG_TTL = 30 * 60_000;
const PIN_WINDOW = 15 * 60_000;
const asNumber = (value: unknown) => Number(value);
export async function requireNonDefaultPpobPassword(hash: unknown, admin: boolean) {
  if (typeof hash !== 'string' || !hash.startsWith('$2') ||
      await bcrypt.compare(admin ? 'admin' : 'user123', hash))
    throw new PpobError(403, admin
      ? 'Ganti password administrator bawaan sebelum mengaktifkan PPOB.'
      : 'Ganti password akun demo sebelum menggunakan transaksi PPOB nyata.');
}

export function sellingPrice(product: any, config: any): number {
  return product.fixed_price == null ? Number(product.cost_price) +
    Number(product.markup ?? config.default_markup) : Number(product.fixed_price);
}
export function inCutOff(start: string, end: string, now = new Date()): boolean {
  if (start === end) return false;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  return start < end ? parts >= start && parts < end : parts >= start || parts < end;
}
export function productAvailable(p: any, config: any, now = new Date()): boolean {
  const price = sellingPrice(p, config);
  return p.enabled === true && p.provider_active === true &&
    (p.unlimited_stock === true || Number(p.stock) > 0) &&
    Number.isSafeInteger(price) && price >= Number(p.cost_price) && price <= Number(config.max_order) &&
    dateMs(p.synced_at) <= now.getTime() && now.getTime() - dateMs(p.synced_at) < CATALOG_TTL &&
    !inCutOff(p.cut_off_start, p.cut_off_end, now);
}
function customerNumber(value: unknown, category: string): string {
  if (typeof value !== 'string') throw new PpobError(400, 'Nomor tujuan wajib diisi.');
  const number = value.trim();
  if (!(category === 'PLN' ? /^\d{11,12}$/ : /^0\d{8,13}$/).test(number))
    throw new PpobError(400, category === 'PLN' ? 'ID pelanggan / nomor meter PLN harus 11–12 digit.' : 'Nomor HP harus 9–14 digit, diawali 0.');
  return number;
}
function viewOrder(order: any, admin = false) {
  return { id: order.id, reference: order.reference, sku: order.sku, product_name: order.product_name,
    customer_no: order.customer_no, amount: Number(order.amount), status: order.status,
    message: order.message, serial: order.serial, created_at: order.created_at, updated_at: order.updated_at,
    refunded_at: order.refunded_at, ...(admin ? { cost_price: Number(order.provider_price ?? order.cost_price), user_name: order.user_name } : {}) };
}
function viewProduct(p: any, config: any, admin = false) {
  const price = sellingPrice(p, config);
  return { sku: p.sku, name: p.name, category: p.category, brand: p.brand, description: p.description,
    sell_price: price, available: productAvailable(p, config),
    ...(admin ? { cost_price: Number(p.cost_price), enabled: p.enabled, provider_active: p.provider_active,
      fixed_price: p.fixed_price == null ? null : Number(p.fixed_price), markup: p.markup == null ? null : Number(p.markup),
      margin: price - Number(p.cost_price), synced_at: p.synced_at } : {}) };
}
export class PpobService {
  private timer?: ReturnType<typeof setInterval>;
  private working = false;
  constructor(private pool: Pool, public provider = new DigiflazzClient()) {}
  async config(db: Db = this.pool) {
    const { rows } = await db.query('SELECT * FROM ppob_config WHERE id=1');
    if (!rows[0]) throw new PpobError(503, 'Layanan PPOB belum siap.');
    const c = rows[0];
    return { ...c, default_markup: Number(c.default_markup), max_order: Number(c.max_order),
      daily_limit: Number(c.daily_limit), provider_balance: c.provider_balance == null ? null : Number(c.provider_balance),
      ...this.provider.readiness() };
  }
  private requireLive(config: any) {
    if (!config.configured) throw new PpobError(503, 'Integrasi Digiflazz belum lengkap. Saldo tidak dipotong.');
    if (!config.enabled || config.mode !== 'live') throw new PpobError(409, 'PPOB belum diaktifkan untuk transaksi nyata. Saldo tidak dipotong.');
    if (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'true')
      throw new PpobError(503, 'Transaksi nyata memerlukan HTTPS dan COOKIE_SECURE=true pada server.');
    if (process.env.NODE_ENV === 'production' &&
        (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || process.env.SESSION_SECRET.startsWith('GANTI_')))
      throw new PpobError(503, 'Transaksi nyata memerlukan SESSION_SECRET acak minimal 32 karakter.');
    if (!config.connection_checked_at || Date.now() - dateMs(config.connection_checked_at) > 24 * 60 * 60_000)
      throw new PpobError(503, 'Koneksi Digiflazz perlu diperiksa kembali oleh admin.');
    if (config.connection_account_hash !== this.provider.fingerprint() || config.catalog_account_hash !== this.provider.fingerprint())
      throw new PpobError(503, 'Periksa koneksi dan sinkronkan katalog untuk akun Digiflazz yang aktif.');
  }
  private publicConfig(c: any) {
    return { enabled: c.enabled, mode: c.mode, configured: c.configured, api_configured: c.api_configured,
      webhook_configured: c.webhook_configured, default_markup: c.default_markup, max_order: c.max_order,
      daily_limit: c.daily_limit, last_sync_at: c.last_sync_at, provider_balance: c.provider_balance,
      connection_checked_at: c.connection_checked_at };
  }
  async customer(userId: number) {
    const config = await this.config();
    const { rows } = await this.pool.query('SELECT balance,pin,status,role FROM users WHERE id=$1', [userId]);
    if (!rows[0] || rows[0].status !== 'active' || rows[0].role !== 'user') throw new PpobError(403, 'Akun pelanggan tidak aktif.');
    let reason: string | null = null;
    try { this.requireLive(config); } catch (error) { reason = (error as Error).message; }
    const products = await this.pool.query('SELECT * FROM ppob_products WHERE enabled=true ORDER BY category,brand,cost_price,sku');
    const orders = await this.pool.query('SELECT * FROM ppob_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [userId]);
    return { enabled: !reason, reason, mode: config.mode, balance: Number(rows[0].balance), has_pin: !!rows[0].pin,
      products: products.rows.map(p => viewProduct(p, config)), orders: orders.rows.map(o => viewOrder(o)) };
  }
  async admin() {
    const config = await this.config();
    const [products, orders, stats] = await Promise.all([
      this.pool.query('SELECT * FROM ppob_products ORDER BY category,brand,cost_price,sku'),
      this.pool.query('SELECT o.*,u.name AS user_name FROM ppob_orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 200'),
      this.pool.query(`SELECT count(*) AS total,
        count(*) FILTER(WHERE status='pending') AS pending, count(*) FILTER(WHERE status='success') AS success,
        count(*) FILTER(WHERE status='failed') AS failed, count(*) FILTER(WHERE status='review') AS review,
        COALESCE(sum(amount) FILTER(WHERE status='success'),0) AS revenue,
        COALESCE(sum(amount-COALESCE(provider_price,cost_price)) FILTER(WHERE status='success'),0) AS margin FROM ppob_orders`),
    ]);
    return { config: this.publicConfig(config), products: products.rows.map(p => viewProduct(p, config, true)),
      orders: orders.rows.map(o => viewOrder(o, true)),
      summary: Object.fromEntries(Object.entries(stats.rows[0]).map(([key, value]) => [key, asNumber(value)])) };
  }
  private async audit(db: Db, actor: number | null, action: string, entity: string | null = null) {
    // No API credentials, PIN, recipient number or provider raw payload in audit.
    await db.query('INSERT INTO ppob_audit(actor_id,action,entity_id) VALUES($1,$2,$3)', [actor, action, entity]);
  }
  async configure(actor: number, input: any) {
    if (!input || typeof input.enabled !== 'boolean' || !['test', 'live'].includes(input.mode))
      throw new PpobError(400, 'Konfigurasi layanan tidak valid.');
    const markup = rupiah(input.default_markup, 0, 1_000_000), max = rupiah(input.max_order, 1000),
      daily = rupiah(input.daily_limit, 1000, 20_000_000);
    if (daily < max) throw new PpobError(400, 'Batas harian tidak boleh lebih kecil dari batas per pesanan.');
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const c = await this.config(db);
      if (input.enabled && input.mode === 'live') {
        this.requireLive({ ...c, enabled: true, mode: 'live' });
        const admins = await db.query("SELECT password FROM users WHERE role IN ('admin','superadmin') AND status='active'");
        for (const u of admins.rows) await requireNonDefaultPpobPassword(u.password, true);
      }
      await db.query(`UPDATE ppob_config SET enabled=$1,mode=$2,default_markup=$3,max_order=$4,daily_limit=$5,updated_at=now() WHERE id=1`,
        [input.enabled, input.mode, markup, max, daily]);
      await this.audit(db, actor, 'config.updated');
      await db.query('COMMIT');
      return this.publicConfig(await this.config());
    } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
  }
  async checkConnection(actor: number | null) {
    const attempt = await this.pool.query(`UPDATE ppob_config SET last_connection_attempt_at=now()
      WHERE id=1 AND (last_connection_attempt_at IS NULL OR last_connection_attempt_at<now()-interval '1 minute') RETURNING id`);
    if (!attempt.rows.length) throw new PpobError(429, 'Tunggu satu menit sebelum memeriksa koneksi kembali.');
    const balance = await this.provider.balance();
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      await db.query('UPDATE ppob_config SET provider_balance=$1,connection_checked_at=now(),connection_account_hash=$2 WHERE id=1',
        [balance, this.provider.fingerprint()]);
      await this.audit(db, actor, 'provider.connection_checked');
      await db.query('COMMIT'); return { balance };
    } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
  }
  async sync(actor: number | null) {
    const attempt = await this.pool.query(`UPDATE ppob_config SET last_sync_attempt_at=now()
      WHERE id=1 AND (last_sync_attempt_at IS NULL OR last_sync_attempt_at<now()-interval '5 minutes') RETURNING id`);
    if (!attempt.rows.length) throw new PpobError(429, 'Digiflazz membatasi katalog penuh sekali per lima menit. Tunggu sebelum sinkronisasi kembali.');
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const locked = await db.query('SELECT pg_try_advisory_xact_lock(98234171) AS locked');
      if (!locked.rows[0].locked) throw new PpobError(409, 'Sinkronisasi katalog sedang berlangsung.');
      const c = await this.config(db);
      if (c.last_sync_at && Date.now() - dateMs(c.last_sync_at) < 5 * 60_000)
        throw new PpobError(429, 'Tunggu lima menit sebelum menyinkronkan kembali.');
      const products = await this.provider.products();
      if (!products.length) throw new PpobError(502, 'Tidak ada produk prabayar yang didukung. Katalog lama tidak diubah.');
      await db.query('UPDATE ppob_products SET provider_active=false');
      for (const p of products) {
        await db.query(`INSERT INTO ppob_products(sku,name,category,brand,description,cost_price,provider_active,unlimited_stock,stock,multi,cut_off_start,cut_off_end,synced_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now()) ON CONFLICT(sku) DO UPDATE SET
          category=EXCLUDED.category,brand=EXCLUDED.brand,cost_price=EXCLUDED.cost_price,provider_active=EXCLUDED.provider_active,
          unlimited_stock=EXCLUDED.unlimited_stock,stock=EXCLUDED.stock,multi=EXCLUDED.multi,
          cut_off_start=EXCLUDED.cut_off_start,cut_off_end=EXCLUDED.cut_off_end,synced_at=now()`,
          [p.sku,p.name,p.category,p.brand,p.description,p.cost,p.active,p.unlimited,p.stock,p.multi,p.start,p.end]);
      }
      await db.query('UPDATE ppob_config SET last_sync_at=now(),catalog_account_hash=$1 WHERE id=1', [this.provider.fingerprint()]);
      await this.audit(db, actor, 'catalog.synced');
      await db.query('COMMIT');
      return { count: products.length };
    } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
  }
  async editProduct(actor: number, sku: string, input: any) {
    if (!validSku(sku) || !input || !cleanText(input.name, 150) || typeof input.enabled !== 'boolean' ||
        typeof input.description !== 'string') throw new PpobError(400, 'Data produk tidak valid.');
    const fixed = input.fixed_price === null ? null : rupiah(input.fixed_price, 1),
      markup = input.markup === null ? null : rupiah(input.markup, 0, 1_000_000);
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const c = await this.config(db);
      const result = await db.query('SELECT * FROM ppob_products WHERE sku=$1 FOR UPDATE', [sku]);
      if (!result.rows[0]) throw new PpobError(404, 'Produk tidak ditemukan.');
      if (input.enabled && sellingPrice({ ...result.rows[0], fixed_price: fixed, markup }, c) < Number(result.rows[0].cost_price))
        throw new PpobError(400, 'Harga jual tidak boleh lebih rendah dari modal.');
      const updated = await db.query(`UPDATE ppob_products SET name=$2,description=$3,enabled=$4,fixed_price=$5,markup=$6 WHERE sku=$1 RETURNING *`,
        [sku, cleanText(input.name, 150), cleanText(input.description, 1000), input.enabled, fixed, markup]);
      await this.audit(db, actor, 'product.updated', sku);
      await db.query('COMMIT'); return viewProduct(updated.rows[0], c, true);
    } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
  }
  async quote(userId: number, sku: unknown, target: unknown) {
    if (!validSku(sku)) throw new PpobError(400, 'Produk tidak valid.');
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const user = await db.query('SELECT status,role,pin,password FROM users WHERE id=$1 FOR UPDATE', [userId]);
      if (!user.rows[0] || user.rows[0].status !== 'active' || user.rows[0].role !== 'user') throw new PpobError(403, 'Akun pelanggan tidak aktif.');
      if (!user.rows[0].pin) throw new PpobError(409, 'Atur PIN transaksi di Profil sebelum membeli PPOB.');
      await requireNonDefaultPpobPassword(user.rows[0].password, false);
      const c = await this.config(db); this.requireLive(c);
      const product = await db.query('SELECT * FROM ppob_products WHERE sku=$1 FOR SHARE', [sku]), p = product.rows[0];
      if (!p || !productAvailable(p, c)) throw new PpobError(409, 'Produk tidak tersedia, harga berubah, atau katalog perlu disinkronkan.');
      const targetNo = customerNumber(target, p.category);
      const count = await db.query("SELECT count(*) FROM ppob_quotes WHERE user_id=$1 AND created_at>now()-interval '1 hour'", [userId]);
      if (Number(count.rows[0].count) >= 60) throw new PpobError(429, 'Batas konfirmasi produk tercapai. Coba kembali nanti.');
      const id = crypto.randomUUID(), price = sellingPrice(p, c), expires = new Date(Date.now() + 120_000).toISOString();
      await db.query(`INSERT INTO ppob_quotes(id,user_id,sku,product_name,customer_no,cost_price,sell_price,expires_at,category)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id,userId,sku,p.name,targetNo,p.cost_price,price,expires,p.category]);
      await db.query('COMMIT');
      return { id, sku, product_name: p.name, customer_no: targetNo, price, expires_at: expires };
    } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
  }
  async purchase(userId: number, input: any) {
    if (!input || !validUuid(input.quote_id) || !validUuid(input.idempotency_key) ||
        typeof input.pin !== 'string' || !/^\d{6}$/.test(input.pin)) throw new PpobError(400, 'Konfirmasi pesanan dan PIN enam digit wajib diisi.');
    const db = await this.pool.connect();
    let committed = false;
    try {
      await db.query('BEGIN');
      // One account lock serializes daily quota, idempotency, PIN guard and wallet balance.
      const users = await db.query('SELECT balance,pin,password,status,role FROM users WHERE id=$1 FOR UPDATE', [userId]), user = users.rows[0];
      if (!user || user.status !== 'active' || user.role !== 'user') throw new PpobError(403, 'Akun pelanggan tidak aktif.');
      const prior = await db.query('SELECT * FROM ppob_orders WHERE user_id=$1 AND idempotency_key=$2', [userId, input.idempotency_key]);
      if (prior.rows[0]) {
        if (prior.rows[0].quote_id !== input.quote_id) throw new PpobError(409, 'Referensi percobaan sudah dipakai untuk pesanan lain.');
        await db.query('COMMIT'); committed = true; return viewOrder(prior.rows[0]);
      }
      if (!user.pin) throw new PpobError(409, 'PIN transaksi belum diatur.');
      await requireNonDefaultPpobPassword(user.password, false);
      const guards = await db.query('SELECT * FROM ppob_pin_guard WHERE user_id=$1', [userId]), guard = guards.rows[0];
      if (guard?.locked_until && dateMs(guard.locked_until) > Date.now()) throw new PpobError(429, 'PIN transaksi terkunci sementara. Tunggu 15 menit.');
      if (!(await bcrypt.compare(input.pin, user.pin))) {
        const fresh = guard && Date.now() - dateMs(guard.window_started_at) < PIN_WINDOW;
        const failures = fresh ? Number(guard.failures) + 1 : 1;
        await db.query(`INSERT INTO ppob_pin_guard(user_id,failures,window_started_at,locked_until) VALUES($1,$2,$3,$4)
          ON CONFLICT(user_id) DO UPDATE SET failures=EXCLUDED.failures,window_started_at=EXCLUDED.window_started_at,locked_until=EXCLUDED.locked_until`,
          [userId, failures, fresh ? guard.window_started_at : new Date(), failures >= 5 ? new Date(Date.now() + PIN_WINDOW) : null]);
        await this.audit(db, userId, 'purchase.pin_rejected');
        await db.query('COMMIT'); committed = true;
        throw new PpobError(failures >= 5 ? 429 : 403, failures >= 5 ? 'PIN transaksi terkunci selama 15 menit.' : 'PIN transaksi tidak sesuai.');
      }
      await db.query('DELETE FROM ppob_pin_guard WHERE user_id=$1', [userId]);
      const c = await this.config(db); this.requireLive(c);
      const quotes = await db.query('SELECT * FROM ppob_quotes WHERE id=$1 AND user_id=$2 FOR UPDATE', [input.quote_id, userId]), quote = quotes.rows[0];
      if (!quote || dateMs(quote.expires_at) <= Date.now()) throw new PpobError(409, 'Konfirmasi harga kedaluwarsa. Buat konfirmasi baru.');
      const used = await db.query('SELECT id FROM ppob_orders WHERE quote_id=$1', [quote.id]);
      if (used.rows.length) throw new PpobError(409, 'Konfirmasi ini sudah menjadi pesanan. Periksa riwayat.');
      const products = await db.query('SELECT * FROM ppob_products WHERE sku=$1 FOR SHARE', [quote.sku]), p = products.rows[0];
      if (!p || !productAvailable(p, c) || p.category !== quote.category || Number(p.cost_price) !== Number(quote.cost_price) ||
          sellingPrice(p, c) !== Number(quote.sell_price))
        throw new PpobError(409, 'Harga atau ketersediaan berubah. Saldo belum dipotong; konfirmasikan harga terbaru.');
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))', [quote.sku, quote.customer_no]);
      const duplicate = await db.query(`SELECT 1 FROM ppob_orders WHERE sku=$1 AND customer_no=$2 AND
        (status IN ('pending','review') OR ($3=false AND status='success' AND created_at>=
          (date_trunc('day',now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta'))) LIMIT 1`,
        [quote.sku, quote.customer_no, p.multi]);
      if (duplicate.rows.length) throw new PpobError(409, 'Tujuan dan produk ini masih diproses atau sudah dibeli pada batas harian pemasok.');
      const daily = await db.query(`SELECT COALESCE(sum(amount),0) AS total FROM ppob_orders WHERE user_id=$1 AND status<>'failed'
        AND created_at>=(date_trunc('day',now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta')`, [userId]);
      const amount = Number(quote.sell_price);
      if (Number(daily.rows[0].total) + amount > c.daily_limit) throw new PpobError(409, 'Batas belanja PPOB harian akun tercapai.');
      const debit = await db.query('UPDATE users SET balance=balance-$2 WHERE id=$1 AND balance>=$2 RETURNING balance', [userId, amount]);
      if (!debit.rows.length) throw new PpobError(409, 'Saldo tidak mencukupi.');
      const id = crypto.randomUUID(), reference = `ANP${id.replace(/-/g, '')}`;
      const order = await db.query(`INSERT INTO ppob_orders(id,reference,quote_id,user_id,sku,product_name,customer_no,cost_price,amount,idempotency_key,account_hash,category)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [id,reference,quote.id,userId,quote.sku,quote.product_name,quote.customer_no,quote.cost_price,amount,input.idempotency_key,this.provider.fingerprint(),quote.category]);
      await db.query("INSERT INTO ppob_wallet_entries(order_id,user_id,kind,amount,balance_after) VALUES($1,$2,'debit',$3,$4)",
        [id,userId,amount,debit.rows[0].balance]);
      await this.audit(db, userId, 'purchase.reserved', id);
      await db.query('COMMIT'); committed = true;
      // Only the committed outbox worker can call the supplier.
      return viewOrder(order.rows[0]);
    } catch (error) { if (!committed) await db.query('ROLLBACK'); throw error; } finally { db.release(); }
  }
  async order(userId: number, id: string) {
    if (!validUuid(id)) throw new PpobError(404, 'Pesanan tidak ditemukan.');
    const { rows } = await this.pool.query('SELECT * FROM ppob_orders WHERE id=$1 AND user_id=$2', [id, userId]);
    if (!rows[0]) throw new PpobError(404, 'Pesanan tidak ditemukan.');
    return viewOrder(rows[0]);
  }
  async recover(userId: number, key: string, quoteId: unknown) {
    if (!validUuid(key) || !validUuid(quoteId)) throw new PpobError(400, 'Referensi pemulihan tidak valid.');
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      // Waits for a concurrent purchase's account lock before declaring anything absent.
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const existing = await db.query('SELECT * FROM ppob_orders WHERE user_id=$1 AND idempotency_key=$2', [userId, key]);
      if (existing.rows[0] && existing.rows[0].quote_id !== quoteId) throw new PpobError(409, 'Referensi pemulihan tidak cocok.');
      const quote = await db.query('SELECT expires_at<=now() AS expired FROM ppob_quotes WHERE id=$1 AND user_id=$2', [quoteId, userId]);
      await db.query('COMMIT');
      return { order: existing.rows[0] ? viewOrder(existing.rows[0]) : null,
        quote_expired: !quote.rows[0] || quote.rows[0].expired === true };
    } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
  }
  async recheck(actor: number, id: string) {
    if (!validUuid(id)) throw new PpobError(404, 'Pesanan tidak ditemukan.');
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const row = await db.query("UPDATE ppob_orders SET next_check_at=now() WHERE id=$1 AND status IN ('pending','review') RETURNING id", [id]);
      if (!row.rows.length) throw new PpobError(409, 'Pesanan sudah final atau tidak ditemukan.');
      await this.audit(db, actor, 'order.recheck_requested', id);
      await db.query('COMMIT'); return { queued: true };
    } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
  }
  async webhook(raw: Buffer, signature: unknown) {
    if (!this.provider.validWebhook(raw, signature)) throw new PpobError(401, 'Signature callback tidak valid.');
    let json: any;
    try { json = JSON.parse(raw.toString('utf8')); } catch { throw new PpobError(400, 'Payload callback tidak valid.'); }
    const data = json?.data;
    if (!data) return; // Signed ping event; never log its hook.secret.
    if (typeof data.ref_id !== 'string' || !validSku(data.buyer_sku_code) || typeof data.customer_no !== 'string')
      throw new PpobError(400, 'Identitas callback tidak lengkap.');
    // Even a signed payload cannot debit/refund/fulfil: it only wakes API reconciliation.
    await this.pool.query(`UPDATE ppob_orders SET next_check_at=now() WHERE reference=$1 AND sku=$2 AND customer_no=$3
      AND status IN ('pending','review')`, [data.ref_id, data.buyer_sku_code, data.customer_no]);
  }
  async reconcileOne(): Promise<boolean> {
    const db = await this.pool.connect();
    let order: any;
    try {
      await db.query('BEGIN');
      const result = await db.query(`SELECT * FROM ppob_orders WHERE status IN ('pending','review')
        AND next_check_at<=now() AND (lease_until IS NULL OR lease_until<now())
        ORDER BY next_check_at FOR UPDATE SKIP LOCKED LIMIT 1`);
      order = result.rows[0];
      if (!order) { await db.query('COMMIT'); return false; }
      await db.query("UPDATE ppob_orders SET lease_until=now()+interval '90 seconds',attempts=attempts+1 WHERE id=$1", [order.id]);
      await db.query('COMMIT');
    } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
    let result: ProviderResult | null = null;
    const accountUnavailable = !this.provider.readiness().configured || order.account_hash !== this.provider.fingerprint();
    try {
      if (accountUnavailable) throw new Error('Account unavailable');
      result = await this.provider.transaction({ ...order, cost_price: Number(order.cost_price) });
    } catch { /* Ambiguous transport/API failures retain funds and immutable reference. */ }
    await this.applyResult(order.id, result, accountUnavailable);
    return true;
  }
  private async applyResult(id: string, result: ProviderResult | null, accountUnavailable = false) {
    const db = await this.pool.connect();
    let finalUser: number | null = null, finalStatus = '', reference = '';
    try {
      await db.query('BEGIN');
      const locked = await db.query('SELECT * FROM ppob_orders WHERE id=$1 FOR UPDATE', [id]), order = locked.rows[0];
      if (!order || !['pending', 'review'].includes(order.status)) { await db.query('COMMIT'); return; }
      const matches = result && result.reference === order.reference && result.sku === order.sku && result.customer === order.customer_no;
      const safePrice = result && result.price <= Number(order.cost_price) && result.price <= Number(order.amount);
      const missingToken = matches && result!.status === 'Sukses' && order.category === 'PLN' && !result!.serial;
      const definiteFailure = !!result && definiteProviderFailure(result, Number(order.attempts));
      if (matches && safePrice && result!.status === 'Sukses' && result!.price > 0 && !missingToken) {
        await db.query(`UPDATE ppob_orders SET status='success',message='Produk berhasil diproses Digiflazz.',serial=$2,
          provider_price=$3,response_code=$4,lease_until=NULL,updated_at=now() WHERE id=$1`, [id,result!.serial || null,result!.price,result!.rc]);
        finalUser = order.user_id; finalStatus = 'success'; reference = order.reference;
        await this.audit(db, null, 'order.succeeded', id);
      } else if (matches && safePrice && definiteFailure) {
        // Final failure from authenticated API only; order lock + unique ledger make refunds once-only.
        const refund = await db.query('UPDATE users SET balance=balance+$2 WHERE id=$1 RETURNING balance', [order.user_id, order.amount]);
        if (!refund.rows.length) throw new Error('Refund account unavailable');
        await db.query("INSERT INTO ppob_wallet_entries(order_id,user_id,kind,amount,balance_after) VALUES($1,$2,'refund',$3,$4)",
          [id,order.user_id,order.amount,refund.rows[0].balance]);
        await db.query(`UPDATE ppob_orders SET status='failed',message='Transaksi gagal final. Saldo telah dikembalikan.',
          refunded_at=now(),response_code=$2,lease_until=NULL,updated_at=now() WHERE id=$1`, [id,result!.rc]);
        finalUser = order.user_id; finalStatus = 'failed'; reference = order.reference;
        await this.audit(db, null, 'order.refunded', id);
      } else {
        const inconsistent = result && (!matches || !safePrice);
        const unverifiedFailure = result?.status === 'Gagal' && !definiteFailure;
        const review = accountUnavailable || inconsistent || missingToken || unverifiedFailure ||
          Date.now() - dateMs(order.created_at) > 24 * 60 * 60_000 || order.status === 'review';
        const delay = Math.min(300, 15 * 2 ** Math.min(Number(order.attempts), 5));
        await db.query(`UPDATE ppob_orders SET status=$2,message=$3,lease_until=NULL,next_check_at=now()+($4*interval '1 second'),
          updated_at=now() WHERE id=$1`, [id,review ? 'review' : 'pending',
          review ? 'Perlu pemeriksaan admin. Saldo ditahan sampai hasil pemasok terverifikasi.' :
            'Masih diproses. Jangan membeli ulang; status akan diperiksa otomatis.', delay]);
        if (inconsistent) await this.audit(db, null, 'order.provider_mismatch', id);
      }
      await db.query('COMMIT');
    } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
    // Notification failure cannot undo money movement or report a purchase failure.
    if (finalUser) {
      try {
        await this.pool.query(`INSERT INTO notifications(user_id,title,body,type) VALUES($1,$2,$3,'purchase')`,
          [finalUser, finalStatus === 'success' ? 'Pembelian PPOB berhasil' : 'Saldo PPOB dikembalikan',
            `${reference}: ${finalStatus === 'success' ? 'produk berhasil diproses.' : 'transaksi gagal final; pengembalian saldo selesai.'}`]);
      } catch { console.warn('[PPOB] Notifikasi tertunda; hasil transaksi tetap final.'); }
    }
  }
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.tick(); }, 5000);
    this.timer.unref();
    void this.tick();
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  async tick() {
    if (this.working) return;
    this.working = true;
    try {
      for (let i = 0; i < 10; i++) if (!(await this.reconcileOne())) break;
      const c = await this.config();
      if (c.enabled && this.provider.readiness().api_configured &&
          (!c.last_sync_attempt_at || Date.now() - dateMs(c.last_sync_attempt_at) > 5 * 60_000) &&
          (!c.last_sync_at || Date.now() - dateMs(c.last_sync_at) > 15 * 60_000)) {
        try { await this.syncSystem(); } catch { console.warn('[PPOB] Sinkronisasi belum selesai; katalog kedaluwarsa tetap diblokir.'); }
      }
      if (c.enabled && this.provider.readiness().api_configured &&
          (!c.last_connection_attempt_at || Date.now() - dateMs(c.last_connection_attempt_at) > 5 * 60_000) &&
          (!c.connection_checked_at || Date.now() - dateMs(c.connection_checked_at) > 6 * 60 * 60_000)) {
        // Deposit is a read-only health check, not a customer balance.
        try {
          await this.checkConnection(null);
        } catch { /* Stale connectivity eventually locks new purchases; committed orders still reconcile. */ }
      }
    } catch { console.warn('[PPOB] Pemeriksaan tertunda; antrean tersimpan di database.'); }
    finally { this.working = false; }
  }
  private async syncSystem() {
    // System actor has no identity; do not forge an admin id.
    await this.sync(null);
  }
}