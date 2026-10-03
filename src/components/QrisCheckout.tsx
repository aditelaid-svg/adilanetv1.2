import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, CircleCheck, Clock3, Copy, LoaderCircle, ShieldAlert } from 'lucide-react';
import { formatRupiah } from '../lib/format';
import { clearQrisRecoveryForIdentity, QrisRecoveryPayment, readQrisRecovery, storeQrisRecovery } from '../lib/qrisRecovery';
import { readApiResponse } from '../lib/apiResponse';

export type QrisPayment = QrisRecoveryPayment;
export type QrisPaymentStatus = 'pending' | 'paid' | 'provisioning' | 'success' | 'expired' | 'review' | 'failed';

export const qrisDisplayText = (value: string) => value.replace(/\b(?:QRIS\s+)?Qiospay\b/gi, 'QRIS AdilaNet');

export function useQrisPayment(storageKey: string | null, identityScope: string | null, purpose: 'voucher' | 'topup' = 'voucher') {
  const [paymentState, setPaymentState] = useState<{ scope: string | null; payment: QrisPayment | null }>(
    () => ({ scope: storageKey, payment: readQrisRecovery(storageKey) })
  );
  const payment = paymentState.scope === storageKey ? paymentState.payment : null;
  const [status, setStatus] = useState<QrisPaymentStatus>('pending');
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const generation = useRef(0);
  const creatingRef = useRef(false);
  const activeStorageKey = useRef(storageKey);
  const activeIdentity = useRef(identityScope);

  useEffect(() => {
    if (activeStorageKey.current === storageKey) return;
    activeStorageKey.current = storageKey;
    generation.current += 1;
    creatingRef.current = false;
    setCreating(false);
    setPaymentState({ scope: storageKey, payment: readQrisRecovery(storageKey) });
    setStatus('pending');
    setVoucherCode(null);
    setStatusMessage(null);
    setStatusError(null);
    setError(null);
  }, [storageKey]);

  useEffect(() => {
    if (activeIdentity.current !== identityScope) {
      clearQrisRecoveryForIdentity(activeIdentity.current);
      activeIdentity.current = identityScope;
    }
  }, [identityScope]);

  useEffect(() => {
    if (payment && paymentState.scope === storageKey) storeQrisRecovery(storageKey, payment);
  }, [payment, paymentState.scope, storageKey]);

  const createPayment = useCallback(async (body: Record<string, unknown>) => {
    if (creatingRef.current) return false;
    if (!storageKey || activeStorageKey.current !== storageKey) {
      setError('Tidak dapat mengamankan transaksi ini untuk pemulihan. Coba buka kembali paket.');
      return false;
    }
    creatingRef.current = true;
    const requestGeneration = ++generation.current;
    setCreating(true);
    setError(null);
    try {
      const response = await fetch(purpose === 'topup' ? '/api/payment/topup-qris' : '/api/payment/create-qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await readApiResponse<{success: boolean; error?: string; data: QrisPayment}>(response);
      if (requestGeneration !== generation.current || activeStorageKey.current !== storageKey) return false;
      if (!response.ok || !json.success) {
        setError(json.error || 'Gagal membuat transaksi QRIS.');
        return false;
      }
      const data = json.data as QrisPayment;
      setPaymentState({ scope: storageKey, payment: data });
      setStatus('pending');
      setVoucherCode(null);
      setStatusMessage(null);
      setStatusError(null);
      return true;
    } catch {
      if (requestGeneration !== generation.current) return false;
      setError('Terjadi kesalahan jaringan saat membuat transaksi.');
      return false;
    } finally {
      if (requestGeneration === generation.current) {
        creatingRef.current = false;
        setCreating(false);
      }
    }
  }, [storageKey, purpose]);

  const clearPayment = useCallback(() => {
    generation.current += 1;
    creatingRef.current = false;
    setCreating(false);
    storeQrisRecovery(activeStorageKey.current, null);
    setPaymentState({ scope: activeStorageKey.current, payment: null });
    setStatus('pending');
    setVoucherCode(null);
    setStatusMessage(null);
    setStatusError(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!payment || status === 'success' || status === 'failed') return;
    let active = true;
    let polling = false;
    const pollGeneration = generation.current;
    const pollStorageKey = storageKey;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const statusPath = purpose === 'topup' ? 'topup-status' : 'status';
        const response = await fetch(`/api/payment/${statusPath}/${encodeURIComponent(payment.reference_id)}`, { credentials: 'include' });
        const json = await readApiResponse<{success: boolean; error?: string; data: any}>(response);
        if (!active || pollGeneration !== generation.current || activeStorageKey.current !== pollStorageKey) return;
        if (!response.ok || !json.success || !json.data) {
          setStatusError(json.error || 'Status pembayaran belum dapat dimuat. Sistem akan mencoba kembali.');
          return;
        }
        setStatusError(null);
        const next = json.data.status as QrisPaymentStatus;
        if (typeof json.data.message === 'string') setStatusMessage(json.data.message);
        setPaymentState(current => current.scope !== pollStorageKey || !current.payment ? current : {
          ...current,
          payment: {
          ...current.payment,
          provider: json.data.provider || current.payment.provider,
          amount: Number.isFinite(Number(json.data.amount)) ? Number(json.data.amount) : current.payment.amount,
          base_amount: Number.isFinite(Number(json.data.base_amount)) ? Number(json.data.base_amount) : current.payment.base_amount,
          unique_code: Number.isFinite(Number(json.data.unique_code)) ? Number(json.data.unique_code) : current.payment.unique_code,
          expires_at: json.data.expires_at || current.payment.expires_at,
          },
        });
        if (next === 'success' && (purpose === 'topup' ? json.data.purpose === 'topup' && Number(json.data.credited_amount) === payment.base_amount : json.data.voucher_code)) {
          setVoucherCode(json.data.voucher_code || null);
          setStatus('success');
        } else if (['pending', 'paid', 'provisioning', 'expired', 'review', 'failed'].includes(next)) {
          setStatus(current => {
            // A local deadline cannot be undone by a stale pending response. Valid
            // late payment evidence can still recover an expired/review transaction.
            if (current === 'expired' && next === 'pending') return current;
            return next;
          });
        }
      } catch {
        if (active && pollGeneration === generation.current) setStatusError('Koneksi status pembayaran terputus sementara. Sistem akan mencoba kembali.');
      } finally {
        polling = false;
      }
    };
    const id = window.setInterval(poll, 4000);
    void poll();
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [payment?.reference_id, storageKey, purpose, status === 'success' || status === 'failed']);

  useEffect(() => {
    if (!payment?.expires_at || status === 'success' || status === 'failed') return;
    const updateDeadline = () => {
      if (Date.now() >= new Date(payment.expires_at).getTime()) {
        setStatus(current => current === 'pending' ? 'expired' : current);
      }
    };
    updateDeadline();
    const id = window.setInterval(updateDeadline, 1000);
    return () => window.clearInterval(id);
  }, [payment?.expires_at, status === 'success' || status === 'failed']);

  return { payment, status, voucherCode, statusMessage, statusError, error, creating, createPayment, clearPayment };
}

