import type { PoolClient } from "pg";
import { PaymentError } from "./qiospay-client";
import { formatRupiah } from "../lib/format";

/** Called under the invoice advisory lock. Money and its receipt commit together. */
export async function creditQrisTopup(db: PoolClient, invoice: any) {
  if (!invoice.user_id || !invoice.event_key || invoice.purpose !== "topup") {
    throw new PaymentError("Tujuan top-up atau pembayaran belum terverifikasi.", 409);
  }
  const amount = Number(invoice.base_amount); // The unique addition is NOT wallet credit.
  const key = `qris:${invoice.reference_id}`;
  await db.query("BEGIN");
  try {
    const { rows } = await db.query(
      `INSERT INTO topups(user_id,admin_id,amount,type,idempotency_key)
       VALUES($1,NULL,$2,'topup',$3)
       ON CONFLICT(idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING id`,
      [invoice.user_id, amount, key],
    );
    if (rows.length) {
      const { rows: users } = await db.query(
        "UPDATE users SET balance=balance+$1,updated_at=NOW() WHERE id=$2 RETURNING balance",
        [amount, invoice.user_id],
      );
      if (!users.length) throw new PaymentError("Akun tujuan top-up tidak tersedia.", 409);
      await db.query(
        "INSERT INTO notifications(user_id,title,body,type) VALUES($1,$2,$3,'topup')",
        [invoice.user_id, "Top Up QRIS Berhasil", `Saldo bertambah ${formatRupiah(amount)}. Kode unik tidak masuk saldo. Saldo sekarang ${formatRupiah(Number(users[0].balance))}.`],
      );
    } else {
      const { rows: previous } = await db.query("SELECT user_id,amount FROM topups WHERE idempotency_key=$1", [key]);
      if (previous[0]?.user_id !== invoice.user_id || Number(previous[0]?.amount) !== amount) {
        throw new PaymentError("Riwayat top-up tidak sesuai. Perlu pemeriksaan admin.", 409);
      }
    }
    await db.query("UPDATE transactions SET status='success' WHERE id=$1", [invoice.transaction_id]);
    await db.query("UPDATE qiospay_invoices SET last_error=NULL,next_attempt_at=NULL WHERE transaction_id=$1", [invoice.transaction_id]);
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}