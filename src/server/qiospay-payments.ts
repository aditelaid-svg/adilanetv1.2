import crypto from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { fetchCredits, PaymentError, readQiospayConfig, renderQr, type Credit } from "./qiospay-client";

type Settings = () => Promise<Record<string, string>>;
type Fulfill = (invoice: any, code: string) => Promise<void>;
const TTL_SECONDS = 600;
const LOCK_NAMESPACE = 724381;

export class QiospayPayments {
  private wakeBusy = false;
  private lastWake = 0;
  constructor(
    private pool: Pool,
    private settings: Settings,
    private generateCode: () => Promise<string>,
    private fulfill: Fulfill,
    private fetcher: typeof fetch = fetch,
  ) {}

  private async recordCredits(merchant: string, credits: Credit[], db: Pool | PoolClient = this.pool) {
    for (const c of credits) {
      await db.query(
        `INSERT INTO qiospay_events(event_key,merchant_code,amount,paid_at,provider_ref)
         VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_key) DO NOTHING`,
        [c.key, merchant, c.amount, c.paidAt, c.providerRef],
      );
      const { rows } = await db.query("SELECT amount,paid_at FROM qiospay_events WHERE event_key=$1", [c.key]);
      if (Number(rows[0].amount) !== c.amount || new Date(rows[0].paid_at).getTime() !== c.paidAt.getTime()) {
        throw new PaymentError("Referensi mutasi Qiospay berubah. Sinkronisasi dihentikan untuk pemeriksaan admin.", 502);
      }
    }
  }

