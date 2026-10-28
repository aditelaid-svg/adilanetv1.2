import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownUp, BadgeCheck, Check, ChevronDown, CircleHelp, Clock3, CloudDownload, LoaderCircle, RefreshCw, Save, Search, ShieldCheck, Signal, WalletCards } from 'lucide-react';
import { useAppContext } from '../../AppContext';
import { useToast } from '../../components/Toast';
import { configurePpob, getPpobAdmin, PpobAdmin, PpobAdminProduct, PpobOrder, recheckPpobOrder, syncPpobProducts, testPpobConnection, updatePpobProduct } from '../../lib/ppob';

type ConfigDraft = { enabled: boolean; mode: 'test' | 'live'; default_markup: number; max_order: number; daily_limit: number };
type ProductDraft = { name: string; description: string; enabled: boolean; fixed_price: string; markup: string };
const money = (value: number | null | undefined) => value == null ? '—' : `Rp${new Intl.NumberFormat('id-ID').format(value)}`;
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Belum tersedia';
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Permintaan tidak dapat diselesaikan. Coba lagi.';

function StatusPill({ status }: { status: PpobOrder['status'] }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    review: 'bg-orange-50 text-orange-800 border-orange-200',
    success: 'bg-teal-50 text-teal-800 border-teal-200',
    failed: 'bg-rose-50 text-rose-800 border-rose-200',
  };
  const labels = { pending: 'Menunggu', review: 'Perlu ditinjau', success: 'Berhasil', failed: 'Gagal' };
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles[status]}`} data-testid={`status-order-${status}`}>{labels[status]}</span>;
}

export default function AdminPpob() {
  const { refreshData } = useAppContext();
  const toast = useToast();
  const [data, setData] = useState<PpobAdmin | null>(null);
  const [configDraft, setConfigDraft] = useState<ConfigDraft | null>(null);
  const [productDrafts, setProductDrafts] = useState<Record<string, ProductDraft>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [connectionResult, setConnectionResult] = useState<{ balance: number; at: string } | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Semua');
  const [orderFilter, setOrderFilter] = useState('Semua');

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const fresh = await getPpobAdmin();
      setData(fresh);
      setLoadError('');
      setConfigDraft(previous => previous ?? {
        enabled: fresh.config.enabled, mode: fresh.config.mode,
        default_markup: fresh.config.default_markup, max_order: fresh.config.max_order,
        daily_limit: fresh.config.daily_limit,
      });
      setProductDrafts(previous => {
        const next = { ...previous };
        fresh.products.forEach(product => {
          if (!next[product.sku]) next[product.sku] = {
            name: product.name, description: product.description, enabled: product.enabled,
            fixed_price: product.fixed_price == null ? '' : String(product.fixed_price),
            markup: product.markup == null ? '' : String(product.markup),
          };
        });
        return next;
      });
    } catch (error) {
      setLoadError(errorText(error));
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const timer = window.setInterval(() => { void load(); }, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const categories = useMemo(() => ['Semua', ...Array.from(new Set((data?.products ?? []).map(product => product.category))).sort()], [data?.products]);
  const visibleProducts = useMemo(() => (data?.products ?? []).filter(product => {
    const draft = productDrafts[product.sku];
    const term = query.trim().toLocaleLowerCase('id-ID');
    const matchesText = !term || `${draft?.name ?? product.name} ${product.sku} ${product.brand} ${product.category}`.toLocaleLowerCase('id-ID').includes(term);
    return matchesText && (category === 'Semua' || product.category === category);
  }), [data?.products, productDrafts, query, category]);
  const visibleOrders = useMemo(() => (data?.orders ?? []).filter(order => orderFilter === 'Semua' || order.status === orderFilter), [data?.orders, orderFilter]);

  const runSync = async () => {
    if (!data) return;
    setBusy('sync');
    try {
      const result = await syncPpobProducts(data.csrf_token);
      await load();
      toast.success('Sinkronisasi katalog selesai', `${result.count} produk diterima dari provider.`);
    } catch (error) { toast.error('Sinkronisasi gagal', errorText(error)); }
    finally { setBusy(''); }
  };
  const runConnection = async () => {
    if (!data) return;
    setBusy('connection');
    setConnectionResult(null);
    try {
      const result = await testPpobConnection(data.csrf_token);
      const checkedAt = new Date().toISOString();
      setConnectionResult({ balance: result.balance, at: checkedAt });
      await load();
      toast.success('Koneksi provider teruji', `Saldo provider ${money(result.balance)}.`);
    } catch (error) { toast.error('Pemeriksaan koneksi gagal', errorText(error)); }
    finally { setBusy(''); }
  };
  const saveConfig = async () => {
    if (!data || !configDraft) return;
    if (configDraft.mode === 'live' && configDraft.enabled && (!cfg.enabled || cfg.mode !== 'live')) {
      const approved = await toast.confirm(
        'Aktifkan PPOB live?',
        'Pembelian pelanggan akan menggunakan saldo nyata dan meneruskan transaksi ke Digiflazz. Pastikan kredensial, webhook, dan batas transaksi sudah benar.',
        { confirmText: 'Aktifkan live', cancelText: 'Periksa kembali', danger: true },
      );
      if (!approved) return;
    }
    setBusy('config');
    try {
      const saved = await configurePpob(data.csrf_token, configDraft);
      setData(current => current ? { ...current, config: saved } : current);
      setConfigDraft({ enabled: saved.enabled, mode: saved.mode, default_markup: saved.default_markup, max_order: saved.max_order, daily_limit: saved.daily_limit });
      toast.success('Konfigurasi tersimpan');
    } catch (error) { toast.error('Konfigurasi gagal disimpan', errorText(error)); }
    finally { setBusy(''); }
  };
  const patchProduct = (sku: string, patch: Partial<ProductDraft>) => setProductDrafts(current => ({ ...current, [sku]: { ...current[sku], ...patch } }));
  const saveProduct = async (product: PpobAdminProduct) => {
    if (!data) return;
    const draft = productDrafts[product.sku];
    const integerOrNull = (raw: string, label: string): number | null => {
      if (!raw.trim()) return null;
      const value = Number(raw);
      if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} harus berupa bilangan bulat rupiah atau kosong.`);
      return value;
    };
    try {
      const fixed_price = integerOrNull(draft.fixed_price, 'Harga tetap');
      const markup = integerOrNull(draft.markup, 'Markup produk');
      if (!draft.name.trim()) throw new Error('Nama produk wajib diisi.');
      setBusy(`product:${product.sku}`);
      const saved = await updatePpobProduct(data.csrf_token, product.sku, {
        name: draft.name.trim(), description: draft.description.trim(), enabled: draft.enabled, fixed_price, markup,
      });
      setData(current => current ? { ...current, products: current.products.map(item => item.sku === saved.sku ? saved : item) } : current);
      setProductDrafts(current => ({ ...current, [saved.sku]: {
        name: saved.name, description: saved.description, enabled: saved.enabled,
        fixed_price: saved.fixed_price == null ? '' : String(saved.fixed_price),
        markup: saved.markup == null ? '' : String(saved.markup),
      } }));
      toast.success('Produk diperbarui', saved.name);
    } catch (error) { toast.error('Produk gagal disimpan', errorText(error)); }
    finally { setBusy(''); }
  };
  const recheck = async (order: PpobOrder) => {
    if (!data) return;
    setBusy(`order:${order.id}`);
    try {
      const result = await recheckPpobOrder(data.csrf_token, order.id);
      await load();
      toast.info(result.queued ? 'Pemeriksaan dijadwalkan' : 'Permintaan diterima', `Order ${order.reference}`);
    } catch (error) { toast.error('Pemeriksaan gagal', errorText(error)); }
    finally { setBusy(''); }
  };

  const cfg = data?.config;
  return (
    <div className="ppob-page mx-auto w-full max-w-[1440px] px-4 pb-8 pt-5 text-[#173248] sm:px-6 lg:px-8" data-testid="ppob-admin">
      <div className="ppob-enter mb-7 flex flex-col gap-4 border-b border-[#cbdde2] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.2em] text-[#087eaa]"><Activity size={15} /> Finance operations / PPOB</div>
          <h1 className="text-3xl font-extrabold tracking-[-.04em] md:text-[38px]">PPOB Control</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#647c8a]">Katalog Digiflazz, kebijakan harga, konektivitas provider, dan jejak transaksi pelanggan.</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="ppob-sync" onClick={runSync} disabled={!data || !!busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#b9d2da] bg-white/80 px-4 text-sm font-bold text-[#24516a] transition hover:bg-white disabled:opacity-50">
            {busy === 'sync' ? <LoaderCircle size={16} className="animate-spin" /> : <CloudDownload size={16} />} Impor katalog
          </button>
          <button data-testid="ppob-connection" onClick={runConnection} disabled={!data || !!busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#087eaa] px-4 text-sm font-bold text-white shadow-[0_5px_14px_rgba(7,94,126,.18)] transition hover:bg-[#075b7b] disabled:opacity-50">
            {busy === 'connection' ? <LoaderCircle size={16} className="animate-spin" /> : <Signal size={16} />} Uji koneksi
          </button>
        </div>
      </div>

      {loading && <div className="grid gap-3 sm:grid-cols-3"><div className="h-28 animate-pulse rounded-2xl bg-white/70" /><div className="h-28 animate-pulse rounded-2xl bg-white/70" /><div className="h-28 animate-pulse rounded-2xl bg-white/70" /></div>}
      {loadError && <section className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900" role="alert"><div className="flex gap-3"><AlertTriangle size={20} /><div className="flex-1"><b>Data PPOB belum dapat dimuat</b><p className="mt-1 text-sm">{loadError}</p></div><button data-testid="ppob-retry" onClick={() => void load(true)} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-bold">Coba lagi</button></div></section>}
      {!loading && !data && !loadError && <div className="rounded-2xl border border-[#d8e5e9] bg-white/80 p-8 text-center text-sm text-[#647c8a]">Data belum tersedia.</div>}

      {data && cfg && configDraft && <>
        <section className="ppob-enter-delay mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Order tercatat', value: data.summary.total, note: 'Akumulasi seluruh status', icon: ArrowDownUp },
            { label: 'Menunggu / tinjau', value: data.summary.pending + data.summary.review, note: `${data.summary.pending} pending · ${data.summary.review} review`, icon: Clock3 },
            { label: 'Omzet tercatat', value: money(data.summary.revenue), note: 'Berdasarkan order provider', icon: WalletCards },
            { label: 'Margin tercatat', value: money(data.summary.margin), note: 'Nilai laporan dari server', icon: BadgeCheck },
          ].map(item => <div key={item.label} className="rounded-2xl border border-[#d8e5e9] bg-[#fbfdfc] p-4 shadow-[0_4px_16px_rgba(31,76,91,.035)]">
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-[.11em] text-[#718995]"><span>{item.label}</span><item.icon size={16} className="text-[#087eaa]" /></div>
            <div className="mt-3 text-[25px] font-extrabold tracking-[-.035em] text-[#173248]">{item.value}</div><div className="mt-1 text-xs text-[#718995]">{item.note}</div>
          </div>)}
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
          <div className="min-w-0 space-y-6">
            <section className="overflow-hidden rounded-2xl border border-[#d8e5e9] bg-[#fbfdfc]">
              <div className="flex flex-col justify-between gap-3 border-b border-[#e1ebed] p-5 sm:flex-row sm:items-center">
                <div><p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#087eaa]">Provider catalogue</p><h2 className="mt-1 text-xl font-extrabold tracking-tight">Produk dan harga</h2><p className="mt-1 text-xs text-[#718995]">Harga jual: harga tetap, atau cost + markup produk/default.</p></div>
                <div className="flex flex-wrap gap-2">
                  <label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718995]" /><input aria-label="Cari produk" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama / SKU" className="h-10 w-44 rounded-lg border border-[#d8e5e9] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#087eaa]" /></label>
                  <label className="relative"><span className="sr-only">Kategori</span><select value={category} onChange={e => setCategory(e.target.value)} className="h-10 appearance-none rounded-lg border border-[#d8e5e9] bg-white pl-3 pr-8 text-sm outline-none focus:border-[#087eaa]">{categories.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718995]" /></label>
                </div>
              </div>
              {!data.products.length ? <div className="px-6 py-12 text-center"><CloudDownload size={28} className="mx-auto text-[#78919c]" /><h3 className="mt-3 font-bold">Katalog belum diimpor</h3><p className="mx-auto mt-1 max-w-sm text-sm text-[#718995]">Impor produk langsung dari Digiflazz. Daftar produk hanya akan menampilkan data provider.</p><button data-testid="ppob-sync-empty" onClick={runSync} className="mt-4 rounded-lg bg-[#087eaa] px-4 py-2.5 text-sm font-bold text-white">Impor katalog</button></div> :
                <div className="divide-y divide-[#e6eef0]">
                  {visibleProducts.map(product => {
                    const draft = productDrafts[product.sku];
                    const saving = busy === `product:${product.sku}`;
                    return <article key={product.sku} className="grid gap-x-5 gap-y-4 p-4 md:grid-cols-[minmax(170px,1fr)_minmax(220px,1.15fr)_minmax(200px,.9fr)_auto] md:items-center md:p-5" data-testid={`ppob-product-${product.sku}`}>
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap gap-1.5"><span className="rounded bg-[#e8f2f3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#466675]">{product.category}</span><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${product.provider_active ? 'bg-teal-50 text-teal-800' : 'bg-rose-50 text-rose-700'}`}>{product.provider_active ? 'Provider aktif' : 'Provider nonaktif'}</span></div>
                        <p className="text-sm font-extrabold">{product.brand}</p>
                        <p className="ppob-mono mt-1 truncate text-[10px] text-[#718995]" title={product.sku}>{product.sku}</p>
                        <p className="mt-1 text-xs text-[#718995]">Modal {money(product.cost_price)} · Jual {money(product.sell_price)}</p>
                      </div>
                      <div className="grid gap-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#718995]">Nama tampil<input aria-label={`Nama produk ${product.sku}`} value={draft?.name ?? product.name} onChange={e => patchProduct(product.sku, { name: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-[#d8e5e9] bg-white px-3 text-sm font-semibold normal-case tracking-normal text-[#173248] outline-none focus:border-[#087eaa]" /></label>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#718995]">Deskripsi<input aria-label={`Deskripsi produk ${product.sku}`} value={draft?.description ?? product.description} onChange={e => patchProduct(product.sku, { description: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-[#d8e5e9] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[#173248] outline-none focus:border-[#087eaa]" /></label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#718995]">Harga tetap<input inputMode="numeric" aria-label={`Harga tetap ${product.sku}`} placeholder="Otomatis" value={draft?.fixed_price ?? ''} onChange={e => patchProduct(product.sku, { fixed_price: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-[#d8e5e9] bg-white px-2.5 text-sm font-semibold text-[#173248] outline-none focus:border-[#087eaa]" /></label>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#718995]">Markup produk<input inputMode="numeric" aria-label={`Markup produk ${product.sku}`} placeholder={`Default ${money(cfg.default_markup)}`} value={draft?.markup ?? ''} onChange={e => patchProduct(product.sku, { markup: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-[#d8e5e9] bg-white px-2.5 text-sm font-semibold text-[#173248] outline-none focus:border-[#087eaa]" /></label>
                        <label className="col-span-2 flex cursor-pointer items-center gap-2 text-xs font-bold text-[#466675]"><input type="checkbox" checked={draft?.enabled ?? product.enabled} onChange={e => patchProduct(product.sku, { enabled: e.target.checked })} className="h-4 w-4 accent-[#087eaa]" />Aktif untuk pelanggan</label>
                      </div>
                      <button data-testid={`ppob-product-save-${product.sku}`} disabled={!!busy} onClick={() => void saveProduct(product)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#b9d2da] bg-white px-3 text-xs font-extrabold text-[#24516a] transition hover:border-[#087eaa] disabled:opacity-50">
                        {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />} Simpan
                      </button>
                    </article>;
                  })}
                  {visibleProducts.length === 0 && <div className="p-8 text-center text-sm text-[#718995]">Tidak ada produk yang sesuai dengan pencarian ini.</div>}
                </div>}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#d8e5e9] bg-[#fbfdfc]">
              <div className="flex flex-col justify-between gap-3 border-b border-[#e1ebed] p-5 sm:flex-row sm:items-center"><div><p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#087eaa]">Ledger monitor</p><h2 className="mt-1 text-xl font-extrabold tracking-tight">Order pelanggan</h2></div><label className="relative self-start"><span className="sr-only">Filter status order</span><select value={orderFilter} onChange={e => setOrderFilter(e.target.value)} className="h-10 appearance-none rounded-lg border border-[#d8e5e9] bg-white pl-3 pr-8 text-sm"><option>Semua</option><option value="pending">Menunggu</option><option value="review">Perlu ditinjau</option><option value="success">Berhasil</option><option value="failed">Gagal</option></select><ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718995]" /></label></div>
              {!data.orders.length ? <div className="p-9 text-center text-sm text-[#718995]">Belum ada order PPOB tercatat.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f1f7f6] text-[10px] uppercase tracking-[.13em] text-[#718995]"><tr><th className="px-5 py-3">Order / pelanggan</th><th className="px-4 py-3">Produk / tujuan</th><th className="px-4 py-3">Nilai</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Dibuat</th><th className="px-5 py-3 text-right">Tindakan</th></tr></thead>
                <tbody className="divide-y divide-[#e6eef0]">{visibleOrders.map(order => <tr key={order.id} className="hover:bg-[#f7fbfa]" data-testid={`ppob-order-${order.id}`}><td className="px-5 py-3"><div className="font-bold">{order.user_name || 'Pelanggan'}</div><div className="ppob-mono mt-1 text-[10px] text-[#718995]">{order.reference}</div></td><td className="px-4 py-3"><div className="max-w-52 truncate font-semibold">{order.product_name}</div><div className="ppob-mono mt-1 text-[10px] text-[#718995]">{order.customer_no}</div></td><td className="px-4 py-3 font-bold">{money(order.amount)}</td><td className="px-4 py-3"><StatusPill status={order.status} />{order.refunded_at && <div className="mt-1 text-[10px] font-semibold text-[#718995]">Saldo dikembalikan</div>}</td><td className="px-4 py-3 text-xs text-[#718995]">{dateTime(order.created_at)}</td><td className="px-5 py-3 text-right">{(order.status === 'pending' || order.status === 'review') && <button data-testid={`ppob-recheck-${order.id}`} disabled={!!busy} onClick={() => void recheck(order)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8e5e9] bg-white px-3 py-2 text-xs font-bold text-[#24516a] hover:border-[#087eaa] disabled:opacity-50">{busy === `order:${order.id}` ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />} Periksa ulang</button>}</td></tr>)}</tbody>
              </table>{visibleOrders.length === 0 && <div className="p-8 text-center text-sm text-[#718995]">Tidak ada order pada status tersebut.</div>}</div>}
            </section>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-5">
            <section className="rounded-2xl border border-[#d8e5e9] bg-[#fbfdfc] p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#087eaa]">Runtime policy</p><h2 className="mt-1 text-xl font-extrabold">Konfigurasi PPOB</h2></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${cfg.enabled && cfg.mode === 'live' ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'}`}>{cfg.enabled ? cfg.mode : 'nonaktif'}</span></div>
              <div className="mt-5 space-y-4">
                <label className="flex items-center justify-between rounded-xl bg-[#f1f7f6] p-3.5"><span><span className="block text-sm font-extrabold">Layanan diaktifkan</span><span className="mt-0.5 block text-[11px] text-[#718995]">Kontrol global pembelian pelanggan</span></span><input data-testid="ppob-enabled" type="checkbox" checked={configDraft.enabled} onChange={e => setConfigDraft({ ...configDraft, enabled: e.target.checked })} className="h-5 w-5 accent-[#087eaa]" /></label>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#718995]">Mode pemrosesan<select data-testid="ppob-mode" value={configDraft.mode} onChange={e => setConfigDraft({ ...configDraft, mode: e.target.value as ConfigDraft['mode'] })} className="mt-1.5 h-11 w-full rounded-lg border border-[#d8e5e9] bg-white px-3 text-sm font-bold normal-case tracking-normal text-[#173248]"><option value="test">Test — pelanggan terkunci</option><option value="live">Live — provider aktif</option></select></label>
                <div className="grid grid-cols-2 gap-3">
                  {[['default_markup', 'Markup default'], ['max_order', 'Batas per order'], ['daily_limit', 'Batas harian']].map(([key, label]) => <label key={key} className="text-[10px] font-extrabold uppercase tracking-wider text-[#718995]">{label}<input inputMode="numeric" type="number" min="0" step="1" value={configDraft[key as keyof ConfigDraft] as number} onChange={e => setConfigDraft({ ...configDraft, [key]: Number(e.target.value) })} className="mt-1.5 h-10 w-full rounded-lg border border-[#d8e5e9] bg-white px-3 text-sm font-bold normal-case tracking-normal text-[#173248] outline-none focus:border-[#087eaa]" /></label>)}
                </div>
                <button data-testid="ppob-config-save" onClick={() => void saveConfig()} disabled={busy === 'config'} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#087eaa] text-sm font-extrabold text-white transition hover:bg-[#075b7b] disabled:opacity-50">{busy === 'config' ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Simpan konfigurasi</button>
              </div>
            </section>

            <section className="rounded-2xl border border-[#d8e5e9] bg-[#fbfdfc] p-5">
              <div className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#087eaa]" /><h3 className="font-extrabold">Kredensial & webhook</h3></div>
              <p className="mt-1 text-xs leading-5 text-[#718995]">Rahasia hanya dikelola pada environment server. Nilainya tidak pernah diminta atau ditampilkan di panel ini.</p>
              <div className="mt-4 space-y-2">
                {[['Kesiapan konfigurasi', cfg.configured], ['API provider', cfg.api_configured], ['Webhook secret', cfg.webhook_configured]].map(([label, configured]) => <div key={String(label)} className="flex items-center justify-between rounded-lg border border-[#e1ebed] px-3 py-2.5"><span className="text-xs font-semibold">{label}</span><span className={`inline-flex items-center gap-1 text-[10px] font-extrabold ${configured ? 'text-teal-800' : 'text-amber-800'}`}>{configured ? <Check size={13} /> : <AlertTriangle size={13} />}{configured ? 'Terkonfigurasi' : 'Belum disetel'}</span></div>)}
              </div>
              <div className="mt-3 rounded-lg bg-[#f1f7f6] p-3 text-[10px] leading-5 text-[#466675]"><p className="font-extrabold">Environment server wajib</p><p className="ppob-mono break-all">DIGIFLAZZ_USERNAME<br />DIGIFLAZZ_API_KEY<br />DIGIFLAZZ_WEBHOOK_SECRET</p></div>
              <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900"><CircleHelp size={15} className="mt-0.5 shrink-0" /><p>Atur webhook Digiflazz ke <span className="ppob-mono font-bold">/api/ppob/webhook</span> dan tambahkan IP server ke whitelist provider.</p></div>
            </section>

            <section className="rounded-2xl border border-[#d8e5e9] bg-[#fbfdfc] p-5">
              <h3 className="font-extrabold">Status konektivitas</h3>
              <div className="mt-3 space-y-3 text-xs">
                <div className="flex justify-between gap-3"><span className="text-[#718995]">Pemeriksaan terakhir</span><span className="text-right font-semibold">{dateTime(connectionResult?.at ?? cfg.connection_checked_at)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-[#718995]">Saldo provider</span><span className="font-extrabold">{connectionResult ? money(connectionResult.balance) : money(cfg.provider_balance)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-[#718995]">Sinkron katalog</span><span className="text-right font-semibold">{dateTime(cfg.last_sync_at)}</span></div>
              </div>
              <button data-testid="ppob-sync-secondary" onClick={runSync} disabled={!!busy} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#b9d2da] bg-white text-xs font-extrabold text-[#24516a] hover:border-[#087eaa] disabled:opacity-50">{busy === 'sync' ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sinkronkan katalog sekarang</button>
            </section>
          </aside>
        </div>
      </>}
    </div>
  );
}