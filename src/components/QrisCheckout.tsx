import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, AlertTriangle } from 'lucide-react';
import { formatRupiah } from '../lib/format';
import { clearQrisRecoveryForIdentity, QrisRecoveryPayment, readQrisRecovery, storeQrisRecovery } from '../lib/qrisRecovery';

export type QrisPayment = QrisRecoveryPayment;
export type QrisPaymentStatus = 'pending' | 'paid' | 'provisioning' | 'success' | 'expired' | 'review' | 'failed';

export function useQrisPayment(storageKey: string | null, identityScope: string | null) {
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
      const response = await fetch('/api/payment/create-qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
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
  }, [storageKey]);

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
        const response = await fetch(`/api/payment/status/${encodeURIComponent(payment.reference_id)}`);
        const json = await response.json();
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
        if (next === 'success' && json.data.voucher_code) {
          setVoucherCode(json.data.voucher_code);
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
  }, [payment?.reference_id, storageKey, status === 'success' || status === 'failed']);

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
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const deadline = new Date(payment.expires_at).getTime();
  const remainingSeconds = Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  const canShowQr = status === 'pending' && (!payment.expires_at || remainingSeconds > 0);
  const copyAmount = async () => {
    try {
      await navigator.clipboard.writeText(String(payment.amount));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const statusMessage: Record<QrisPaymentStatus, string> = {
    pending: 'Menunggu pembayaran. QRIS ini bersifat statis dan tidak menampilkan nominal secara otomatis.',
    paid: 'Pembayaran diterima. Voucher sedang menunggu penerbitan oleh sistem.',
    provisioning: 'Pembayaran diterima. Voucher sedang diproses, mohon tunggu.',
    success: 'Pembayaran berhasil.',
    expired: 'Batas waktu pembayaran terlewati. Jika Anda sudah membayar, pembayaran tetap akan diperiksa.',
    review: 'Transaksi sedang ditinjau. Jika sudah membayar, hubungi admin untuk pemeriksaan.',
    failed: 'Transaksi gagal. Hubungi admin jika saldo atau pembayaran Anda sudah terpotong.',
  };

  return (
    <div className="text-center">
      {canShowQr ? (
        <div className="bg-white p-4 rounded-[20px] inline-block mb-4 shadow-sm border border-slate-100">
          <div className="w-[180px] h-[180px] bg-white rounded-lg flex items-center justify-center m-auto relative">
            <img src={payment.qr_url} alt="QRIS statis Qiospay" className="absolute inset-0 w-full h-full object-contain rounded-lg" />
          </div>
        </div>
      ) : (
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-amber-600" />
        </div>
      )}

      <div className="bg-sky-50 border border-sky-100 rounded-[18px] p-4 text-left mb-4">
        <p className="text-[11px] uppercase tracking-wider font-bold text-sky-700 mb-2">Rincian pembayaran</p>
        <div className="flex justify-between text-[12px] text-slate-600 mb-1"><span>Harga paket</span><span>{formatRupiah(payment.base_amount)}</span></div>
        {payment.unique_code > 0 && (
          <div className="flex justify-between text-[12px] text-slate-600 pb-2 border-b border-sky-100">
            <span>Nominal unik</span><span>+{formatRupiah(payment.unique_code)}</span>
          </div>
        )}
        <p className="text-[11px] text-slate-500 mt-2">Bayar tepat sebesar</p>
        <div className="flex items-center justify-between gap-2">
          <strong className="text-[24px] leading-tight text-sky-700">{formatRupiah(payment.amount)}</strong>
          <button type="button" onClick={copyAmount} className="shrink-0 flex items-center gap-1.5 rounded-[10px] bg-white border border-sky-100 px-3 py-2 text-[11px] font-semibold text-sky-700">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Tersalin' : 'Salin nominal'}
          </button>
        </div>
      </div>
      <p className="text-[12px] text-slate-500 mb-2">{message || statusMessage[status]}</p>
      {canShowQr && <p className="text-[11px] text-slate-400 mb-2">Di aplikasi wallet, masukkan nominal persis di atas. Jangan membayar nominal lain.</p>}
      <p className="text-[10px] text-slate-400">
        Metode: Qiospay · QRIS statis.
        {payment.unique_code > 0 ? ' Nominal unik sudah termasuk dalam total dan tidak dikembalikan otomatis.' : ''}
      </p>
      {payment.expires_at && status === 'pending' && (
        <p className="text-[11px] font-medium text-slate-500 mb-2">
          Batas waktu: {remainingSeconds > 0 ? `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}` : 'kedaluwarsa'}
        </p>
      )}
      {status === 'expired' || status === 'review' ? (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-[12px] p-3 mt-3">
          Jangan buat invoice baru untuk pembayaran ini. Pembayaran terlambat/perlu ditinjau; hubungi admin dan sertakan referensi transaksi.
        </p>
      ) : null}
      <p className="text-[11px] text-slate-400 font-mono break-all mt-3">{payment.reference_id}</p>
    </div>
  );
}