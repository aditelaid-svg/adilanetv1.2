import crypto from "node:crypto";
import QRCode from "qrcode";

export type QiospayConfig = { merchantCode: string; apiKey: string; qrString: string; callbackToken: string };
export type Credit = { key: string; amount: number; paidAt: Date; providerRef: string };
export class PaymentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function readQiospayConfig(s: Record<string, string>): QiospayConfig {
  const config = {
    merchantCode: (s.qiospayMerchantCode || "").trim(),
    apiKey: (s.qiospayApiKey || "").trim(),
    qrString: (s.qiospayQrString || "").trim(),
    callbackToken: s.qiospayCallbackToken || "",
  };
  if (!config.merchantCode || !config.apiKey || !config.qrString || !config.callbackToken) {
    throw new PaymentError("Qiospay belum lengkap. Isi Merchant Code, API Key baru, dan String QR di Setelan.", 503);
  }
  validateStaticQr(config.qrString);
  return config;
}

export function crc16(value: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(value, "utf8")) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).padStart(4, "0").toUpperCase();
}

export function validateStaticQr(value: string): void {
  const invalid = () => new PaymentError("String QR harus berupa QRIS statis IDR lengkap dengan checksum yang valid, bukan gambar atau potongan teks.");
  if (value.length < 40 || value.length > 4096 || !/^[\x20-\x7e]+$/.test(value)) throw invalid();
  const tags = new Map<string, string>();
  let pos = 0;
  while (pos < value.length) {
    const header = value.slice(pos, pos + 4);
    if (!/^\d{4}$/.test(header)) throw invalid();
    const tag = header.slice(0, 2);
    const length = Number(header.slice(2));
    if (!length || pos + 4 + length > value.length || tags.has(tag)) throw invalid();
    tags.set(tag, value.slice(pos + 4, pos + 4 + length));
    pos += 4 + length;
    if (tag === "63" && pos !== value.length) throw invalid();
  }
  if (tags.get("00") !== "01" || tags.get("53") !== "360" || tags.get("58") !== "ID" ||
      (tags.has("01") && tags.get("01") !== "11") || tags.has("54") ||
      !/6304[0-9A-Fa-f]{4}$/.test(value) || crc16(value.slice(0, -4)) !== value.slice(-4).toUpperCase()) throw invalid();
}

export async function renderQr(qrString: string): Promise<string> {
  validateStaticQr(qrString);
  return QRCode.toDataURL(qrString, { width: 300, margin: 4, errorCorrectionLevel: "M" });
}

export function validCallbackToken(given: unknown, expected: string): boolean {
  if (typeof given !== "string" || expected.length < 32 || given.length !== expected.length) return false;
  const candidate = Buffer.from(given);
  const target = Buffer.from(expected);
  return candidate.length === target.length && crypto.timingSafeEqual(candidate, target);
}

// Mutasi dates are documented in Asia/Jakarta, not the server's timezone.
export function parseMutationDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!parts) return null;
  const [, y, mo, d, h, mi, sec] = parts.map(Number);
  const local = new Date(Date.UTC(y, mo - 1, d, h, mi, sec));
  if (local.getUTCFullYear() !== y || local.getUTCMonth() !== mo - 1 || local.getUTCDate() !== d ||
      local.getUTCHours() !== h || local.getUTCMinutes() !== mi || local.getUTCSeconds() !== sec) return null;
  return new Date(local.getTime() - 7 * 3600_000);
}

export function normalizeCredits(merchantCode: string, rows: unknown): Credit[] {
  if (!Array.isArray(rows)) throw new PaymentError("Format mutasi Qiospay tidak sesuai dokumentasi.", 502);
  return rows.flatMap((row: any) => {
    if (!row || row.type !== "CR") return [];
    const amount = typeof row.amount === "number" ? row.amount : /^\d+$/.test(row.amount || "") ? Number(row.amount) : NaN;
    const paidAt = parseMutationDate(row.date);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 99_999_999 || !paidAt) {
      throw new PaymentError("Mutasi kredit Qiospay memiliki nominal atau tanggal tidak valid. Perlu pemeriksaan admin.", 502);
    }
    // Prefer stable acquirer/issuer references. Old documented responses omit
    // them, so use the ledger timestamp + amount + brand + balance fingerprint.
    const issuer = String(row.issuer_reff || "");
    const buyer = String(row.buyer_reff || "");
    if (!issuer && !buyer && (row.balance === undefined || row.balance === null)) {
      throw new PaymentError("Mutasi Qiospay tidak memiliki referensi atau saldo untuk deduplikasi yang aman.", 502);
    }
    if (!issuer && !buyer && !Number.isFinite(Number(row.balance))) {
      throw new PaymentError("Saldo mutasi Qiospay tidak valid untuk deduplikasi yang aman.", 502);
    }
    const identity = issuer || buyer
      ? ["refs", issuer, buyer]
      : ["ledger", row.date, amount, String(row.brand_name || ""), String(Number(row.balance))];
    const key = crypto.createHash("sha256").update(JSON.stringify([merchantCode, ...identity])).digest("hex");
    return [{ key, amount, paidAt, providerRef: issuer || buyer || `mutasi:${key.slice(0, 16)}` }];
  });
}

export async function fetchCredits(config: QiospayConfig, fetcher: typeof fetch = fetch): Promise<Credit[]> {
  // API keys are required in the URL by Qiospay. Keep requests server-side;
  // never expose URLs, provider errors, or key-bearing exceptions in logs/UI.
  let response: globalThis.Response;
  try {
    response = await fetcher(`https://qiospay.id/api/mutasi/qris/${encodeURIComponent(config.merchantCode)}/${encodeURIComponent(config.apiKey)}`, {
      headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000), redirect: "error",
    });
  } catch {
    throw new PaymentError("Tidak dapat menghubungi Qiospay. Periksa koneksi dan API Key di Setelan.", 502);
  }
  let body: any;
  try { body = await response.json(); } catch {
    throw new PaymentError(`Qiospay mengirim respons bukan JSON (HTTP ${response.status}). Periksa akses API akun Qiospay.`, 502);
  }
  if (!response.ok || body?.status !== "success") {
    const message = typeof body?.messages === "string" ? body.messages :
      typeof body?.message === "string" ? body.message : "";
    const noMutationData = /\b(?:data|mutasi|transaksi)\b.*\b(?:not found|not exist|tidak ditemukan|belum ada|kosong)\b|\b(?:no|tidak ada)\b.*\b(?:data|mutasi|transaksi)\b/i.test(message);
    const mentionsCredentials = /api.?key|apikey|merchant|credential|token|unauthori|forbidden/i.test(message);
    // An undocumented empty-ledger error is NOT proof of authentication or
    // payment. Only change the safe message; never return credits for it.
    if (response.status === 200 && body?.status === "error" && noMutationData && !mentionsCredentials &&
        (body.data == null || (Array.isArray(body.data) && body.data.length === 0))) {
      throw new PaymentError("Mutasi Qiospay belum tersedia. Qiospay melaporkan data mutasi tidak ditemukan; belum ada pembayaran yang dapat diverifikasi.", 502);
    }
    throw new PaymentError(`Qiospay menolak permintaan mutasi (HTTP ${response.status}). Periksa Merchant Code dan API Key.`, 502);
  }
  return normalizeCredits(config.merchantCode, body.data);
}