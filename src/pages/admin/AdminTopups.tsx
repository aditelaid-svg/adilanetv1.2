import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Wallet, Search, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { formatRupiah } from '../../lib/format';

export default function AdminTopups() {
  const { topups, loading } = useAppContext();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => topups.filter(t =>
    !search ||
    (t.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.admin_name || '').toLowerCase().includes(search.toLowerCase())
  ), [topups, search]);

  const total = useMemo(() => topups.reduce((acc, t) => acc + t.amount, 0), [topups]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    return `${date}, ${time}`;
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-slate-800 mb-1">Riwayat Top Up</h1>
        <p className="text-slate-500 text-[13px] font-medium">{topups.length} pengisian • Total {formatRupiah(total)}</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama pengguna atau admin..."
          className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-2xl pl-9 pr-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors shadow-sm"
        />
      </div>

      <div className="space-y-3">
        {loading && topups.length === 0 ? (
          <SkeletonList count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={search ? 'Tidak ada hasil' : 'Belum ada top up'}
            description={search ? 'Coba ubah pencarian.' : 'Setiap pengisian saldo akan tercatat di sini.'}
          />
        ) : (
          filtered.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="glass-strong rounded-[20px] p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-[12px] bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 text-teal-600">
                <ArrowUpRight className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 text-[15px] leading-tight truncate">{t.user_name || 'Pengguna dihapus'}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  oleh {t.admin_name || 'Sistem'} • {formatDate(t.created_at)}
                </p>
              </div>
              <span className="font-bold text-teal-600 tracking-tight text-[15px] shrink-0">+{formatRupiah(t.amount)}</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
