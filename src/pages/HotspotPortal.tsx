import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, LockKeyhole, Wifi, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import type { Package } from '../AppContext';
import HotspotConnect from '../components/HotspotConnect';
import { clearPendingHotspotVoucher, connectHotspot, getPendingHotspotVoucher, navigateToHotspot } from '../lib/hotspot';
import { formatRupiah } from '../lib/format';
import { readApiResponse } from '../lib/apiResponse';

type HotspotContext = {
  has_context: boolean;
  on_network: boolean;
  router_id: number | null;
  router_name: string | null;
  login_url: string | null;
  error?: string | null;
  reason?: string | null;
};

function Background() {
  return <div className="coastal-bg fixed inset-0" aria-hidden="true">
    <div className="coastal-glow coastal-glow-1" /><div className="coastal-glow coastal-glow-2" /><div className="coastal-glow coastal-glow-3" />
  </div>;
}

export default function HotspotPortal() {
  const [searchParams] = useSearchParams();
  const connected = searchParams.get('connected') === '1';
  const [context, setContext] = useState<HotspotContext | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // A gateway may return to /hotspot without preserving ?connected=1.
  // Recover the attempt once on mount, and verify it without resubmitting.
  const [pending, setPending] = useState(() => getPendingHotspotVoucher());
  const verifyReturn = connected || !!pending;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [contextRes, packagesRes] = await Promise.all([
          fetch('/api/hotspot/context', { credentials: 'include' }),
          fetch('/api/hotspot/packages', { credentials: 'include' }),
        ]);
        const [contextJson, packagesJson] = await Promise.all([
          readApiResponse<{ success: boolean; data: HotspotContext; error?: string }>(contextRes),
          readApiResponse<{ success: boolean; data: Package[]; error?: string }>(packagesRes),
        ]);
        if (!contextRes.ok || !contextJson.success) throw new Error(contextJson.error || 'Status jaringan belum tersedia.');
        if (!packagesRes.ok || !packagesJson.success) throw new Error(packagesJson.error || 'Paket belum dapat dimuat.');
        if (!cancelled) {
          setContext(contextJson.data);
          if (!Array.isArray(packagesJson.data)) throw new Error('Format daftar paket tidak valid. Coba muat ulang.');
          setPackages(packagesJson.data);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat portal.');
          setPackages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Login Voucher & Beli Paket WiFi | AdilaNet';
    return () => { document.title = previous; };
  }, []);

  const submitVoucher = async (event: React.FormEvent) => {
    event.preventDefault();
    const voucher = code.trim();
    if (!voucher) {
      setError('Masukkan kode voucher terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const result = await connectHotspot(voucher, context?.router_id ?? undefined, false);
      if (result.redirect_url) {
        navigateToHotspot(result.redirect_url);
        return;
      }
      if (result.on_network) setNotice('Perangkat terdeteksi, tetapi permintaan login belum dikirim ke MikroTik.');
      else setError(result.error || 'Voucher belum dapat digunakan. Periksa kode dan coba lagi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Koneksi gagal. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden px-4 py-7 text-slate-800">
      <Background />
      <div className="relative z-10 mx-auto w-full max-w-[448px]">
        <header className="mb-6 flex items-center justify-between">
          <Link to="/hotspot" className="flex items-center gap-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-300">
            <span className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white bg-white/90 p-2 shadow-[0_8px_24px_rgba(14,116,144,.14)]">
              <img src="/logo.png" alt="AdilaNet" className="h-full w-full object-contain" />
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-tight">AdilaNet</span>
              <span className="block text-[11px] font-medium text-slate-500">Akses WiFi</span>
            </span>
          </Link>
          <span className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-semibold ${context?.on_network ? 'border-teal-200 bg-teal-50/90 text-teal-700' : 'border-white/90 bg-white/65 text-slate-500'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${context?.on_network ? 'bg-teal-500' : 'bg-slate-300'}`} />
            {context?.on_network ? 'Di jaringan' : 'Portal WiFi'}
          </span>
        </header>

        {verifyReturn ? (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-[28px] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><CheckCircle2 className="h-5 w-5" /></span>
              <div><h1 className="text-[19px] font-bold tracking-tight">Memeriksa koneksi</h1><p className="mt-0.5 text-[12px] text-slate-500">Verifikasi sesi voucher Anda.</p></div>
            </div>
            {pending ? <HotspotConnect voucherCode={pending.code} packageRouterId={pending.routerId ?? undefined} auto={false} verifyOnly /> :
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-[13px] text-amber-800">Data voucher tidak ditemukan di perangkat ini. Kembali ke portal dan masukkan kode secara manual.</div>}
            <Link data-testid="link-hotspot-back-to-entry" to="/hotspot" onClick={() => {
              setCode(pending?.code || '');
              clearPendingHotspotVoucher();
              setPending(null);
            }} className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-sky-700">Kembali ke portal <ArrowRight className="h-3.5 w-3.5" /></Link>
          </motion.section>
        ) : (
          <>
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }} className="glass-strong relative overflow-hidden rounded-[30px] p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl" />
              <div className="relative">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-sky-700">
                  <Wifi className="h-3.5 w-3.5" /> {context?.router_name || 'AdilaNet Hotspot'}
                </div>
                <h1 className="max-w-[330px] text-[32px] font-bold leading-[1.05] tracking-[-.04em] text-slate-800">Koneksi Anda,<br /><span className="text-sky-600">tinggal satu langkah.</span></h1>
                <p className="mt-3 max-w-[330px] text-[13px] leading-relaxed text-slate-500">Masukkan voucher yang sudah Anda miliki untuk mulai menjelajah.</p>

                <form onSubmit={submitVoucher} className="mt-6 space-y-3">
                  <label htmlFor="hotspot-voucher" className="block text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Kode voucher</label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input id="hotspot-voucher" data-testid="input-hotspot-voucher" value={code} onChange={e => { setCode(e.target.value); setError(''); }} autoCapitalize="characters" autoComplete="one-time-code" placeholder="Contoh: WFI-8K2M" className="w-full rounded-[17px] border border-slate-200/90 bg-white/90 py-4 pl-11 pr-4 font-mono text-[15px] font-semibold tracking-[.08em] text-slate-800 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
                  </div>
                  {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
                  {notice && <p role="status" className="rounded-xl border border-teal-100 bg-teal-50 px-3 py-2.5 text-[12px] text-teal-800">{notice}</p>}
                  {context?.error && !code && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-[11px] leading-relaxed text-rose-700">{context.error}</p>}
                  {!context?.has_context && !loading && <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">{context?.reason || 'Hubungkan perangkat ke WiFi AdilaNet untuk masuk otomatis.'}</p>}
                  {context?.login_url && <p data-testid="text-hotspot-gateway" className="break-all text-[11px] text-slate-500">Gateway login MikroTik: {context.login_url}</p>}
                  <button data-testid="button-hotspot-login" type="submit" disabled={submitting || loading} className="flex w-full items-center justify-center gap-2 rounded-[17px] bg-sky-600 px-4 py-4 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(2,132,199,.22)] transition hover:bg-sky-700 active:scale-[.99] disabled:cursor-wait disabled:opacity-60">
                    {submitting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Menghubungkan...</> : <>Login WiFi <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
                <div className="mt-5 flex items-center justify-center gap-2 border-t border-white/70 pt-4 text-[11px] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Kode voucher digunakan sebagai username dan password
                </div>
              </div>
            </motion.section>

            <section className="mt-7">
              <div className="mb-3 flex items-end justify-between px-1">
                <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-700">Pilih akses</p><h2 className="mt-1 text-[20px] font-bold tracking-tight">Belum punya voucher?</h2></div>
                {loading && <span className="text-[10px] font-semibold text-slate-400">Memuat…</span>}
              </div>
              {loadError && <div role="alert" className="mb-3 flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50 p-3 text-[11px] text-rose-700"><span>{loadError}</span><button onClick={() => window.location.reload()} className="font-bold underline">Coba lagi</button></div>}
              <div className="space-y-2.5">
                {loading && packages.length === 0 ? [1, 2].map(i => <div key={i} className="h-[88px] animate-pulse rounded-[22px] border border-white/80 bg-white/50" />) :
                  packages.length ? packages.map(pkg => (
                    <article key={pkg.id} className="glass rounded-[22px] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-[14px] font-bold text-slate-800">{pkg.name}</h3>
                          <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-medium text-slate-500">
                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{pkg.duration}</span>
                            <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" />{pkg.speed}</span>
                            <span>{pkg.quota}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[14px] font-bold text-slate-800">{formatRupiah(pkg.price)}</p>
                          <Link to={`/checkout/${pkg.id}`} className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-sky-700">QRIS <ArrowRight className="h-3 w-3" /></Link>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-white/70 pt-2.5">
                        <span className="text-[10px] text-slate-400">Bayar melalui QRIS atau saldo</span>
                        <Link to={`/login?next=${encodeURIComponent(`/user/buy?packageId=${pkg.id}`)}`} className="text-[10px] font-bold text-teal-700">Beli pakai saldo</Link>
                      </div>
                    </article>
                  )) : !loading ? <div className="glass rounded-[20px] px-4 py-6 text-center text-[12px] text-slate-500">Paket belum tersedia untuk jaringan ini.</div> : null}
              </div>
            </section>
            <footer className="pb-3 pt-7 text-center text-[10px] font-medium text-slate-400">AdilaNet · Akses internet yang lebih dekat</footer>
          </>
        )}
      </div>
    </main>
  );
}