  async create(pkg: any, amount: number, userId: number | null, phone: string | null) {
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 99_998_999) {
      throw new PaymentError("Harga paket Qiospay harus berupa rupiah bulat positif.");
    }
    if (!pkg.router_id || !pkg.mikrotik_profile) {
      throw new PaymentError("Paket belum memiliki router dan profil MikroTik. Konfigurasikan sebelum menerima pembayaran.", 409);
    }
    if (!userId && (!phone || !/^\+?\d{10,20}$/.test(phone))) {
      throw new PaymentError("Nomor HP pembeli wajib diisi dengan 10–20 digit.");
    }
    const config = readQiospayConfig(await this.settings());
    const qrUrl = await renderQr(config.qrString);
    // Check the real merchant ledger before charging. Old credits also reserve
    // their nominal, so they cannot retrospectively pay a newly-created order.
    const credits = await fetchCredits(config, this.fetcher);
    const db = await this.pool.connect();
    try {
      await db.query("BEGIN");
      await db.query("SELECT pg_advisory_xact_lock(hashtext('qiospay-config'))");
      const latest = await this.settings();
      if (latest.qrisEnabled === 'false' ||
          latest.qiospayMerchantCode !== config.merchantCode || latest.qiospayQrString !== config.qrString) {
        throw new PaymentError("Konfigurasi QRIS berubah. Muat ulang halaman sebelum melanjutkan.", 409);
      }
      await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`qiospay-allocate:${config.merchantCode}`]);
      await this.recordCredits(config.merchantCode, credits, db);
      const { rows: prior } = await db.query(
        `SELECT i.* FROM qiospay_invoices i JOIN transactions t ON t.id=i.transaction_id
         WHERE i.merchant_code=$1 AND t.package_id=$2 AND t.user_id IS NOT DISTINCT FROM $3
         AND t.phone IS NOT DISTINCT FROM $4 AND i.base_amount=$5 AND t.status='pending'
         AND i.expires_at>NOW() ORDER BY i.created_at DESC LIMIT 1`,
        [config.merchantCode, pkg.id, userId, phone, amount],
      );
      let invoice = prior[0];
      if (!invoice) {
        const { rows: limits } = await db.query(
          `SELECT COUNT(*)::int AS count FROM qiospay_invoices i JOIN transactions t ON t.id=i.transaction_id
           WHERE i.merchant_code=$1 AND t.user_id IS NOT DISTINCT FROM $2 AND t.phone IS NOT DISTINCT FROM $3
           AND t.status IN ('pending','paid','provisioning') AND i.expires_at>NOW()`,
          [config.merchantCode, userId, phone],
        );
        if (limits[0].count >= 3) throw new PaymentError("Masih ada transaksi QRIS yang belum selesai. Selesaikan dahulu.", 429);
        const { rows: available } = await db.query(
          `SELECT code FROM generate_series(1,999) code
           WHERE NOT EXISTS (SELECT 1 FROM qiospay_invoices WHERE merchant_code=$1 AND total_amount=$2+code)
             AND NOT EXISTS (SELECT 1 FROM qiospay_events WHERE merchant_code=$1 AND amount=$2+code)
           ORDER BY random() LIMIT 1`,
          [config.merchantCode, amount],
        );
        if (!available.length) {
          throw new PaymentError("Nominal unik untuk harga ini sudah habis. QRIS statis tidak bisa membatalkan instruksi lama; hubungi admin dan gunakan pembayaran saldo.", 409);
        }
        const code = Number(available[0].code);
        const ref = `QPAY-${crypto.randomBytes(16).toString("hex")}`;
        const { rows: tx } = await db.query(
          `INSERT INTO transactions(user_id,package_id,amount,payment_method,status,reference_id,phone)
           VALUES($1,$2,$3,'qris','pending',$4,$5) RETURNING id`,
          [userId, pkg.id, amount + code, ref, phone],
        );
        const { rows } = await db.query(
          `INSERT INTO qiospay_invoices(transaction_id,reference_id,merchant_code,base_amount,unique_code,
           total_amount,expires_at,router_id,mikrotik_profile)
           VALUES($1,$2,$3,$4,$5,$6,NOW()+($7 * INTERVAL '1 second'),$8,$9) RETURNING *`,
          [tx[0].id, ref, config.merchantCode, amount, code, amount + code, TTL_SECONDS, pkg.router_id, pkg.mikrotik_profile],
        );
        invoice = rows[0];
      }
      await db.query("COMMIT");
      return {
        provider: "qiospay", reference_id: invoice.reference_id, qr_url: qrUrl,
        amount: invoice.total_amount, base_amount: invoice.base_amount, unique_code: invoice.unique_code,
        expires_at: invoice.expires_at, status: "pending",
      };
    } catch (e) {
      await db.query("ROLLBACK");
      throw e;
    } finally { db.release(); }
  }

  async expire() {
    await this.pool.query(
      `UPDATE transactions t SET status='expired' FROM qiospay_invoices i
       WHERE t.id=i.transaction_id AND t.status='pending' AND i.expires_at<=NOW()`,
    );
  }

  private async matchCredits(merchant: string, db: PoolClient) {
    await db.query("BEGIN");
    try {
      const { rows } = await db.query(
        `SELECT e.event_key AS credit_key,e.amount,e.paid_at,i.*,t.status
         FROM qiospay_events e JOIN qiospay_invoices i
           ON i.merchant_code=e.merchant_code AND i.total_amount=e.amount
         JOIN transactions t ON t.id=i.transaction_id
         WHERE e.merchant_code=$1 AND e.status='unmatched'
         ORDER BY e.paid_at,e.event_key FOR UPDATE OF e,i,t`,
        [merchant],
      );
      for (const row of rows) {
        // Re-read after each iteration: several events may target the same invoice.
        const { rows: current } = await db.query("SELECT event_key FROM qiospay_invoices WHERE transaction_id=$1", [row.transaction_id]);
        const paidAt = new Date(row.paid_at).getTime();
        const eligible = paidAt >= new Date(row.created_at).getTime() && paidAt <= new Date(row.expires_at).getTime();
        if (!eligible || current[0].event_key) {
          const reason = current[0].event_key
            ? "Ada pembayaran tambahan untuk nominal yang sudah dipakai. Periksa/refund secara manual."
            : "Dana masuk di luar waktu invoice. Perlu pemeriksaan/refund manual; voucher tidak diterbitkan otomatis.";
          await db.query("UPDATE qiospay_events SET status='review',reference_id=$2,error=$3 WHERE event_key=$1", [row.credit_key, row.reference_id, reason]);
          if (!current[0].event_key && paidAt > new Date(row.expires_at).getTime()) {
            await db.query("UPDATE transactions SET status='review' WHERE id=$1 AND status IN ('pending','expired')", [row.transaction_id]);
          }
          continue;
        }
        if (!["pending", "expired", "review"].includes(row.status)) continue;
        // Amount, timestamp and merchant ledger must all match. The callback
        // body itself is never used as proof that money arrived.
        await db.query("UPDATE qiospay_invoices SET event_key=$2,last_error=NULL WHERE transaction_id=$1", [row.transaction_id, row.credit_key]);
        await db.query("UPDATE transactions SET status='paid' WHERE id=$1", [row.transaction_id]);
        await db.query("UPDATE qiospay_events SET status='matched',reference_id=$2 WHERE event_key=$1", [row.credit_key, row.reference_id]);
      }
      await db.query("COMMIT");
    } catch (e) { await db.query("ROLLBACK"); throw e; }
  }

  async provision(reference: string, manual = false) {
    const db = await this.pool.connect();
    let lockedId: number | undefined;
    try {
      const { rows: ids } = await db.query("SELECT transaction_id FROM qiospay_invoices WHERE reference_id=$1", [reference]);
      if (!ids.length) throw new PaymentError("Transaksi Qiospay tidak ditemukan.", 404);
      const id = ids[0].transaction_id;
      const { rows: locks } = await db.query("SELECT pg_try_advisory_lock($1,$2) AS locked", [LOCK_NAMESPACE, id]);
      if (!locks[0].locked) return;
      lockedId = id;
      const { rows } = await db.query(
        `SELECT i.*,t.user_id,t.phone,t.status,u.name AS user_name
         FROM qiospay_invoices i JOIN transactions t ON t.id=i.transaction_id
         LEFT JOIN users u ON u.id=t.user_id WHERE i.transaction_id=$1`,
        [id],
      );
      const invoice = rows[0];
      if (!invoice.event_key || !["paid", "provisioning"].includes(invoice.status)) {
        if (manual && invoice.status !== "success") throw new PaymentError("Dana belum terverifikasi dari mutasi; voucher tidak boleh dipaksa dibuat.", 409);
        return;
      }
      if (!manual && invoice.next_attempt_at && new Date(invoice.next_attempt_at).getTime() > Date.now()) return;
      let code = invoice.voucher_candidate;
      if (!code) {
        code = await this.generateCode();
        await db.query("UPDATE qiospay_invoices SET voucher_candidate=$2 WHERE transaction_id=$1", [id, code]);
      }
      await db.query("UPDATE qiospay_invoices SET claim_started_at=NOW(),attempts=attempts+1 WHERE transaction_id=$1", [id]);
      await db.query("UPDATE transactions SET status='provisioning' WHERE id=$1", [id]);
      try {
        // A persistent candidate + router-side identity check handles crashes
        // between MikroTik provisioning and the DB success update.
        await this.fulfill(invoice, code);
        await db.query("UPDATE transactions SET voucher_code=$2,status='success' WHERE id=$1", [id, code]);
        await db.query("UPDATE qiospay_invoices SET last_error=NULL,next_attempt_at=NULL WHERE transaction_id=$1", [id]);
      } catch {
        await db.query("UPDATE transactions SET status='paid' WHERE id=$1 AND status<>'success'", [id]);
        await db.query(
          `UPDATE qiospay_invoices SET last_error=$2,
           next_attempt_at=NOW()+($3 * INTERVAL '1 second') WHERE transaction_id=$1`,
          [id, "Dana sudah terverifikasi, tetapi pemasangan voucher ke router belum berhasil. Periksa router dan profil, lalu coba ulang.",
            Math.min(3600, 30 * 2 ** Math.min(invoice.attempts, 7))],
        );
        // Deliberately do not log network exceptions or secrets.
        console.warn(`[Qiospay] Voucher ${reference} menunggu pemulihan router.`);
      }
    } finally {
      try {
        if (lockedId !== undefined) await db.query("SELECT pg_advisory_unlock($1,$2)", [LOCK_NAMESPACE, lockedId]);
      } finally { db.release(); }
    }
  }

  private async syncState(error: string | null) {
    await this.pool.query(
      `INSERT INTO settings(config_key,config_value) VALUES('qiospaySyncError',$1)
       ON CONFLICT(config_key) DO UPDATE SET config_value=$1,updated_at=NOW()`, [error || ""],
    );
    if (!error) await this.pool.query(
      `INSERT INTO settings(config_key,config_value) VALUES('qiospayLastSyncAt',$1)
       ON CONFLICT(config_key) DO UPDATE SET config_value=$1,updated_at=NOW()`, [new Date().toISOString()],
    );
  }

  async sync() {
    const config = readQiospayConfig(await this.settings());
    const db = await this.pool.connect();
    let locked = false;
    try {
      const { rows } = await db.query("SELECT pg_try_advisory_lock(hashtext($1)) AS locked", [`qiospay-sync:${config.merchantCode}`]);
      locked = rows[0].locked;
      if (!locked) return this.overview();
      const credits = await fetchCredits(config, this.fetcher);
      await this.recordCredits(config.merchantCode, credits, db);
      await this.expire();
      await this.matchCredits(config.merchantCode, db);
      await this.syncState(null);
      const { rows: paid } = await db.query(
        `SELECT i.reference_id FROM qiospay_invoices i JOIN transactions t ON t.id=i.transaction_id
         WHERE i.merchant_code=$1 AND t.status IN ('paid','provisioning')
         AND (i.next_attempt_at IS NULL OR i.next_attempt_at<=NOW())
         ORDER BY i.created_at LIMIT 5`, [config.merchantCode],
      );
      for (const invoice of paid) await this.provision(invoice.reference_id);
    } catch (e) {
      const message = e instanceof PaymentError ? e.message : "Sinkronisasi Qiospay gagal. Periksa koneksi database dan konfigurasi.";
      await this.syncState(message);
      throw new PaymentError(message, e instanceof PaymentError ? e.status : 503);
    } finally {
      try {
        if (locked) await db.query("SELECT pg_advisory_unlock(hashtext($1))", [`qiospay-sync:${config.merchantCode}`]);
      } finally { db.release(); }
    }
    return this.overview();
  }

  async overview() {
    const s = await this.settings();
    const merchant = s.qiospayMerchantCode || "";
    let configured = false;
    try { readQiospayConfig(s); configured = true; } catch {}
    const { rows: events } = await this.pool.query(
      `SELECT event_key,amount,paid_at,status,reference_id,error FROM qiospay_events
       WHERE merchant_code=$1 ORDER BY paid_at DESC LIMIT 30`, [merchant],
    );
    const { rows } = await this.pool.query("SELECT COUNT(*)::int AS count FROM qiospay_invoices WHERE merchant_code=$1", [merchant]);
    return { configured, last_sync_at: s.qiospayLastSyncAt || null, error: s.qiospaySyncError || null, reservations_count: rows[0].count, events };
  }

  async status(reference: string) {
    await this.expire();
    const { rows } = await this.pool.query(
      `SELECT t.status,t.voucher_code,i.base_amount,i.unique_code,i.total_amount,i.expires_at,i.last_error
       FROM qiospay_invoices i JOIN transactions t ON t.id=i.transaction_id WHERE i.reference_id=$1`, [reference],
    );
    if (!rows.length) return null;
    const r = rows[0];
    const message = r.status === "review" ? "Pembayaran di luar batas waktu. Hubungi admin untuk pemeriksaan/refund; jangan bayar lagi."
      : r.status === "expired" ? "Waktu pembayaran habis. QRIS statis tidak batal di penyedia. Jangan bayar QR ini; jika sudah membayar, hubungi admin."
      : r.status === "paid" || r.status === "provisioning" ? r.last_error || "Pembayaran terverifikasi. Voucher sedang dipasang ke router."
      : null;
    return { provider: "qiospay", status: r.status, voucher_code: r.status === "success" ? r.voucher_code : null,
      amount: r.total_amount, base_amount: r.base_amount, unique_code: r.unique_code, expires_at: r.expires_at, message };
  }

  start() {
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        await this.expire();
        // Already-verified money does not depend on Qiospay being online again.
        const { rows: recoverable } = await this.pool.query(
          `SELECT i.reference_id FROM qiospay_invoices i JOIN transactions t ON t.id=i.transaction_id
           WHERE i.event_key IS NOT NULL AND t.status IN ('paid','provisioning')
           AND (i.next_attempt_at IS NULL OR i.next_attempt_at<=NOW()) ORDER BY i.created_at LIMIT 5`,
        );
        for (const invoice of recoverable) await this.provision(invoice.reference_id);
        const s = await this.settings();
        if (!s.qiospayApiKey || !s.qiospayMerchantCode || !s.qiospayQrString) return;
        const { rows } = await this.pool.query(
          `SELECT 1 FROM qiospay_invoices i JOIN transactions t ON t.id=i.transaction_id
           WHERE i.merchant_code=$1 AND
           (t.status IN ('paid','provisioning') OR (t.status IN ('pending','expired','review') AND i.expires_at>NOW()-INTERVAL '48 hours'))
           LIMIT 1`, [s.qiospayMerchantCode],
        );
        if (rows.length) await this.sync();
      } catch { /* Safe error is persisted by sync; invoices remain recoverable. */ }
      finally { busy = false; }
    };
    const timer = setInterval(tick, 30_000);
    timer.unref();
    return () => clearInterval(timer);
  }

  requestSync() {
    if (this.wakeBusy || Date.now() - this.lastWake < 15_000) return;
    this.wakeBusy = true;
    this.lastWake = Date.now();
    void this.sync().catch(() => {}).finally(() => { this.wakeBusy = false; });
  }
}