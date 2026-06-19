import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { useToast } from '../../components/Toast';
import { Users, Search, UserCheck, UserX, Wallet, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { formatRupiah } from '../../lib/format';

export default function AdminUsers() {
  const { users, updateUser, deleteUser, topupBalance, currentUser, loading } = useAppContext();
  const toast = useToast();

  const [topupModalUser, setTopupModalUser] = useState<number | null>(null);
  const [topupAmount, setTopupAmount] = useState<string>('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Semua');

  const activeCount = users.filter(u => u.status === 'active').length;
  const blockedCount = users.filter(u => u.status === 'blocked').length;

  const filteredUsers = users.filter(u => {
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone_number || '').includes(search) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'Semua' ||
      (filter === 'Aktif' && u.status === 'active') ||
      (filter === 'Diblokir' && u.status === 'blocked');
    return matchSearch && matchFilter;
  });

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topupModalUser && topupAmount) {
      await topupBalance(topupModalUser, parseInt(topupAmount));
      setTopupModalUser(null);
      setTopupAmount('');
    }
  };

  const handleDelete = async (userId: number, name: string) => {
    const ok = await toast.confirm(
      'Hapus Pengguna?',
      `Akun "${name}" akan dihapus permanen beserta semua datanya.`,
      { confirmText: 'Ya, Hapus', danger: true }
    );
    if (ok) {
      await deleteUser(userId);
      toast.success('Pengguna dihapus', `"${name}" berhasil dihapus.`);
    }
  };

  const toggleBlockStatus = async (userId: number, currentStatus: string) => {
    await updateUser(userId, { status: currentStatus === 'active' ? 'blocked' : 'active' });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-800 mb-1">Pengguna</h1>
          <p className="text-slate-500 text-[13px] font-medium">{activeCount} aktif • {blockedCount} diblokir</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-[20px] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600">
              <Users className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
            <span className="text-[17px] font-bold text-slate-800 leading-none">{users.length}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Total</span>
        </div>
        <div className="glass rounded-[20px] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
              <UserCheck className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
            <span className="text-[17px] font-bold text-slate-800 leading-none">{activeCount}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Aktif</span>
        </div>
        <div className="glass rounded-[20px] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
              <UserX className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
            <span className="text-[17px] font-bold text-slate-800 leading-none">{blockedCount}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Diblokir</span>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, email, atau nomor HP..."
          className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-2xl pl-9 pr-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors shadow-sm"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {['Semua', 'Aktif', 'Diblokir'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-[14px] text-[13px] font-semibold whitespace-nowrap active:scale-95 transition-all ${filter === f ? 'bg-sky-500 text-white shadow-[0_8px_20px_rgba(14,165,233,0.3)]' : 'glass-pill text-slate-600 hover:text-slate-800'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && users.length === 0 ? (
          <SkeletonList count={4} />
        ) : (<>
        {filteredUsers.map((user, idx) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-strong rounded-[24px] p-4 group transition-colors z-0"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full glass-pill flex items-center justify-center text-sky-600 text-lg font-bold shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-slate-800 text-[15px]">{user.name}</h3>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${user.status === 'active' ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'}`}>
                    {user.status === 'active' ? 'Aktif' : 'Diblokir'}
                  </span>
                  {user.role === 'superadmin' && (
                    <span className="bg-violet-100 text-violet-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Super Admin</span>
                  )}
                  {user.role === 'admin' && (
                    <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Admin</span>
                  )}
                </div>
                <p className="text-slate-500 text-[12px] mb-0.5">{user.phone_number || '-'}</p>
                <p className="text-slate-400 text-[11px]">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 mb-4 gap-2">
              <div className="glass rounded-[14px] p-2 flex flex-col justify-center items-center text-center">
                <span className="text-[13px] font-bold text-slate-800 mb-0.5 leading-none">{formatRupiah(user.balance)}</span>
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mt-1">Saldo</span>
              </div>
              <div className="glass rounded-[14px] p-2 flex flex-col justify-center items-center text-center">
                <span className="text-[13px] font-bold text-slate-800 mb-0.5 leading-none capitalize">{user.role}</span>
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mt-1">Akses</span>
              </div>
            </div>

            {(() => {
              const isSelf = user.id === currentUser?.id;
              const isProtected =
                user.role === 'superadmin' ||
                (user.role === 'admin' && currentUser?.role !== 'superadmin') ||
                isSelf;
              return (
                <div className={`grid ${isProtected ? 'grid-cols-1' : 'grid-cols-3'} gap-2`}>
                  <button
                    onClick={() => setTopupModalUser(user.id)}
                    className="flex items-center justify-center gap-1.5 bg-white border border-slate-100 hover:bg-slate-50 active:scale-95 text-slate-700 font-medium py-2 rounded-[12px] text-[12px] shadow-sm transition-all"
                  >
                    <Wallet className="w-3.5 h-3.5" strokeWidth={1.8} /> Top Up
                  </button>
                  {!isProtected && (user.status === 'active' ? (
                    <button
                      onClick={() => toggleBlockStatus(user.id, user.status)}
                      className="flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 font-medium py-2 rounded-[12px] text-[12px] transition-all"
                    >
                      <UserX className="w-3.5 h-3.5" strokeWidth={1.8} /> Blokir
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleBlockStatus(user.id, user.status)}
                      className="flex items-center justify-center gap-1.5 bg-teal-50 hover:bg-teal-100 active:scale-95 text-teal-600 font-medium py-2 rounded-[12px] text-[12px] transition-all"
                    >
                      <UserCheck className="w-3.5 h-3.5" strokeWidth={1.8} /> Buka
                    </button>
                  ))}
                  {!isProtected && (
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      className="flex items-center justify-center gap-1.5 bg-white border border-slate-100 hover:bg-rose-50 active:scale-95 text-slate-400 hover:text-rose-600 font-medium py-2 rounded-[12px] text-[12px] shadow-sm transition-all"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={1.8} /> Hapus
                    </button>
                  )}
                </div>
              );
            })()}
          </motion.div>
        ))}

        {filteredUsers.length === 0 && (
          <EmptyState
            icon={Users}
            title={search || filter !== 'Semua' ? 'Tidak ada hasil' : 'Belum ada pengguna'}
            description={search || filter !== 'Semua' ? 'Coba ubah pencarian atau filter.' : 'Pengguna terdaftar akan muncul di sini.'}
          />
        )}
        </>)}
      </div>

      {/* Topup Modal */}
      {createPortal(
        <AnimatePresence>
        {topupModalUser && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md glass-strong rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl relative"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
              <button onClick={() => setTopupModalUser(null)} aria-label="Tutup" className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white border border-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" strokeWidth={1.8} />
              </button>
              <h3 className="text-[22px] font-bold text-slate-800 mb-2 tracking-tight">Top Up Saldo</h3>
              <p className="text-[13px] text-slate-500 mb-6">
                Tambahkan saldo ke: <span className="text-slate-800 font-semibold">{users.find(u => u.id === topupModalUser)?.name}</span>
              </p>
              <form onSubmit={handleTopup} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1.5">Nominal Saldo</label>
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="Contoh: 50000"
                    min="1000"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 text-[15px]"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  {[10000, 25000, 50000, 100000].map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setTopupAmount(String(a))}
                      className={`flex-1 py-2 rounded-[12px] text-[11px] font-semibold transition-colors ${topupAmount === String(a) ? 'bg-sky-500 text-white' : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {(a/1000).toFixed(0)}rb
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!topupAmount}
                  className="w-full bg-sky-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none hover:bg-sky-600 active:scale-95 text-white font-semibold py-4 rounded-[16px] mt-2 shadow-[0_8px_20px_rgba(14,165,233,0.3)] transition-all text-[15px]"
                >
                  Konfirmasi Top Up
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
