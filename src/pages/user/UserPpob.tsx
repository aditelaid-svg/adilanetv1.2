import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, ChevronDown, Clock3, CreditCard, LoaderCircle, LockKeyhole, RefreshCw, Search, ShieldCheck, Smartphone, Wallet, Wifi } from 'lucide-react';
import { useAppContext } from '../../AppContext';
import { getPpobCustomer, getPpobOrder, recoverPpobOrder, createPpobQuote, purchasePpob, PpobApiError, PpobCustomer, PpobOrder, PpobQuote } from '../../lib/ppob';

type Recovery = { quote: PpobQuote; idempotencyKey: string; uncertain: boolean };
const rupiah = (value: number) => `Rp${new Intl.NumberFormat('id-ID').format(value)}`;
const time = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const safeJson = <T,>(raw: string | null, fallback: T): T => { try { return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } };
const recoveryKey = (userId: number) => `adilanet-ppob-recovery:user-${userId}`;
const readRecovery = (id: number) => {
  try { return safeJson<Recovery | null>(sessionStorage.getItem(recoveryKey(id)), null); } catch { return null; }
};
const storeRecovery = (id: number, value: Recovery | null) => {
  try {
    if (value) sessionStorage.setItem(recoveryKey(id), JSON.stringify(value));
    else sessionStorage.removeItem(recoveryKey(id));
    return true;
  } catch { return false; }
};
const makeKey = () => {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) throw new Error('Browser belum mendukung referensi transaksi yang aman.');
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
const explain = (error: unknown) => error instanceof Error ? error.message : 'Permintaan belum dapat diselesaikan. Coba lagi.';

