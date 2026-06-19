import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext, type HotspotUser } from '../../AppContext';
import { Users, RefreshCw, Search, Wifi, WifiOff, ArrowDownToLine, ArrowUpFromLine, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { formatBytes } from '../../lib/format';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';

export default function AdminHotspotUsers() {
  const { routers, getRouterHotspotUsers } = useAppContext();
  const [selectedRouter, setSelectedRouter] = useState('');
  const [users, setUsers] = useState<HotspotUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterProfile, setFilterProfile] = useState('');
  const reqRef = useRef(0);

  const loadUsers = (routerId: string) => {
    if (!routerId) return;
    const token = ++reqRef.current;
    setLoading(true);
    setError(null);
    getRouterHotspotUsers(Number(routerId))
      .then(data => {
        if (token !== reqRef.current) return; // ignore stale response
        setUsers(data);
      })
      .catch(err => {
        if (token !== reqRef.current) return;
        setUsers([]);
        setError(err?.message || 'Gagal memuat user hotspot');
      })
      .finally(() => {
        if (token === reqRef.current) setLoading(false);
      });
  };

  useEffect(() => {
    setUsers([]);
    setError(null);
    setSearch('');
    setFilterProfile('');
    if (selectedRouter) loadUsers(selectedRouter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRouter]);

  const profileOptions = useMemo(
    () => Array.from(new Set(users.map(u => u.profile).filter(Boolean))).sort(),
    [users]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (filterProfile && u.profile !== filterProfile) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.comment.toLowerCase().includes(q) ||
        u.macAddress.toLowerCase().includes(q)
      );
    });
  }, [users, search, filterProfile]);

  const onlineCount = useMemo(() => users.filter(u => u.online).length, [users]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 mb-1">User Hotspot</h1>
          <p className="text-sm text-slate-500">Daftar user dari Mikrotik (online &amp; offline)</p>
        </div>
        {selectedRouter && (
          <button
            onClick={() => loadUsers(selectedRouter)}
            disabled={loading}
            className="bg-white border border-slate-100 hover:bg-slate-50 p-2.5 rounded-[14px] text-slate-600 shadow-sm transition-colors disabled:opacity-50"
            title="Muat ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Router selector */}
      <div className="glass-strong rounded-[24px] p-5 space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-slate-600 mb-1.5">Pilih Router</label>
          <select
            value={selectedRouter}
            onChange={e => setSelectedRouter(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 appearance-none"
          >
            <option value="">Pilih Router...</option>
            {routers.map(r => (
              <option value={r.id} key={r.id}>
                {r.name} ({r.ip_address}) — {r.status}
              </option>
            ))}
          </select>
        </div>

        {selectedRouter && users.length > 0 && (
          <>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                <input
                  type="text"
                  placeholder="Cari nama / komentar / MAC"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-slate-800 placeholder-slate-400 text-[14px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
                />
              </div>
              <select
                value={filterProfile}
                onChange={e => setFilterProfile(e.target.value)}
                className="bg-white border border-slate-200 rounded-2xl px-3 py-2.5 text-slate-700 text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 appearance-none max-w-[40%]"
              >
                <option value="">Semua Profil</option>
                {profileOptions.map(p => (
                  <option value={p} key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-semibold">
                Total {users.length}
              </span>
              <span className="text-[11px] bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                <Wifi className="w-3 h-3" strokeWidth={2} /> {onlineCount} online
              </span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[13px] text-rose-700 bg-rose-50 rounded-[16px] p-4 border border-rose-100">
          <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.8} /> {error}
        </div>
      )}

      {loading && <SkeletonList count={5} />}

      {!loading && !error && selectedRouter && filtered.length === 0 && (
        <EmptyState
          icon={Users}
          title={users.length === 0 ? 'Belum ada user' : 'Tidak ditemukan'}
          description={
            users.length === 0
              ? 'Router ini belum punya user hotspot, atau semuanya sudah hangus.'
              : 'Coba ubah kata kunci atau filter profil.'
          }
        />
      )}

      {!loading && !error && !selectedRouter && (
        <EmptyState
          icon={Users}
          title="Pilih router dulu"
          description="Pilih router di atas untuk menampilkan daftar user hotspotnya."
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((u, idx) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 0.3) }}
              className="glass rounded-[20px] p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 text-[15px] tracking-wide truncate">{u.name}</span>
                    {u.disabled && (
                      <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">off</span>
                    )}
                  </div>
                  {u.comment && (
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{u.comment}</p>
                  )}
                </div>
                {u.online ? (
                  <span className="shrink-0 text-[10px] bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                    <Wifi className="w-3 h-3" strokeWidth={2.2} /> Online
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                    <WifiOff className="w-3 h-3" strokeWidth={2.2} /> Offline
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[11px] bg-sky-100 text-sky-700 px-2 py-1 rounded-[8px] font-semibold">
                  {u.profile}
                </span>
                {u.macAddress && (
                  <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-1 rounded-[8px] font-mono">
                    {u.macAddress}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/60 rounded-[12px] py-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 mx-auto mb-1" strokeWidth={1.8} />
                  <p className="text-[12px] font-bold text-slate-700 leading-none">{u.uptime}</p>
                  <p className="text-[9px] text-slate-400 mt-1">Uptime</p>
                </div>
                <div className="bg-white/60 rounded-[12px] py-2">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" strokeWidth={1.8} />
                  <p className="text-[12px] font-bold text-slate-700 leading-none">{formatBytes(u.bytesIn)}</p>
                  <p className="text-[9px] text-slate-400 mt-1">Download</p>
                </div>
                <div className="bg-white/60 rounded-[12px] py-2">
                  <ArrowUpFromLine className="w-3.5 h-3.5 text-sky-500 mx-auto mb-1" strokeWidth={1.8} />
                  <p className="text-[12px] font-bold text-slate-700 leading-none">{formatBytes(u.bytesOut)}</p>
                  <p className="text-[9px] text-slate-400 mt-1">Upload</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
