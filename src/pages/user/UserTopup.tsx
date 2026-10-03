import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, ChevronLeft, CircleAlert, Clock3, CreditCard, History, LoaderCircle, RefreshCw, ShieldCheck, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../AppContext';
import { QrisCheckoutDetails, qrisDisplayText, useQrisPayment } from '../../components/QrisCheckout';
import { formatRupiah } from '../../lib/format';
import { qrisTopupRecoveryKey } from '../../lib/qrisRecovery';
import { readApiResponse } from '../../lib/apiResponse';

type TopupHistoryItem = {
  id: number;
  amount: number;
  type: 'topup' | 'deduct';
  created_at: string;
  admin_name: string;
  payment_method: string;
  reference_id: string | null;
};

type ApiEnvelope<T> = { success: boolean; data: T; error?: string };

const PRESETS = [10000, 20000, 50000, 100000];
const MAX_AMOUNT = 99998999;

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function statusPresentation(status: string) {
  if (status === 'success') return { title: 'Pembayaran berhasil', detail: 'Saldo sudah dikreditkan.', tone: 'emerald' };
  if (status === 'paid' || status === 'provisioning') return { title: 'Pembayaran diterima', detail: 'Saldo sedang diperbarui. Mohon tunggu sebentar.', tone: 'sky' };
  if (status === 'expired') return { title: 'QRIS kedaluwarsa', detail: 'Jika sudah membayar, transaksi tetap akan diperiksa.', tone: 'amber' };
  if (status === 'review') return { title: 'Perlu pemeriksaan', detail: 'Pembayaran sedang ditinjau oleh tim AdilaNet.', tone: 'amber' };
  if (status === 'failed') return { title: 'Transaksi bermasalah', detail: 'Hubungi admin jika Anda sudah melakukan pembayaran.', tone: 'rose' };
  return { title: 'Menunggu pembayaran', detail: 'Selesaikan pembayaran menggunakan QRIS di bawah.', tone: 'sky' };
}

