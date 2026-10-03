import React, { useEffect, useMemo, useState } from 'react';
import { Download, Router, Save, ShieldCheck, Wifi } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { useToast } from './Toast';
import { readApiResponse } from '../lib/apiResponse';

type RouterConfig = { routerId: number; loginUrl: string; portalUrl: string; enabled: boolean };

export default function HotspotSetup() {
  const { routers } = useAppContext();
  const toast = useToast();
  const [configs, setConfigs] = useState<RouterConfig[]>([]);
  const [routerId, setRouterId] = useState('');
  const [loginUrl, setLoginUrl] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const selectedConfig = useMemo(() => configs.find(item => String(item.routerId) === routerId), [configs, routerId]);
  const currentConfigSaved = Boolean(
    selectedConfig &&
    selectedConfig.loginUrl === loginUrl.trim() &&
    selectedConfig.portalUrl === portalUrl.trim().replace(/\/+$/, '') &&
    selectedConfig.enabled === enabled
  );

  useEffect(() => {
    let active = true;
    fetch('/api/hotspot/admin/config', { credentials: 'include' })
      .then(async response => {
        const json = await readApiResponse<{ success: boolean; data: RouterConfig[]; error?: string }>(response);
        if (!response.ok || !json.success) throw new Error(json.error || 'Konfigurasi hotspot gagal dimuat.');
        if (active) setConfigs(Array.isArray(json.data) ? json.data : []);
      })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Gagal memuat konfigurasi hotspot.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!routerId && routers.length) setRouterId(String(routers[0].id));
  }, [routers, routerId]);

  useEffect(() => {
    if (!selectedConfig) {
      setLoginUrl('');
      setPortalUrl('');
      setEnabled(true);
    } else {
      setLoginUrl(selectedConfig.loginUrl || '');
      setPortalUrl(selectedConfig.portalUrl || '');
      setEnabled(Boolean(selectedConfig.enabled));
    }
  }, [selectedConfig, routerId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const id = Number(routerId);
    if (!Number.isInteger(id) || id <= 0) return setError('Pilih router terlebih dahulu.');
    const validUrl = (value: string) => {
      try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol); } catch { return false; }
    };
    if (!validUrl(loginUrl.trim())) return setError('Masukkan URL halaman login hotspot yang valid (gateway), bukan alamat API.');
    if (!validUrl(portalUrl.trim())) return setError('Masukkan base URL publik server AdilaNet yang dapat dijangkau klien.');
    setSaving(true);
    try {
      const response = await fetch('/api/hotspot/admin/config', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routerId: id, loginUrl: loginUrl.trim(), portalUrl: portalUrl.trim().replace(/\/+$/, ''), enabled }),
      });
      const json = await readApiResponse<{ success: boolean; data?: RouterConfig; error?: string }>(response);
      if (!response.ok || !json.success) throw new Error(json.error || 'Konfigurasi tidak dapat disimpan.');
      if (!json.data || json.data.routerId !== id) throw new Error('Konfigurasi tersimpan belum dapat dikonfirmasi. Muat ulang pengaturan.');
      const updated = json.data;
      setConfigs(previous => previous.filter(item => item.routerId !== id).concat(updated));
      toast.success('Hotspot tersimpan', 'Unduh berkas portal untuk memasangnya di router.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi.';
      setError(message);
      toast.error('Gagal menyimpan hotspot', message);
    } finally {
      setSaving(false);
    }
  };

  const download = async () => {
    const id = Number(routerId);
    if (!currentConfigSaved) {
      setError('Simpan konfigurasi router sebelum mengunduh paket instalasi.');
      return;
    }
    setDownloading(true);
    setError('');
    try {
      const response = await fetch(`/api/hotspot/admin/package/${id}`, { credentials: 'include' });
      if (!response.ok) {
        const json = await readApiResponse<{ success: boolean; error?: string }>(response);
        throw new Error(json.error || 'Paket instalasi belum tersedia.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `hotspot-adilanet-${id}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengunduh paket instalasi.';
      setError(message);
      toast.error('Unduhan gagal', message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="glass-strong overflow-hidden rounded-[24px] p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-sky-100 text-sky-700"><Wifi className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><h2 className="text-[15px] font-semibold text-slate-800">Portal Hotspot</h2><p className="text-[11px] text-slate-500">Pemasangan portal AdilaNet per router</p></div>
        <span className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-teal-700">Terpisah dari API</span>
      </div>

      {loading ? <div className="space-y-3" aria-label="Memuat konfigurasi hotspot"><div className="h-11 animate-pulse rounded-xl bg-sky-50" /><div className="h-11 animate-pulse rounded-xl bg-sky-50" /><div className="h-24 animate-pulse rounded-xl bg-sky-50" /></div> : (
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="hotspot-router" className="mb-1.5 block text-[12px] font-medium text-slate-600">Router</label>
            <div className="relative">
              <Router className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select id="hotspot-router" value={routerId} onChange={e => setRouterId(e.target.value)} disabled={!routers.length} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-10 py-3 text-[13px] text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:opacity-60">
                {routers.length ? routers.map(router => <option key={router.id} value={router.id}>{router.name}</option>) : <option value="">Belum ada router</option>}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="hotspot-gateway-login" className="mb-1.5 block text-[12px] font-medium text-slate-600">URL login hotspot</label>
            <input id="hotspot-gateway-login" type="url" value={loginUrl} onChange={e => setLoginUrl(e.target.value)} placeholder="URL halaman login hotspot pada router" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[12px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">Alamat halaman login WiFi yang berakhiran /login, bukan layanan API router. HTTPS hanya jika gateway memiliki sertifikat yang valid. Gunakan alamat yang Anda kendalikan.</p>
          </div>
          <div>
            <label htmlFor="hotspot-public-base" className="mb-1.5 block text-[12px] font-medium text-slate-600">Base URL publik AdilaNet</label>
            <input id="hotspot-public-base" type="url" value={portalUrl} onChange={e => setPortalUrl(e.target.value)} placeholder="https://domain-publik-Anda" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[12px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">Isi domain server yang benar-benar dapat diakses pelanggan. Tidak ada alamat produksi yang diisi otomatis.</p>
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-white/70 px-3.5 py-3">
            <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-700"><ShieldCheck className="h-4 w-4 text-teal-600" />Portal aktif untuk router ini</span>
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-4 w-4 accent-teal-600" />
          </label>
          {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-[11px] text-rose-700">{error}</p>}
          {!routers.length && <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">Tambahkan router terlebih dahulu sebelum menyiapkan portal.</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" disabled={saving || !routers.length} className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-3 text-[12px] font-bold text-white transition hover:bg-sky-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Menyimpan…' : 'Simpan'}</button>
            <button type="button" onClick={download} disabled={downloading || !currentConfigSaved} className="flex items-center justify-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-3 text-[12px] font-bold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"><Download className="h-4 w-4" />{downloading ? 'Menyiapkan…' : 'Unduh ZIP'}</button>
          </div>
        </form>
      )}
      <div className="mt-5 rounded-[16px] border border-sky-100 bg-sky-50/80 p-4">
        <p className="mb-2 text-[11px] font-bold text-sky-800">Instalasi manual MikroTik</p>
        <ol className="list-decimal space-y-1.5 pl-4 text-[10px] leading-relaxed text-slate-600">
          <li>Cadangkan folder hotspot lama sebelum mengganti berkas.</li>
          <li>Ekstrak ZIP, lalu unggah folder <code className="font-mono font-semibold">hotspot-adilanet</code> ke penyimpanan flash router.</li>
          <li>Atur <b>HTML Directory</b> menjadi <code className="font-mono">flash/hotspot-adilanet</code>.</li>
          <li>Tambahkan host portal publik dan resource yang diperlukan ke walled garden.</li>
          <li>Periksa halaman login dari perangkat klien. Pengaturan router tidak diubah otomatis.</li>
        </ol>
      </div>
    </section>
  );
}