import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, Wifi, CircleAlert } from 'lucide-react';
import { connectHotspot, hotspotConnection, navigateToHotspot } from '../lib/hotspot';

export default function HotspotConnect({ voucherCode, packageRouterId = null, auto = true }: {
  voucherCode: string; packageRouterId?: number | null; auto?: boolean;
}) {
  const returning = new URLSearchParams(window.location.search).get('connected') === '1';
  const [phase, setPhase] = useState<'checking'|'manual'|'connecting'|'active'>('checking');
  const [message, setMessage] = useState('Memeriksa jaringan hotspot AdilaNet…');
  const [busy, setBusy] = useState(false);
  const started = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const connect = useCallback(async (automatic: boolean) => {
    setBusy(true);
    try {
      const result = await connectHotspot(voucherCode, packageRouterId, automatic);
      if (!mounted.current || started.current !== voucherCode) return;
      if (result.redirect_url) {
        setPhase('connecting');
        setMessage('Voucher siap. Mencoba login ke hotspot; browser mungkin meminta konfirmasi.');
        navigateToHotspot(result.redirect_url);
      } else {
        setPhase('manual');
        setMessage(result.error || 'Anda belum terdeteksi di hotspot AdilaNet. Simpan kode voucher dan gunakan setelah tersambung ke WiFi.');
      }
    } catch {
      if (mounted.current) {
        setPhase('manual');
        setMessage('Koneksi hotspot belum dapat dipastikan. Voucher tetap berlaku; coba Login WiFi dari jaringan AdilaNet.');
      }
    } finally { if (mounted.current) setBusy(false); }
  }, [voucherCode, packageRouterId]);

  useEffect(() => {
    if (!voucherCode || started.current === voucherCode) return;
    started.current = voucherCode;
    if (returning) {
      void hotspotConnection(voucherCode).then(result => {
        if (!mounted.current || started.current !== voucherCode) return;
        setPhase(result.active ? 'active' : 'manual');
        setMessage(result.active ? 'Login hotspot berhasil. Akses internet sesuai paket sudah diaktifkan oleh MikroTik.' :
          result.error || 'Login hotspot belum terkonfirmasi. Periksa voucher dan coba Login WiFi kembali.');
      }).catch(() => {
        if (mounted.current && started.current === voucherCode) { setPhase('manual'); setMessage('Status login belum dapat diverifikasi. Jangan membeli ulang; gunakan voucher yang sama.'); }
      });
    } else if (auto) {
      const key = `adilanet_hotspot_attempt:${voucherCode}`;
      let attempted = false;
      try { attempted = !!sessionStorage.getItem(key); sessionStorage.setItem(key, '1'); } catch { /* bounded by mounted component */ }
      if (!attempted) void connect(true);
      else { setPhase('manual'); setMessage('Voucher siap digunakan. Jika belum terhubung, coba Login WiFi tanpa membeli ulang.'); }
    } else { setPhase('manual'); setMessage('Sambungkan ke hotspot AdilaNet lalu gunakan kode voucher ini.'); }
  }, [voucherCode, auto, returning, connect]);

  return (
    <section className={`my-4 rounded-2xl border p-4 text-left ${phase === 'active' ? 'border-teal-200 bg-teal-50' : 'border-sky-100 bg-sky-50/80'}`} aria-live="polite" data-testid="hotspot-connect">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
        {phase === 'active' ? <CheckCircle2 size={18} className="text-success" /> :
          phase === 'checking' || phase === 'connecting' ? <LoaderCircle size={18} className="animate-spin text-brand" /> : <CircleAlert size={18} className="text-brand" />}
        {phase === 'active' ? 'Internet aktif' : phase === 'connecting' ? 'Menghubungkan WiFi' : phase === 'checking' ? 'Menyiapkan akses WiFi' : 'Voucher siap digunakan'}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{message}</p>
      {phase !== 'active' && <button type="button" disabled={busy} onClick={() => void connect(false)}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
        <Wifi size={17} />{busy ? 'Memeriksa hotspot…' : 'Login WiFi'}
      </button>}
      {phase !== 'active' && <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Di luar jaringan AdilaNet? Simpan kode dan masukkan di kolom Login Voucher saat kembali ke hotspot.</p>}
    </section>
  );
}