function OrderStatus({ status }: { status: PpobOrder['status'] }) {
  const options = {
    pending: ['bg-amber-50 text-amber-900 border-amber-200', 'Menunggu provider'],
    review: ['bg-orange-50 text-orange-900 border-orange-200', 'Sedang ditinjau'],
    success: ['bg-teal-50 text-teal-900 border-teal-200', 'Berhasil'],
    failed: ['bg-rose-50 text-rose-900 border-rose-200', 'Gagal'],
  };
  const [style, label] = options[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${style}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>;
}

export default function UserPpob() {
  const { currentUser, refreshData } = useAppContext();
  const userId = currentUser?.id;
  const [data, setData] = useState<PpobCustomer | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');
  const [selectedSku, setSelectedSku] = useState('');
  const [customerNo, setCustomerNo] = useState('');
  const [quote, setQuote] = useState<PpobQuote | null>(null);
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [orders, setOrders] = useState<PpobOrder[]>([]);
  const [pollErrors, setPollErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog');
  const storageReadyFor = useRef<number | null>(null);

  const load = useCallback(async (initial = false) => {
    if (initial) setPageLoading(true);
    try {
      const fresh = await getPpobCustomer();
      setData(fresh);
      setLoadError('');
      setSelectedSku(current => current || fresh.products[0]?.sku || '');
      setOrders(current => {
        const byId = new Map<string, PpobOrder>(current.map(order => [order.id, order]));
        fresh.orders.forEach(order => byId.set(order.id, order));
        return Array.from(byId.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
      });
    } catch (error) {
      setLoadError(explain(error));
    } finally { if (initial) setPageLoading(false); }
  }, []);

  useEffect(() => {
    if (!userId) return;
    storageReadyFor.current = userId;
    const loadedRecovery = readRecovery(userId);
    if (loadedRecovery?.quote && loadedRecovery.idempotencyKey) {
      setRecovery(loadedRecovery);
      setQuote(loadedRecovery.quote);
      setCustomerNo(loadedRecovery.quote.customer_no);
    }
    // Receipts and serials come from the server, never a browser-only ledger.
    setOrders([]);
    void load(true);
  }, [userId, load]);

  useEffect(() => {
    if (!userId || storageReadyFor.current !== userId) return;
    storeRecovery(userId, recovery);
  }, [userId, recovery]);
  useEffect(() => {
    if (!recovery?.uncertain || purchaseBusy || !data) return;
    let cancelled = false, running = false;
    const recover = async () => {
      if (running) return; running = true;
      try {
        const result = await recoverPpobOrder(recovery.idempotencyKey, recovery.quote.id);
        if (cancelled) return;
        if (result.order) {
          const order = result.order;
          setOrders(current => [order, ...current.filter(item => item.id !== order.id)]);
          setRecovery(null); setQuote(null); setPin(''); setConfirmed(false); setActiveTab('history');
          setNotice('Pesanan berhasil dipulihkan. Saldo tidak dipotong kembali.');
          void refreshData();
          void load();
        } else if (result.quote_expired) {
          setRecovery(null); setQuote(null); setPin(''); setConfirmed(false);
          setNotice('Server memastikan tidak ada pesanan dari referensi ini dan penawarannya sudah kedaluwarsa. Anda dapat meminta penawaran baru.');
        }
      } catch { /* No response is not proof that no debit occurred. Keep the same key. */ }
      finally { running = false; }
    };
    void recover();
    const timer = window.setInterval(() => { void recover(); }, 10000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [recovery, purchaseBusy, data?.csrf_token, refreshData, load]);

  const categories = useMemo(() => ['Semua', ...Array.from(new Set((data?.products ?? []).map(product => product.category))).sort()], [data?.products]);
  const products = useMemo(() => (data?.products ?? []).filter(product => {
    const term = search.trim().toLocaleLowerCase('id-ID');
    return (!term || `${product.name} ${product.brand} ${product.category} ${product.sku}`.toLocaleLowerCase('id-ID').includes(term))
      && (category === 'Semua' || category === product.category);
  }), [data?.products, search, category]);
  const selectedProduct = data?.products.find(product => product.sku === selectedSku);
  const displayedOrders = useMemo(() => {
    const map = new Map<string, PpobOrder>((data?.orders ?? []).map(order => [order.id, order]));
    orders.forEach(order => map.set(order.id, order));
    return Array.from(map.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [orders, data?.orders]);

  useEffect(() => {
    if (!quote) { setSecondsLeft(0); return; }
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(quote.expires_at).getTime() - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [quote]);

  // Refresh only recoverable orders, at a calm 10-second cadence. Terminal orders leave the polling set.
  const pollIds = useMemo(() => displayedOrders.filter(order => order.status === 'pending' || order.status === 'review').map(order => order.id).sort().join(','), [displayedOrders]);
  useEffect(() => {
    if (!pollIds) return;
    let cancelled = false;
    const poll = async () => {
      const ids = pollIds.split(',');
      await Promise.all(ids.map(async id => {
        try {
          const fresh = await getPpobOrder(id);
          if (cancelled) return;
          setPollErrors(current => { const next = { ...current }; delete next[id]; return next; });
          setOrders(current => current.map(order => order.id === id ? fresh : order));
          if (fresh.status !== 'pending' && fresh.status !== 'review') {
            setData(current => current ? { ...current, orders: current.orders.map(order => order.id === id ? fresh : order) } : current);
            void refreshData();
            void load();
          }
        } catch (error) {
          if (!cancelled) setPollErrors(current => ({ ...current, [id]: explain(error) }));
        }
      }));
    };
    void poll();
    const timer = window.setInterval(() => { void poll(); }, 10000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [pollIds, refreshData, load]);

  const createQuote = async () => {
    if (!data || !selectedProduct || !customerNo.trim()) return;
    if (recovery?.uncertain) { setNotice('Pulihkan pesanan sebelumnya sebelum membuat penawaran baru.'); return; }
    setQuoteBusy(true);
    setNotice('');
    setConfirmed(false);
    setPin('');
    try {
      const fresh = await createPpobQuote(data.csrf_token, selectedProduct.sku, customerNo.trim());
      const nextRecovery = { quote: fresh, idempotencyKey: makeKey(), uncertain: false };
      setQuote(fresh);
      setRecovery(nextRecovery);
    } catch (error) { setNotice(explain(error)); }
    finally { setQuoteBusy(false); }
  };
  const clearQuote = () => {
    if (recovery?.uncertain || purchaseBusy) { setNotice('Referensi tetap disimpan sampai server memastikan hasil pesanan.'); return; }
    setQuote(null);
    setRecovery(null);
    setConfirmed(false);
    setPin('');
    setNotice('');
  };
  const buy = async () => {
    if (!data || !quote || !recovery || pin.length !== 6 || !confirmed || purchaseBusy) return;
    if (!recovery.uncertain && secondsLeft <= 0) {
      setNotice('Quote telah kedaluwarsa. Buat quote baru sebelum melanjutkan.');
      return;
    }
    setPurchaseBusy(true);
    setNotice('');
    const attempted = { ...recovery, uncertain: true };
    if (!userId || !storeRecovery(userId, attempted)) {
      setPurchaseBusy(false);
      setNotice('Penyimpanan referensi aman tidak tersedia di browser ini. Pembelian belum dikirim.');
      return;
    }
    // Save BEFORE sending so reload/connection loss cannot create another purchase.
    setRecovery(attempted);
    try {
      const order = await purchasePpob(data.csrf_token, recovery.quote.id, pin, recovery.idempotencyKey);
      setOrders(current => [order, ...current.filter(item => item.id !== order.id)]);
      setRecovery(null);
      setQuote(null);
      setPin('');
      setConfirmed(false);
      setActiveTab('history');
      setNotice(order.status === 'success'
        ? 'Order berhasil diproses oleh provider.'
        : order.status === 'failed'
          ? 'Order dinyatakan gagal. Periksa rincian status dan pengembalian saldo.'
          : 'Order tercatat dan masih diproses. Status akan diperbarui otomatis.');
      await refreshData();
      await load();
    } catch (error) {
      setPin('');
      if (error instanceof PpobApiError && error.status === 409) {
        setRecovery(null);
        setQuote(null);
        setNotice(explain(error));
      } else {
        setRecovery(attempted);
        setNotice(`${explain(error)} Referensi yang sama tetap disimpan. Sistem akan memeriksa pesanan; jangan membuat pembelian ulang.`);
        void refreshData();
      }
    } finally { setPurchaseBusy(false); }
  };
  const retryOrder = async (id: string) => {
    try {
      const fresh = await getPpobOrder(id);
      setOrders(current => current.map(order => order.id === id ? fresh : order));
      setPollErrors(current => { const next = { ...current }; delete next[id]; return next; });
      if (fresh.status !== 'pending' && fresh.status !== 'review') { void refreshData(); void load(); }
    } catch (error) { setPollErrors(current => ({ ...current, [id]: explain(error) })); }
  };

  const unlocked = !!data?.enabled && data.mode === 'live';
  const hasPin = data ? data.has_pin : !!currentUser?.has_pin;
  const quoteExpired = !!quote && secondsLeft <= 0;

  return (
    <div className="ppob-page mx-auto w-full max-w-[1120px] px-4 pb-8 pt-5 text-[#173248] sm:px-6 lg:px-8" data-testid="ppob-customer">
      <header className="ppob-enter mb-5 flex items-start justify-between gap-4 border-b border-[#cbdde2] pb-5">
        <div><div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#087eaa]"><Wifi size={14} /> AdilaNet · Layanan digital</div><h1 className="text-[30px] font-extrabold tracking-[-.045em] sm:text-[36px]">Pulsa & tagihan</h1><p className="mt-1 text-sm text-[#647c8a]">Pembelian resmi melalui saldo AdilaNet.</p></div>
        <div className="mt-1 flex shrink-0 items-center gap-2 rounded-xl border border-[#d8e5e9] bg-[#fbfdfc] px-3 py-2.5"><Wallet size={17} className="text-[#087eaa]" /><div><span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#718995]">Saldo</span><span data-testid="ppob-customer-balance" className="block text-sm font-extrabold">{data ? rupiah(data.balance) : '—'}</span></div></div>
      </header>

      {pageLoading && <div className="grid gap-5 md:grid-cols-[1fr_310px]"><div className="h-80 animate-pulse rounded-2xl bg-white/70" /><div className="h-80 animate-pulse rounded-2xl bg-white/70" /></div>}
      {loadError && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div className="flex-1"><b className="text-sm">Layanan PPOB belum dapat dimuat</b><p className="mt-1 text-xs leading-5">{loadError}</p></div><button data-testid="ppob-retry" onClick={() => void load(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold"><RefreshCw size={13} /> Coba lagi</button></div>}

      {data && <>
        {!unlocked && <section className="ppob-enter mb-5 flex items-start gap-3 rounded-xl border border-[#d9e4e8] bg-[#f8fbfa] p-4" data-testid="ppob-locked-state">
          <LockKeyhole size={18} className="mt-0.5 shrink-0 text-[#607986]" /><div><h2 className="text-sm font-extrabold">Pembelian belum tersedia</h2><p className="mt-1 text-xs leading-5 text-[#647c8a]">{data.reason || (data.mode === 'test' ? 'Layanan sedang dalam mode pengujian. Pembelian pelanggan akan tersedia setelah layanan PPOB diaktifkan.' : 'PPOB sedang dinonaktifkan oleh pengelola.')}</p></div>
        </section>}
        {recovery?.uncertain && <section className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4" role="alert"><div className="flex items-start gap-3"><AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-800" /><div><h2 className="text-sm font-extrabold text-amber-950">Status transaksi belum dapat dipastikan</h2><p className="mt-1 text-xs leading-5 text-amber-900">Jangan buat quote baru. Pemulihan akan memakai quote yang sama dan kunci transaksi yang sama untuk mencegah debit ganda. PIN tidak disimpan.</p></div></div></section>}

        <div className="mb-5 flex items-center gap-1 rounded-xl border border-[#d8e5e9] bg-[#f7fbfa] p-1">
          <button onClick={() => setActiveTab('catalog')} className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-extrabold transition ${activeTab === 'catalog' ? 'bg-white text-[#087eaa] shadow-sm' : 'text-[#718995]'}`}><Smartphone size={15} /> Katalog</button>
          <button onClick={() => setActiveTab('history')} className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-extrabold transition ${activeTab === 'history' ? 'bg-white text-[#087eaa] shadow-sm' : 'text-[#718995]'}`}><Clock3 size={15} /> Riwayat {displayedOrders.length > 0 && <span className="rounded-full bg-[#e8f2f3] px-1.5 py-0.5 text-[10px]">{displayedOrders.length}</span>}</button>
        </div>

        {activeTab === 'catalog' ? <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-2xl border border-[#d8e5e9] bg-[#fbfdfc]">
            <div className="border-b border-[#e1ebed] p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#087eaa]">Katalog resmi</p><h2 className="mt-1 text-lg font-extrabold">Pilih produk</h2></div><div className="flex gap-2"><label className="relative min-w-0 flex-1 sm:flex-none"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718995]" /><input aria-label="Cari katalog produk" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk" className="h-10 w-full rounded-lg border border-[#d8e5e9] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#087eaa] sm:w-44" /></label><label className="relative"><span className="sr-only">Filter kategori</span><select value={category} onChange={e => setCategory(e.target.value)} className="h-10 max-w-32 appearance-none rounded-lg border border-[#d8e5e9] bg-white pl-3 pr-7 text-xs"><option>Semua</option>{categories.slice(1).map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#718995]" /></label></div></div></div>
            {data.products.length === 0 ? <div className="px-6 py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f2f3] text-[#087eaa]"><CreditCard size={23} /></div><h3 className="mt-4 text-sm font-extrabold">Katalog belum tersedia</h3><p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[#718995]">Produk PPOB belum diaktifkan. Silakan kembali setelah katalog layanan tersedia.</p></div> :
              <div className="divide-y divide-[#e6eef0]">
                {products.map(product => <button key={product.sku} type="button" disabled={!product.available} onClick={() => setSelectedSku(product.sku)} className={`flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-[#f4f9f8] disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 ${selectedSku === product.sku ? 'bg-[#edf7f6]' : ''}`} data-testid={`ppob-catalog-product-${product.sku}`}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${selectedSku === product.sku ? 'bg-[#087eaa] text-white' : 'bg-[#e8f2f3] text-[#087eaa]'}`}><Smartphone size={18} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{product.name}</span><span className="mt-0.5 block truncate text-[11px] text-[#718995]">{product.brand} · {product.category}</span><span className="ppob-mono mt-1 block truncate text-[9px] text-[#8aa0a8]">{product.sku}</span></span>
                  <span className="shrink-0 text-right"><span className="block text-sm font-extrabold">{rupiah(product.sell_price)}</span><span className={`mt-1 block text-[9px] font-extrabold ${product.available ? 'text-teal-800' : 'text-[#899da5]'}`}>{product.available ? 'Tersedia' : 'Tidak tersedia'}</span></span>
                  {selectedSku === product.sku && <Check size={16} className="shrink-0 text-[#087eaa]" />}
                </button>)}
                {products.length === 0 && <div className="p-8 text-center text-xs text-[#718995]">Produk tidak ditemukan.</div>}
              </div>}
          </section>

          <section className="rounded-2xl border border-[#d8e5e9] bg-[#fbfdfc] p-4 sm:p-5">
            <div className="mb-4"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#087eaa]">Pemesanan</p><h2 className="mt-1 text-lg font-extrabold">Tujuan & konfirmasi</h2></div>
            {quote && recovery ? <div className="space-y-4">
              {recovery.uncertain && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">Pemulihan order menggunakan quote tersimpan; transaksi mungkin telah diteruskan pada percobaan sebelumnya.</div>}
              <div data-testid="ppob-quote" className="rounded-xl border border-[#cfe1e5] bg-[#f1f8f7] p-4">
                <div className="flex items-center justify-between gap-2"><span className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#718995]">Penawaran server</span><span className={`ppob-mono inline-flex items-center gap-1 text-[10px] font-bold ${quoteExpired ? 'text-rose-800' : 'text-[#466675]'}`}><Clock3 size={12} />{recovery.uncertain ? 'Pemulihan aman' : quoteExpired ? 'Kedaluwarsa' : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}</span></div>
                <p className="mt-2 text-sm font-extrabold">{quote.product_name}</p><div className="mt-3 space-y-2 border-t border-[#d8e5e9] pt-3 text-xs"><div className="flex justify-between gap-3"><span className="text-[#718995]">Nomor tujuan</span><span className="ppob-mono font-bold">{quote.customer_no}</span></div><div className="flex justify-between gap-3"><span className="text-[#718995]">Total debit saldo</span><span className="text-base font-extrabold">{rupiah(quote.price)}</span></div><div className="flex justify-between gap-3"><span className="text-[#718995]">Berlaku sampai</span><span className="text-right font-semibold">{time(quote.expires_at)}</span></div></div>
              </div>
              {quoteExpired && !recovery.uncertain && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900"><div className="flex items-start gap-2"><AlertCircle size={15} className="mt-0.5 shrink-0" /><span>Harga dapat berubah dan quote kedaluwarsa sebelum saldo didebit.</span></div><button data-testid="ppob-quote-refresh" onClick={() => void createQuote()} disabled={quoteBusy} className="mt-2 inline-flex items-center gap-1.5 font-extrabold text-rose-900 underline underline-offset-2 disabled:opacity-50">{quoteBusy ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />} Ambil quote terbaru</button></div>}
              <label className={`block text-[10px] font-extrabold uppercase tracking-wider ${hasPin ? 'text-[#718995]' : 'text-[#718995]'}`}>PIN transaksi 6 digit<input data-testid="ppob-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" disabled={!hasPin || !unlocked} className="ppob-mono mt-1.5 h-12 w-full rounded-lg border border-[#d8e5e9] bg-white px-3 text-center text-lg tracking-[.45em] text-[#173248] outline-none focus:border-[#087eaa] disabled:bg-[#f1f5f5]" /></label>
              {!hasPin && <p className="text-xs text-amber-900">PIN transaksi belum tersedia. <Link to="/user/profile" className="font-extrabold text-[#087eaa] underline underline-offset-2">Atur PIN di profil</Link></p>}
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#d8e5e9] bg-white p-3 text-xs leading-5 text-[#466675]"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={!unlocked} className="mt-0.5 h-4 w-4 shrink-0 accent-[#087eaa]" /><span>Saya memastikan produk dan nomor tujuan benar, serta menyetujui debit saldo sebesar <b>{rupiah(quote.price)}</b>.</span></label>
              <button data-testid="ppob-purchase" onClick={() => void buy()} disabled={!unlocked || !hasPin || !confirmed || pin.length !== 6 || purchaseBusy || (quoteExpired && !recovery.uncertain)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#087eaa] text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(7,94,126,.18)] transition hover:bg-[#075b7b] disabled:cursor-not-allowed disabled:opacity-45">
                {purchaseBusy ? <><LoaderCircle size={16} className="animate-spin" /> Mengirim dengan aman</> : recovery.uncertain ? <><RefreshCw size={15} /> Pulihkan order ini</> : <><ShieldCheck size={16} /> Konfirmasi & bayar saldo</>}
              </button>
              {!recovery.uncertain && <button onClick={clearQuote} className="w-full py-1 text-xs font-bold text-[#718995] hover:text-[#173248]">Batalkan penawaran</button>}
            </div> : <form onSubmit={e => { e.preventDefault(); void createQuote(); }} className="space-y-4">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#718995]">Nomor tujuan<input data-testid="ppob-target" type="text" autoComplete="off" value={customerNo} onChange={e => setCustomerNo(e.target.value)} placeholder="Nomor pelanggan / telepon" className="mt-1.5 h-12 w-full rounded-lg border border-[#d8e5e9] bg-white px-3 text-sm font-semibold text-[#173248] outline-none focus:border-[#087eaa]" /></label>
              {selectedProduct && <div className="flex items-center justify-between gap-2 rounded-lg bg-[#f1f7f6] p-3"><span className="text-xs text-[#718995]">Harga katalog tertera</span><span className="text-sm font-extrabold">{rupiah(selectedProduct.sell_price)}</span></div>}
              <p className="text-[11px] leading-5 text-[#718995]">Harga final, nomor tujuan, dan masa berlaku ditentukan server sebelum pembayaran. Tidak ada saldo yang dipotong saat meminta quote.</p>
              <button data-testid="ppob-quote-request" type="submit" disabled={!unlocked || !selectedProduct?.available || !customerNo.trim() || quoteBusy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#087eaa] text-sm font-extrabold text-white transition hover:bg-[#075b7b] disabled:cursor-not-allowed disabled:opacity-45">{quoteBusy ? <><LoaderCircle size={16} className="animate-spin" /> Meminta quote</> : <>Lihat penawaran server <ArrowRight size={16} /></>}</button>
            </form>}
            {notice && <div role="status" className={`mt-4 rounded-lg border p-3 text-xs leading-5 ${notice.includes('berhasil') ? 'border-teal-200 bg-teal-50 text-teal-900' : 'border-[#d8e5e9] bg-[#f4f8f8] text-[#466675]'}`} data-testid="ppob-notice">{notice}</div>}
            <div className="mt-5 flex items-start gap-2 border-t border-[#e1ebed] pt-4 text-[10px] leading-5 text-[#718995]"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#087eaa]" /><span>Pembayaran hanya berjalan setelah Anda menyetujui penawaran dan mengonfirmasi dengan PIN. Jangan bagikan PIN kepada siapa pun.</span></div>
          </section>
        </div> : <section className="rounded-2xl border border-[#d8e5e9] bg-[#fbfdfc]">
          <div className="flex items-center justify-between border-b border-[#e1ebed] p-4 sm:p-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#087eaa]">Jejak pembayaran</p><h2 className="mt-1 text-lg font-extrabold">Riwayat order PPOB</h2></div><button data-testid="ppob-history-refresh" onClick={() => void load()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d8e5e9] bg-white px-3 text-xs font-bold text-[#466675]"><RefreshCw size={13} /> Segarkan</button></div>
          {displayedOrders.length === 0 ? <div className="px-6 py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f2f3] text-[#087eaa]"><Clock3 size={22} /></div><h3 className="mt-4 text-sm font-extrabold">Belum ada transaksi</h3><p className="mt-1 text-xs text-[#718995]">Order PPOB yang Anda buat akan tercatat di sini.</p><button onClick={() => setActiveTab('catalog')} className="mt-4 text-xs font-extrabold text-[#087eaa]">Lihat katalog</button></div> :
            <div className="divide-y divide-[#e6eef0]">{displayedOrders.map(order => <article key={order.id} className="p-4 sm:p-5" data-testid={`ppob-customer-order-${order.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-extrabold">{order.product_name}</h3><OrderStatus status={order.status} /></div><p className="ppob-mono mt-1 text-[10px] text-[#718995]">{order.reference}</p></div><span className="text-sm font-extrabold">{rupiah(order.amount)}</span></div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3"><div><span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#8aa0a8]">Nomor tujuan</span><span className="ppob-mono mt-1 block font-semibold">{order.customer_no}</span></div><div><span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#8aa0a8]">Waktu order</span><span className="mt-1 block font-semibold">{time(order.created_at)}</span></div><div><span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#8aa0a8]">Pembaruan</span><span className="mt-1 block font-semibold">{time(order.updated_at)}</span></div></div>
              {(order.message || order.serial) && <div className="mt-3 rounded-lg bg-[#f1f7f6] px-3 py-2.5 text-xs leading-5"><span className="font-bold">{order.message}</span>{order.serial && <span className="ppob-mono mt-1 block text-[10px] text-[#466675]">Serial: {order.serial}</span>}</div>}
              {order.refunded_at && <div className="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900">Pengembalian saldo tercatat pada {time(order.refunded_at)}.</div>}
              {(order.status === 'pending' || order.status === 'review') && <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#718995]"><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> Status diperiksa otomatis</span>{pollErrors[order.id] && <button data-testid={`ppob-retry-order-${order.id}`} onClick={() => void retryOrder(order.id)} className="inline-flex items-center gap-1 font-extrabold text-[#087eaa]"><RefreshCw size={12} /> Coba lagi</button>}</div>}
            </article>)}</div>}
        </section>}
      </>}
      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#718995]"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Pembayaran tercatat aman di AdilaNet</span><Link to="/user/topup" className="inline-flex items-center gap-1 font-bold text-[#087eaa]">Tambah saldo <ArrowRight size={12} /></Link></footer>
    </div>
  );
}