export function QrisCheckoutDetails({ payment, status, message }: { payment: QrisPayment; status: QrisPaymentStatus; message?: string | null }) {
  const [copied, setCopied] = useState<'amount' | 'reference' | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const deadline = new Date(payment.expires_at).getTime();
  const remainingSeconds = Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  const effectiveStatus: QrisPaymentStatus = status === 'pending' && payment.expires_at && remainingSeconds === 0 ? 'expired' : status;
  const canShowQr = effectiveStatus === 'pending' && (!payment.expires_at || remainingSeconds > 0);
  const copyValue = async (value: string, kind: 'amount' | 'reference') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(current => current === kind ? null : current), 2000);
    } catch {
      setCopied(null);
    }
  };

  const statusMessage: Record<QrisPaymentStatus, string> = {
    pending: 'Menunggu pembayaran. Periksa total nominal sebelum menyetujui pembayaran QRIS.',
    paid: payment.purpose === 'topup' ? 'Pembayaran diterima. Saldo sedang diperbarui.' : 'Pembayaran diterima. Voucher menunggu penerbitan.',
    provisioning: payment.purpose === 'topup' ? 'Pembayaran diterima. Saldo sedang diperbarui.' : 'Pembayaran diterima. Voucher sedang diproses.',
    success: 'Pembayaran berhasil.',
    expired: 'Batas waktu pembayaran terlewati. Jika Anda sudah membayar, pembayaran tetap akan diperiksa.',
    review: 'Transaksi sedang ditinjau. Jika sudah membayar, hubungi admin untuk pemeriksaan.',
    failed: 'Transaksi gagal. Hubungi admin jika saldo atau pembayaran Anda sudah terpotong.',
  };
  const statusAppearance: Record<QrisPaymentStatus, { label: string; icon: React.ReactNode; style: string; panel: string }> = {
    pending: { label: 'Menunggu pembayaran', icon: <Clock3 size={15} />, style: 'border-sky-200 bg-sky-50 text-sky-800', panel: 'border-sky-100 bg-sky-50/70' },
    paid: { label: 'Pembayaran diterima', icon: <LoaderCircle size={15} className="animate-spin" />, style: 'border-teal-200 bg-teal-50 text-teal-800', panel: 'border-teal-100 bg-teal-50/70' },
    provisioning: { label: 'Sedang diproses', icon: <LoaderCircle size={15} className="animate-spin" />, style: 'border-teal-200 bg-teal-50 text-teal-800', panel: 'border-teal-100 bg-teal-50/70' },
    success: { label: 'Berhasil', icon: <CircleCheck size={15} />, style: 'border-emerald-200 bg-emerald-50 text-emerald-800', panel: 'border-emerald-100 bg-emerald-50/70' },
    expired: { label: 'Kedaluwarsa', icon: <Clock3 size={15} />, style: 'border-amber-200 bg-amber-50 text-amber-800', panel: 'border-amber-100 bg-amber-50/70' },
    review: { label: 'Perlu pemeriksaan', icon: <ShieldAlert size={15} />, style: 'border-amber-200 bg-amber-50 text-amber-800', panel: 'border-amber-100 bg-amber-50/70' },
    failed: { label: 'Transaksi gagal', icon: <AlertTriangle size={15} />, style: 'border-rose-200 bg-rose-50 text-rose-800', panel: 'border-rose-100 bg-rose-50/70' },
  };
  const appearance = statusAppearance[effectiveStatus];
  const visibleMessage = effectiveStatus === 'expired'
    ? statusMessage.expired
    : (message ? qrisDisplayText(message).trim() : '') || statusMessage[effectiveStatus];

  return (
    <div className="text-center" data-testid="qris-checkout-details">
      <div className="mb-4 flex items-center justify-center">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold ${appearance.style}`} role="status">
          {appearance.icon}{appearance.label}
        </span>
      </div>
      {canShowQr ? (
        <div className="mx-auto mb-4 w-full max-w-[300px] rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(22,78,99,0.09)] sm:p-5">
          <div className="relative mx-auto flex aspect-square w-full max-w-[256px] items-center justify-center bg-white">
            <img src={payment.qr_url} alt="Kode QRIS AdilaNet untuk pembayaran" className="absolute inset-0 h-full w-full bg-white object-contain" />
          </div>
          <p className="mt-3 text-[10px] font-semibold tracking-[0.16em] text-slate-400">QRIS ADILANET</p>
        </div>
      ) : (
        <div className={`mx-auto mb-4 flex max-w-[300px] items-start gap-3 rounded-[18px] border p-4 text-left ${appearance.panel}`}>
          <div className={`mt-0.5 shrink-0 ${effectiveStatus === 'failed' ? 'text-rose-700' : effectiveStatus === 'success' ? 'text-emerald-700' : effectiveStatus === 'paid' || effectiveStatus === 'provisioning' ? 'text-teal-700' : 'text-amber-700'}`}>
            {effectiveStatus === 'success' ? <CircleCheck size={20} /> : effectiveStatus === 'paid' || effectiveStatus === 'provisioning' ? <LoaderCircle size={20} className="animate-spin" /> : <AlertTriangle size={20} />}
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-800">{effectiveStatus === 'success' ? 'Pembayaran terkonfirmasi' : effectiveStatus === 'expired' ? 'QR tidak lagi dapat digunakan' : effectiveStatus === 'review' ? 'Transaksi menunggu pemeriksaan' : effectiveStatus === 'failed' ? 'QR tidak tersedia' : 'Pembayaran sedang diproses'}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{effectiveStatus === 'expired' ? 'Jangan lanjutkan pembayaran dengan kode ini. Jika sudah membayar, transaksi tetap akan diperiksa.' : effectiveStatus === 'review' ? 'Jangan membuat invoice baru untuk pembayaran ini. Hubungi admin dan sertakan referensi transaksi.' : effectiveStatus === 'failed' ? 'Jika dana sudah terpotong, hubungi admin dan sertakan referensi transaksi.' : effectiveStatus === 'success' ? 'Simpan bukti transaksi ini bila diperlukan.' : 'Mohon tunggu konfirmasi. Status akan diperbarui otomatis.'}</p>
          </div>
        </div>
      )}

      <div className="mb-4 rounded-[20px] border border-sky-100 bg-sky-50/80 p-4 text-left">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-sky-800">Rincian pembayaran</p>
          {effectiveStatus === 'pending' && payment.expires_at && (
            <span aria-label={`Sisa waktu pembayaran ${Math.floor(remainingSeconds / 60)} menit ${remainingSeconds % 60} detik`} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-600"><Clock3 size={12} />Sisa {remainingSeconds > 0 ? `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}` : '00:00'}</span>
          )}
        </div>
        <div className="flex justify-between gap-3 text-[12px] text-slate-600 mb-1"><span>{payment.purpose === 'topup' ? 'Nominal isi saldo' : 'Harga paket'}</span><span className="font-semibold text-slate-700">{formatRupiah(payment.base_amount)}</span></div>
        {payment.unique_code > 0 && (
          <div className="flex justify-between gap-3 border-b border-sky-100 pb-2 text-[12px] text-slate-600">
            <span>Tambahan nominal unik</span><span className="font-semibold text-slate-700">+{formatRupiah(payment.unique_code)}</span>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total tepat untuk dibayar</p>
            <strong className="mt-1 block text-[26px] leading-tight tracking-tight text-sky-800" data-testid="qris-total-amount">{formatRupiah(payment.amount)}</strong>
          </div>
          <button type="button" onClick={() => void copyValue(String(payment.amount), 'amount')} aria-label={copied === 'amount' ? 'Nominal pembayaran tersalin' : 'Salin nominal pembayaran'} className="mb-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-[11px] border border-sky-200 bg-white px-3 py-2 text-[11px] font-bold text-sky-800 transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500">
            {copied === 'amount' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'amount' ? 'Nominal tersalin' : 'Salin nominal'}
          </button>
        </div>
        {payment.purpose === 'topup' && <p className="mt-2 border-t border-sky-100 pt-2 text-[10px] leading-relaxed text-slate-500">Saldo yang dikreditkan sebesar {formatRupiah(payment.base_amount)}{payment.unique_code > 0 ? '. Tambahan nominal unik tidak masuk ke saldo.' : '.'}</p>}
      </div>
      <p className="mb-4 text-[12px] leading-relaxed text-slate-600">{visibleMessage}</p>
      {canShowQr && (
        <div className="mb-4 rounded-[17px] border border-slate-200 bg-white/75 p-4 text-left">
          <p className="mb-2 text-[11px] font-bold text-slate-700">Cara membayar</p>
          <ol className="space-y-1.5 text-[11px] leading-relaxed text-slate-600">
            <li><span className="mr-2 font-bold text-sky-700">01</span>Buka aplikasi bank atau dompet digital, lalu pilih menu QRIS.</li>
            <li><span className="mr-2 font-bold text-sky-700">02</span>Pindai kode di atas dan pastikan totalnya sama persis.</li>
            <li><span className="mr-2 font-bold text-sky-700">03</span>Konfirmasi pembayaran. Status transaksi diperbarui otomatis.</li>
          </ol>
        </div>
      )}
      {payment.unique_code > 0 && payment.purpose !== 'topup' && <p className="mb-3 text-[10px] leading-relaxed text-slate-500">Nominal unik sudah termasuk dalam total pembayaran.</p>}
      <div className="rounded-[13px] border border-slate-200/80 bg-white/55 px-3 py-2.5 text-left">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Referensi transaksi</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="min-w-0 flex-1 break-all font-mono text-[10px] leading-relaxed text-slate-600" data-testid="qris-reference">{payment.reference_id}</p>
          <button type="button" onClick={() => void copyValue(payment.reference_id, 'reference')} aria-label={copied === 'reference' ? 'Referensi transaksi tersalin' : 'Salin referensi transaksi'} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-sky-800 hover:bg-sky-50">
            {copied === 'reference' ? <Check size={13} /> : <Copy size={13} />}
            {copied === 'reference' ? 'Tersalin' : 'Salin'}
          </button>
        </div>
      </div>
    </div>
  );
}