export default function UserTopup() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, refreshData, fetchNotifications } = useAppContext();
  const identityScope = currentUser ? `user-${currentUser.id}` : null;
  const storageKey = currentUser ? qrisTopupRecoveryKey(String(currentUser.id)) : null;
  const { payment, status, statusMessage, statusError, error, creating, createPayment, clearPayment } =
    useQrisPayment(storageKey, identityScope, 'topup');
  const [amountInput, setAmountInput] = useState('');
  const [configLoading, setConfigLoading] = useState(true);
  const [qrisEnabled, setQrisEnabled] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [history, setHistory] = useState<TopupHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyReload, setHistoryReload] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [balanceRefreshError, setBalanceRefreshError] = useState<string | null>(null);
  const creditedReferences = useRef(new Set<string>());

  const parsedAmount = useMemo(() => {
    if (!/^\d+$/.test(amountInput)) return NaN;
    return Number(amountInput);
  }, [amountInput]);
  const amountValid = Number.isInteger(parsedAmount) && parsedAmount >= 1 && parsedAmount <= MAX_AMOUNT;
  const hasReceipt = Boolean(payment);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      const response = await fetch('/api/config/public', { credentials: 'include' });
      const json = await readApiResponse<ApiEnvelope<{ qrisEnabled: boolean }>>(response);
      if (!response.ok || !json.success || typeof json.data?.qrisEnabled !== 'boolean') {
        throw new Error(json.error || 'Status layanan QRIS belum dapat dipastikan.');
      }
      setQrisEnabled(json.data.qrisEnabled);
    } catch (err) {
      setQrisEnabled(false);
      setConfigError(err instanceof Error ? err.message : 'Gagal memeriksa layanan QRIS.');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch('/api/payment/topup-history', { credentials: 'include' });
      const json = await readApiResponse<ApiEnvelope<TopupHistoryItem[]>>(response);
      if (!response.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.error || 'Riwayat top-up belum dapat dimuat.');
      }
      setHistory(json.data);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat riwayat.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { void loadConfig(); }, [loadConfig]);
  useEffect(() => { void loadHistory(); }, [loadHistory, historyReload]);

  const refreshActions = useRef({ setCurrentUser, refreshData, fetchNotifications, loadHistory });
  refreshActions.current = { setCurrentUser, refreshData, fetchNotifications, loadHistory };

  useEffect(() => {
    if (status !== 'success' || !payment?.reference_id || creditedReferences.current.has(payment.reference_id)) return;
    creditedReferences.current.add(payment.reference_id);
    let active = true;
    const refreshAfterCredit = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        const json = await readApiResponse<ApiEnvelope<NonNullable<typeof currentUser>>>(response);
        if (!response.ok || !json.success || !json.data) throw new Error(json.error || 'Gagal memperbarui saldo akun.');
        if (!active) return;
        if (json.data.id !== currentUser?.id) throw new Error('Akun berubah. Muat ulang untuk melihat saldo.');
        refreshActions.current.setCurrentUser(json.data);
        setBalanceRefreshError(null);
      } catch (err) {
        if (active) setBalanceRefreshError('Pembayaran berhasil, tetapi tampilan saldo belum diperbarui. Segarkan halaman untuk melihat saldo terbaru.');
      }
      if (!active) return;
      await Promise.allSettled([
        Promise.resolve().then(() => refreshActions.current.refreshData()),
        Promise.resolve().then(() => refreshActions.current.fetchNotifications()),
        refreshActions.current.loadHistory(),
      ]);
    };
    void refreshAfterCredit();
    return () => { active = false; };
  }, [status, payment?.reference_id, currentUser?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating || !qrisEnabled || configLoading || hasReceipt) return;
    if (!amountValid) {
      setValidationError('Masukkan nominal bulat antara Rp1 dan Rp99.998.999.');
      return;
    }
    setValidationError(null);
    await createPayment({ amount: parsedAmount });
  };

  const choosePreset = (value: number) => {
    setAmountInput(String(value));
    setValidationError(null);
  };

  const presentation = statusPresentation(status);
  const toneClasses: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    sky: 'border-sky-200 bg-sky-50 text-sky-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  };

  return (
    <main className="min-h-[100dvh] min-w-0 w-full space-y-6 break-words px-4 pb-10 pt-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/user')}
          aria-label="Kembali ke beranda"
          data-testid="button-back-home"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/70 text-slate-600 shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">AdilaNet · Layanan pelanggan</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-800 sm:text-[30px]">Isi saldo</h1>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6">
        <section className="min-w-0 space-y-5">
          <div className="glass-strong relative overflow-hidden rounded-[28px] p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-sky-200/50 blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-sky-50/80 px-3 py-1.5 text-[11px] font-bold tracking-wide text-sky-800">
                  <Wifi size={14} /> TOP UP QRIS
                </div>
                <h2 className="max-w-md text-[23px] font-extrabold leading-tight tracking-tight text-slate-800 sm:text-[28px]">Saldo internet, siap saat dibutuhkan.</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">Pilih nominal, buat QRIS, lalu bayar dari aplikasi bank atau dompet digital Anda.</p>
              </div>
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-[19px] border border-white bg-white/70 text-sky-700 shadow-sm sm:flex">
                <CreditCard size={25} strokeWidth={1.7} />
              </div>
            </div>
            <div className="relative mt-6 grid grid-cols-2 gap-2.5">
              {PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => choosePreset(value)}
                  disabled={!qrisEnabled || configLoading || hasReceipt || creating}
                  aria-pressed={amountInput === String(value)}
                  data-testid={`button-preset-${value}`}
                  className={`rounded-[15px] border px-3 py-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-50 ${amountInput === String(value) ? 'border-sky-500 bg-sky-500 text-white shadow-[0_7px_16px_rgba(14,165,233,0.22)]' : 'border-sky-100 bg-white/75 text-slate-700 hover:border-sky-300 hover:bg-white'}`}
                >
                  {formatRupiah(value)}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="relative mt-5">
              <label htmlFor="topup-amount" className="mb-2 block text-[13px] font-bold text-slate-700">Nominal isi saldo</label>
              <div className={`flex items-center rounded-[17px] border bg-white/85 px-4 transition focus-within:ring-2 focus-within:ring-sky-300 ${validationError ? 'border-rose-300' : 'border-slate-200'}`}>
                <span className="mr-3 text-sm font-bold text-slate-400">Rp</span>
                <input
                  id="topup-amount"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={amountInput}
                  onChange={(event) => {
                     setAmountInput(event.target.value);
                    setValidationError(null);
                  }}
                  disabled={!qrisEnabled || configLoading || hasReceipt || creating}
                  aria-describedby="topup-amount-hint topup-amount-error"
                  aria-invalid={Boolean(validationError)}
                  data-testid="input-topup-amount"
                  placeholder="Masukkan nominal"
                  className="h-[54px] min-w-0 flex-1 bg-transparent text-[18px] font-bold tracking-tight text-slate-800 outline-none placeholder:text-sm placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 disabled:opacity-60"
                />
                <span className="text-[11px] font-semibold text-slate-400">RUPIAH</span>
              </div>
              <p id="topup-amount-hint" className="mt-2 text-[11px] leading-relaxed text-slate-500">Nominal bulat Rp1–Rp99.998.999. Biaya unik QRIS, jika ada, tidak masuk ke saldo.</p>
              <p id="topup-amount-error" role="alert" className="mt-1 min-h-4 text-xs font-medium text-rose-700">{validationError || qrisDisplayText(error || '')}</p>
              <button
                type="submit"
                disabled={!qrisEnabled || configLoading || creating || hasReceipt || !amountInput}
                data-testid="button-create-topup"
                className="mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-sky-600 px-5 text-sm font-bold text-white shadow-[0_9px_20px_rgba(2,132,199,0.2)] transition hover:bg-sky-700 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {creating ? <><LoaderCircle size={17} className="animate-spin" /> Menyiapkan QRIS…</> : <>Buat pembayaran QRIS <ArrowUpRight size={17} /></>}
              </button>
            </form>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3">
            <div className="glass rounded-[20px] p-4">
              <div className="mb-2 flex items-center gap-2 text-sky-700"><ShieldCheck size={17} /><span className="text-xs font-bold">Transaksi terlindungi</span></div>
              <p className="text-xs leading-relaxed text-slate-600">Pembayaran terhubung ke akun Anda. Saldo bertambah setelah pembayaran terkonfirmasi.</p>
            </div>
            <div className="glass rounded-[20px] p-4">
              <div className="mb-2 flex items-center gap-2 text-sky-700"><CreditCard size={17} /><span className="text-xs font-bold">Nominal transparan</span></div>
              <p className="text-xs leading-relaxed text-slate-600">Yang dikreditkan hanya nominal saldo. Tambahan unik pembayaran bukan saldo.</p>
            </div>
          </div>
        </section>

        <section className="min-w-0 space-y-4" aria-live="polite">
          {configLoading ? (
            <div className="glass-strong rounded-[26px] p-6" aria-label="Memeriksa layanan QRIS">
              <div className="h-4 w-32 animate-pulse rounded bg-sky-100" />
              <div className="mt-5 h-32 animate-pulse rounded-2xl bg-sky-50" />
              <div className="mt-4 h-3 w-3/4 animate-pulse rounded bg-sky-100" />
            </div>
          ) : configError || !qrisEnabled ? (
            <div className="glass-strong rounded-[26px] border border-amber-200/70 p-5 sm:p-6" role="alert">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><CircleAlert size={20} /></div>
                <div>
                  <h2 className="font-bold text-slate-800">Top up QRIS belum tersedia</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{qrisDisplayText(configError || 'Layanan QRIS sedang dinonaktifkan. Coba periksa kembali nanti.')}</p>
                  <button type="button" onClick={() => void loadConfig()} data-testid="button-retry-config" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50">
                    <RefreshCw size={14} /> Coba lagi
                  </button>
                </div>
              </div>
            </div>
          ) : payment ? (
            <div className="glass-strong rounded-[26px] p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-slate-500">Pembayaran Anda</p>
                  <h2 className="mt-1 text-lg font-extrabold text-slate-800">QRIS AdilaNet</h2>
                </div>
                <span className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${toneClasses[presentation.tone]}`}>
                  {presentation.title}
                </span>
              </div>
              <QrisCheckoutDetails payment={payment} status={status} message={statusMessage} />
              {statusError && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">{qrisDisplayText(statusError)}</p>}
              {(status === 'paid' || status === 'provisioning') && (
                <p className="mt-4 rounded-[15px] border border-sky-100 bg-sky-50 p-3 text-center text-xs leading-relaxed text-sky-800">{presentation.detail}</p>
              )}
              {status === 'success' && (
                <div className="mt-4 rounded-[17px] border border-emerald-200 bg-emerald-50 p-4 text-center" data-testid="status-topup-success">
                  <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={19} /></div>
                  <p className="text-sm font-extrabold text-emerald-900">Saldo bertambah {formatRupiah(payment.base_amount)}</p>
                  <p className="mt-1 text-xs text-emerald-800">Nominal dasar telah dikreditkan ke saldo AdilaNet Anda. Tidak ada voucher yang dibuat.</p>
                </div>
              )}
              {status === 'success' && balanceRefreshError && (
                <div role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <p>{balanceRefreshError}</p>
                  <button type="button" onClick={() => window.location.reload()} className="mt-2 font-bold underline">Segarkan saldo</button>
                </div>
              )}
              {(status === 'expired' || status === 'review' || status === 'failed' || status === 'success') && (
                <button
                  type="button"
                  onClick={() => { clearPayment(); setAmountInput(''); setValidationError(null); setBalanceRefreshError(null); }}
                  data-testid="button-start-another-topup"
                  className="mt-4 w-full rounded-[15px] border border-sky-200 bg-white px-4 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
                >
                  Mulai top up baru
                </button>
              )}
            </div>
          ) : (
            <div className="glass-strong rounded-[26px] p-6 sm:p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-sky-100 text-sky-700"><Clock3 size={23} /></div>
              <h2 className="mt-4 text-lg font-extrabold text-slate-800">Pembayaran tampil di sini</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">Setelah nominal dipilih dan QR dibuat, status pembayaran akan diperbarui otomatis. Invoice yang menunggu tetap tersimpan saat halaman dimuat ulang.</p>
              <div className="mt-5 flex items-start gap-2 border-t border-slate-200/70 pt-4 text-xs font-medium text-slate-500">
                <ShieldCheck size={15} className="shrink-0 text-teal-600" /><span className="min-w-0">Jangan tutup invoice yang masih menunggu pembayaran.</span>
              </div>
            </div>
          )}

          <div className="glass-strong rounded-[26px] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-teal-50 text-teal-700"><History size={18} /></div>
                <div>
                  <h2 className="text-[15px] font-extrabold text-slate-800">Riwayat saldo</h2>
                  <p className="text-[11px] text-slate-500">Transaksi milik akun Anda</p>
                </div>
              </div>
              <button type="button" onClick={() => setHistoryReload((count) => count + 1)} aria-label="Muat ulang riwayat" data-testid="button-retry-history" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 hover:text-sky-700">
                <RefreshCw size={15} className={historyLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {historyLoading ? (
              <div className="space-y-3" aria-label="Memuat riwayat">
                {[1, 2, 3].map((item) => <div key={item} className="flex items-center gap-3"><div className="h-10 w-10 animate-pulse rounded-full bg-sky-100" /><div className="flex-1 space-y-2"><div className="h-3 w-2/5 animate-pulse rounded bg-sky-100" /><div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100" /></div><div className="h-3 w-16 animate-pulse rounded bg-sky-100" /></div>)}
              </div>
            ) : historyError ? (
              <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-4" role="alert">
                <p className="text-sm font-semibold text-rose-800">Riwayat belum dapat dimuat</p>
                <p className="mt-1 text-xs leading-relaxed text-rose-700">{historyError}</p>
                <button type="button" onClick={() => setHistoryReload((count) => count + 1)} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-rose-800"><RefreshCw size={13} /> Coba lagi</button>
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-[17px] border border-dashed border-sky-200 bg-sky-50/50 px-4 py-7 text-center" data-testid="empty-topup-history">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm"><History size={18} /></div>
                <p className="mt-3 text-sm font-bold text-slate-700">Belum ada transaksi saldo</p>
                <p className="mt-1 text-xs text-slate-500">Riwayat top up dan penyesuaian saldo akan terlihat di sini.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/70" data-testid="list-topup-history">
                {history.map((item) => {
                  const isCredit = item.type === 'topup';
                  return (
                    <li key={item.id} data-testid={`row-topup-history-${item.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isCredit ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
                        {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                         <p className="truncate text-[13px] font-bold text-slate-800">{isCredit ? 'Saldo masuk' : 'Penyesuaian saldo'}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{formatDate(item.created_at)}{item.payment_method ? ` · ${item.payment_method}` : ''}</p>
                      </div>
                      <p className={`whitespace-nowrap text-[13px] font-extrabold ${isCredit ? 'text-teal-700' : 'text-slate-700'}`}>{isCredit ? '+' : '−'}{formatRupiah(item.amount)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}