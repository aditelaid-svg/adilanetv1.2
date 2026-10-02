import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, RotateCw, Activity } from 'lucide-react';
import { formatRupiah } from '../../lib/format';

type QiospayEvent = {
  event_key: string;
  amount: number;
  paid_at: string;
  status: 'unmatched' | 'matched' | 'review';
  reference_id: string | null;
  error: string | null;
};

type Overview = {
  configured: boolean;
  last_sync_at: string | null;
  error: string | null;
  reservations_count: number;
  events: QiospayEvent[];
};

export default function QiospayReconciliation({ refreshKey = 0, settingsPending = false }: { refreshKey?: number; settingsPending?: boolean }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/payment/qiospay/overview', { credentials: 'include' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Gagal memuat status Qiospay.');
      setOverview(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat status Qiospay.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh, refreshKey]);

  const sync = async () => {
    if (settingsPending || syncing || loading) return;
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch('/api/payment/qiospay/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Sinkronisasi Qiospay gagal.');
      setOverview(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sinkronisasi Qiospay gagal.');
    } finally {
      setSyncing(false);
    }
  };

  const attention = overview?.events.filter(event => event.status === 'unmatched' || event.status === 'review') || [];

  return (
    <section className="glass-strong rounded-[24px] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-[12px] bg-sky-100 text-sky-600 flex items-center justify-center">
          <Activity className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[15px] text-slate-800">Rekonsiliasi Qiospay</h2>
          <p className="text-[11px] text-slate-500">Status akun dan ledger pembayaran statis</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading || syncing} aria-label="Muat ulang status Qiospay" className="w-9 h-9 rounded-[11px] bg-white border border-slate-100 text-slate-500 flex items-center justify-center disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${overview?.configured ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
          {!overview ? loading ? 'Memuat status...' : 'Status belum tersedia' : overview.configured ? 'Akun terkonfigurasi' : 'Akun belum siap'}
        </span>
        <span className="text-[11px] font-medium text-slate-500 rounded-full bg-white px-2.5 py-1">
          Nominal pernah dipakai: {overview?.reservations_count ?? '—'}
        </span>
        <span className="text-[11px] font-medium text-slate-500 rounded-full bg-white px-2.5 py-1">
          Sinkron terakhir: {overview?.last_sync_at ? new Date(overview.last_sync_at).toLocaleString('id-ID') : 'Belum pernah'}
        </span>
      </div>

      {overview?.error && <p className="text-[12px] text-rose-600 bg-rose-50 border border-rose-100 rounded-[12px] p-3 mb-3">{overview.error}</p>}
      {error && <p role="alert" className="text-[12px] text-rose-600 bg-rose-50 border border-rose-100 rounded-[12px] p-3 mb-3">{error}</p>}
      {attention.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-[14px] p-3 mb-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-800 font-medium">{attention.length} mutasi belum cocok atau perlu ditinjau. Periksa manual; status pembayaran tidak dapat diubah dari daftar ini.</p>
        </div>
      )}

      {settingsPending && <p className="text-[12px] text-amber-700 mb-3">Simpan pengaturan QRIS terlebih dahulu. Status di sini membaca konfigurasi yang sudah tersimpan, bukan kolom yang sedang diisi.</p>}
      <button type="button" onClick={() => void sync()} disabled={syncing || loading || settingsPending || !overview?.configured} className="w-full mb-4 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold text-[13px] py-3 rounded-[14px] flex items-center justify-center gap-2">
        <RotateCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Menyinkronkan mutasi...' : 'Uji akun & sinkronkan mutasi'}
      </button>

      {loading && !overview ? (
        <p className="text-[12px] text-slate-400 py-3 text-center">Memuat ledger...</p>
      ) : overview?.events.length ? (
        <div className="space-y-2 max-h-72 overflow-auto">
          {overview.events.map(event => (
            <div key={event.event_key} className={`rounded-[13px] border p-3 ${event.status === 'matched' ? 'bg-white border-slate-100' : 'bg-amber-50/70 border-amber-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-800">{formatRupiah(event.amount)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{event.paid_at ? new Date(event.paid_at).toLocaleString('id-ID') : 'Waktu tidak tersedia'}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-md ${event.status === 'matched' ? 'bg-teal-50 text-teal-700' : 'bg-amber-100 text-amber-800'}`}>
                  {event.status === 'unmatched' ? 'Belum cocok' : event.status === 'review' ? 'Perlu ditinjau' : 'Cocok'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono break-all mt-1">{event.reference_id || event.event_key}</p>
              {event.error && <p className="text-[11px] text-rose-600 mt-1">{event.error}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-slate-400 py-3 text-center">{overview ? 'Belum ada mutasi untuk ditampilkan.' : 'Status Qiospay belum tersedia.'}</p>
      )}
    </section>
  );
}