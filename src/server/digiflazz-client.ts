import crypto from 'node:crypto';

export class PpobError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const validSku = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(value);
export const validUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export function rupiah(value: unknown, min = 0, max = 5_000_000): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    throw new PpobError(400, 'Nominal harus berupa rupiah bulat dalam batas yang diizinkan.');
  return value;
}
export const cleanText = (value: unknown, max = 300): string =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';

export type DigiflazzCredentials = { username?: string; apiKey?: string; webhookSecret?: string };
export type ProviderProduct = {
  sku: string; name: string; category: string; brand: string; description: string; cost: number;
  active: boolean; unlimited: boolean; stock: number; multi: boolean; start: string; end: string;
};
export type ProviderResult = {
  reference: string; sku: string; customer: string; status: 'Sukses' | 'Pending' | 'Gagal';
  rc: string; price: number; serial: string;
};
// Official response-code table distinguishes failed TRANSACTIONS from rejected REQUESTS.
// A rejected status check cannot prove an earlier ambiguous purchase did not succeed.
const FINAL_TRANSACTION_FAILURES = new Set(['01','02','51','52','53','54','55','57','58','59','60','70','71','72','73','74','84']);
const INITIAL_REQUEST_REJECTIONS = new Set(['40','41','42','43','44','45','47','56','61','62','63','64','65','66','67','68','69','80','81','82','87','88']);
export function definiteProviderFailure(result: ProviderResult, attempts: number): boolean {
  return result.status === 'Gagal' && (FINAL_TRANSACTION_FAILURES.has(result.rc) ||
    (attempts === 1 && INITIAL_REQUEST_REJECTIONS.has(result.rc)));
}
export function normalizeProduct(raw: any): ProviderProduct | null {
  if (!['Pulsa', 'Data', 'PLN'].includes(raw?.category)) return null;
  const cost = Number(raw.price);
  if (!validSku(raw.buyer_sku_code) || !Number.isSafeInteger(cost) || cost <= 0 || cost > 5_000_000 ||
      typeof raw.buyer_product_status !== 'boolean' || typeof raw.seller_product_status !== 'boolean' ||
      typeof raw.unlimited_stock !== 'boolean' || typeof raw.multi !== 'boolean')
    throw new PpobError(502, 'Format katalog Digiflazz tidak valid. Katalog lama tidak diubah.');
  const stock = Number(raw.stock);
  if (!Number.isSafeInteger(stock) || stock < 0 || stock > 2_147_483_647)
    throw new PpobError(502, 'Format stok Digiflazz tidak valid.');
  const time = (v: unknown) => typeof v === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null;
  const start = time(raw.start_cut_off), end = time(raw.end_cut_off);
  if (!start || !end || !cleanText(raw.product_name, 150))
    throw new PpobError(502, 'Format produk Digiflazz tidak valid.');
  return { sku: raw.buyer_sku_code, name: cleanText(raw.product_name, 150), category: raw.category,
    brand: cleanText(raw.brand, 80), description: cleanText(raw.desc, 1000), cost,
    active: raw.buyer_product_status && raw.seller_product_status,
    unlimited: raw.unlimited_stock, stock, multi: raw.multi, start, end };
}
export function normalizeResult(raw: any): ProviderResult {
  const price = Number(raw?.price);
  if (typeof raw?.ref_id !== 'string' || !validSku(raw.buyer_sku_code) ||
      typeof raw.customer_no !== 'string' || !/^\d{8,15}$/.test(raw.customer_no) ||
      !['Sukses', 'Pending', 'Gagal'].includes(raw.status) || !/^\d{2}$/.test(raw.rc) ||
      !Number.isSafeInteger(price) || price < 0 || price > 5_000_000)
    throw new PpobError(502, 'Status pemasok belum dapat diverifikasi.');
  if ((raw.status === 'Sukses' && raw.rc !== '00') || (raw.status === 'Gagal' && ['00', '03'].includes(raw.rc)))
    throw new PpobError(502, 'Status pemasok tidak konsisten.');
  return { reference: raw.ref_id, sku: raw.buyer_sku_code, customer: raw.customer_no,
    status: raw.status, rc: raw.rc, price, serial: cleanText(raw.sn, 2000) };
}
export class DigiflazzClient {
  constructor(private credentials: () => DigiflazzCredentials = () => ({
    username: process.env.DIGIFLAZZ_USERNAME, apiKey: process.env.DIGIFLAZZ_API_KEY,
    webhookSecret: process.env.DIGIFLAZZ_WEBHOOK_SECRET,
  }), private fetcher: typeof fetch = fetch) {}
  readiness() {
    const c = this.credentials();
    const api = !!c.username?.trim() && !!c.apiKey && c.apiKey.length >= 16;
    const webhook = !!c.webhookSecret && c.webhookSecret.length >= 32;
    return { api_configured: api, webhook_configured: webhook, configured: api && webhook };
  }
  fingerprint() {
    const c = this.credentials();
    return crypto.createHash('sha256').update(`${c.username}\0${c.apiKey}`).digest('hex');
  }
  private async call(path: 'price-list' | 'transaction' | 'cek-saldo', suffix: string, input: Record<string, unknown>) {
    if (!this.readiness().api_configured) throw new PpobError(503, 'Kredensial Buyer API Digiflazz belum terpasang di server.');
    const c = this.credentials();
    const sign = crypto.createHash('md5').update(c.username!.trim() + c.apiKey! + suffix).digest('hex');
    let response: Response;
    try {
      response = await this.fetcher(`https://api.digiflazz.com/v1/${path}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username: c.username!.trim(), sign, ...input }),
      });
    } catch { throw new PpobError(503, 'Koneksi Digiflazz belum dapat dipastikan. Pesanan tidak dianggap gagal.'); }
    if (!response.ok || !response.body) throw new PpobError(502, 'Digiflazz belum memberikan respons yang dapat diverifikasi.');
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    let length = 0;
    const limit = path === 'price-list' ? 8 * 1024 * 1024 : 128 * 1024;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        length += part.value.byteLength;
        if (length > limit) { await reader.cancel(); throw new Error('oversize'); }
        chunks.push(part.value);
      }
      const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!json || json.data == null) throw new Error('missing data');
      return json.data;
    } catch { throw new PpobError(502, 'Format respons Digiflazz belum dapat diverifikasi.'); }
  }
  async products(): Promise<ProviderProduct[]> {
    const data = await this.call('price-list', 'pricelist', { cmd: 'prepaid' });
    if (!Array.isArray(data) || data.length > 20000) throw new PpobError(502, 'Katalog Digiflazz tidak valid.');
    const products = data.map(normalizeProduct).filter((p): p is ProviderProduct => !!p);
    if (new Set(products.map(p => p.sku)).size !== products.length)
      throw new PpobError(502, 'Kode produk katalog tidak unik.');
    return products;
  }
  async balance(): Promise<number> {
    const data = await this.call('cek-saldo', 'depo', { cmd: 'deposit' });
    const amount = Number(data.deposit);
    if (!Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER)
      throw new PpobError(502, 'Deposit Digiflazz belum dapat diverifikasi.');
    return amount;
  }
  async transaction(order: { reference: string; sku: string; customer_no: string; cost_price: number }): Promise<ProviderResult> {
    // Official status checking repeats the SAME immutable reference, not a new purchase.
    return normalizeResult(await this.call('transaction', order.reference, {
      buyer_sku_code: order.sku, customer_no: order.customer_no, ref_id: order.reference,
      max_price: Number(order.cost_price), testing: false,
    }));
  }
  validWebhook(body: Buffer, signature: unknown): boolean {
    const c = this.credentials();
    if (!this.readiness().webhook_configured || typeof signature !== 'string' ||
        !/^sha1=[a-f0-9]{40}$/i.test(signature)) return false;
    const expected = crypto.createHmac('sha1', c.webhookSecret!).update(body).digest();
    const received = Buffer.from(signature.slice(5), 'hex');
    return received.length === expected.length && crypto.timingSafeEqual(received, expected);
  }
}