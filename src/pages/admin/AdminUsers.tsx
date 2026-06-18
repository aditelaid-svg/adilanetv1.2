import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { useToast } from '../../components/Toast';
import { Users, Search, UserCheck, UserX, Wallet, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
          <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Pengguna</h1>
          <p className="text-white/50 text-[13px] font-medium">{activeCount} aktif • {blockedCount} diblokir</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-[16px] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span className="text-[17px] font-bold text-white leading-none">{users.length}</span>
          </div>
          <span className="text-[11px] text-white/50 font-medium">Total</span>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-[16px] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-success/10 flex items-center justify-center text-success">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-[17px] font-bold text-white leading-none">{activeCount}</span>
          </div>
          <span className="text-[11px] text-white/50 font-medium">Aktif</span>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-[16px] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-danger/10 flex items-center justify-center text-danger">
              <UserX className="w-3.5 h-3.5" />
            </div>
            <span className="text-[17px] font-bold text-white leading-none">{blockedCount}</span>
          </div>
          <span className="text-[11px] text-white/50 font-medium">Diblokir</span>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, email, atau nomor HP..."
          className="w-full bg-white/[0.03] border border-white/10 text-white rounded-[16px] pl-9 pr-4 py-3 text-[13px] focus:outline-none focus:border-brand/50 focus:bg-white/[0.05] transition-colors shadow-sm"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {['Semua', 'Aktif', 'Diblokir'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-[14px] text-[13px] font-semibold whitespace-nowrap active:scale-95 transition-all ${filter === f ? 'bg-brand text-white' : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] text-white/80'}`}
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
            className="bg-white/[0.02] border border-white/5 rounded-[20px] p-4 shadow-sm backdrop-blur-xl group hover:bg-white/[0.04] transition-colors z-0"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/80 text-lg font-bold shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-white text-[15px]">{user.name}</h3>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${user.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                    {user.status === 'active' ? 'Aktif' : 'Diblokir'}
                  </span>
                  {user.role === 'superadmin' && (
                    <span className="bg-grape/10 text-grape text-[9px] font-bold px-1.5 py-0.5 rounded border border-grape/20 uppercase">Super Admin</span>
                  )}
                  {user.role === 'admin' && (
                    <span className="bg-warning/10 text-warning text-[9px] font-bold px-1.5 py-0.5 rounded border border-warning/20 uppercase">Admin</span>
                  )}
                </div>
                <p className="text-white/50 text-[12px] mb-0.5">{user.phone_number || '-'}</p>
                <p className="text-white/30 text-[11px]">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 mb-4 gap-2">
              <div className="bg-white/[0.02] border border-white/5 rounded-[12px] p-2 flex flex-col justify-center items-center text-center">
                <span className="text-[13px] font-bold text-white mb-0.5 leading-none">{formatRupiah(user.balance)}</span>
                <span className="text-[9px] uppercase tracking-widest text-white/40 font-semibold mt-1">Saldo</span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-[12px] p-2 flex flex-col justify-center items-center text-center">
                <span className="text-[13px] font-bold text-white mb-0.5 leading-none capitalize">{user.role}</span>
                <span className="text-[9px] uppercase tracking-widest text-white/40 font-semibold mt-1">Akses</span>
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
                    className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/80 font-medium py-2 rounded-[12px] text-[12px] transition-colors"
                  >
                    <Wallet className="w-3.5 h-3.5" /> Top Up
                  </button>
                  {!isProtected && (user.status === 'active' ? (
                    <button
                      onClick={() => toggleBlockStatus(user.id, user.status)}
                      className="flex items-center justify-center gap-1.5 bg-danger/10 hover:bg-danger/20 text-danger font-medium py-2 rounded-[12px] text-[12px] transition-colors"
                    >
                      <UserX className="w-3.5 h-3.5" /> Blokir
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleBlockStatus(user.id, user.status)}
                      className="flex items-center justify-center gap-1.5 bg-success/10 hover:bg-success/20 text-success font-medium py-2 rounded-[12px] text-[12px] transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Buka
                    </button>
                  ))}
                  {!isProtected && (
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-danger/20 text-white/50 hover:text-danger font-medium py-2 rounded-[12px] text-[12px] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Hapus
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
      <AnimatePresence>
        {topupModalUser && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md bg-surface rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative border-t border-white/10 sm:border-white/10"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
              <button onClick={() => setTopupModalUser(null)} aria-label="Tutup" className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-[22px] font-bold text-white mb-2">Top Up Saldo</h3>
              <p className="text-[13px] text-white/50 mb-6">
                Tambahkan saldo ke: <span className="text-white font-semibold">{users.find(u => u.id === topupModalUser)?.name}</span>
              </p>
              <form onSubmit={handleTopup} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-white/60 mb-1.5 uppercase tracking-wider">Nominal Saldo</label>
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="Contoh: 50000"
                    min="1000"
                    className="w-full bg-white/[0.03] border border-white/5 rounded-[16px] px-4 py-3.5 text-white focus:outline-none focus:border-brand/50 text-[15px]"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  {[10000, 25000, 50000, 100000].map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setTopupAmount(String(a))}
                      className={`flex-1 py-2 rounded-[12px] text-[11px] font-semibold transition-colors ${topupAmount === String(a) ? 'bg-brand text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                    >
                      {(a/1000).toFixed(0)}rb
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!topupAmount}
                  className="w-full bg-brand disabled:bg-white/5 disabled:text-white/30 hover:bg-brand/90 active:scale-[0.98] text-white font-semibold py-4 rounded-[16px] mt-2 transition-transform text-[15px]"
                >
                  Konfirmasi Top Up
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
