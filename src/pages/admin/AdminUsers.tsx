import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Users, Search, Target, UserCheck, UserX, Wallet, CreditCard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminUsers() {
  const { users, updateUser } = useAppContext();
  
  const [topupModalUser, setTopupModalUser] = useState<number | null>(null);
  const [topupAmount, setTopupAmount] = useState<string>('');
  
  const activeCount = users.filter(u => u.status === 'active').length;
  const blockedCount = users.filter(u => u.status === 'blocked').length;

  const handleTopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (topupModalUser && topupAmount) {
      const user = users.find(u => u.id === topupModalUser);
      if (user) {
         updateUser(user.id, { balance: user.balance + parseInt(topupAmount) });
      }
      setTopupModalUser(null);
      setTopupAmount('');
    }
  };

  const toggleBlockStatus = (userId: number, currentStatus: string) => {
      updateUser(userId, { status: currentStatus === 'active' ? 'blocked' : 'active' });
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
                <div className="w-6 h-6 rounded-lg bg-[#0A84FF]/10 flex items-center justify-center text-[#0A84FF]">
                    <Users className="w-3.5 h-3.5" />
                </div>
                <span className="text-[17px] font-bold text-white leading-none">{users.length}</span>
             </div>
             <span className="text-[11px] text-white/50 font-medium">Total Pengguna</span>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-[16px] p-3 flex flex-col justify-center">
             <div className="flex items-center gap-1.5 mb-1">
                <div className="w-6 h-6 rounded-lg bg-[#34C759]/10 flex items-center justify-center text-[#34C759]">
                    <UserCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[17px] font-bold text-white leading-none">{activeCount}</span>
             </div>
             <span className="text-[11px] text-white/50 font-medium">Aktif</span>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-[16px] p-3 flex flex-col justify-center">
             <div className="flex items-center gap-1.5 mb-1">
                <div className="w-6 h-6 rounded-lg bg-[#FF453A]/10 flex items-center justify-center text-[#FF453A]">
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
            placeholder="Cari nama atau nomor HP..." 
            className="w-full bg-white/[0.03] border border-white/10 text-white rounded-[16px] pl-9 pr-4 py-3 text-[13px] focus:outline-none focus:border-[#0A84FF]/50 focus:bg-white/[0.05] transition-colors shadow-sm"
          />
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          <button className="bg-[#0A84FF] text-white px-4 py-2 rounded-[14px] text-[13px] font-semibold whitespace-nowrap active:scale-95 transition-transform">Semua</button>
          <button className="bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] text-white/80 px-4 py-2 rounded-[14px] text-[13px] font-medium whitespace-nowrap transition-colors active:scale-95">Aktif</button>
          <button className="bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] text-white/80 px-4 py-2 rounded-[14px] text-[13px] font-medium whitespace-nowrap transition-colors active:scale-95">Diblokir</button>
      </div>

      <div className="space-y-3">
        {users.map((user, idx) => (
            <motion.div 
               key={user.id}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: idx * 0.1 }}
               className="bg-white/[0.02] border border-white/5 rounded-[20px] p-4 shadow-sm backdrop-blur-xl group hover:bg-white/[0.04] transition-colors z-0"
            >
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/80 text-lg font-bold shadow-sm">
                        {user.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-white text-[15px]">{user.name}</h3>
                            {user.status === 'active' ? (
                                <span className="bg-[#34C759]/10 text-[#34C759] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#34C759]/20 uppercase">Aktif</span>
                            ) : (
                                <span className="bg-[#FF453A]/10 text-[#FF453A] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#FF453A]/20 uppercase">Diblokir</span>
                            )}
                        </div>
                        <p className="text-white/50 text-[12px] flex items-center gap-1 mb-1">
                            {user.phone_number || '-'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 mb-4 gap-2">
                    <div className="bg-white/[0.02] border border-white/5 rounded-[12px] p-2 flex flex-col justify-center items-center text-center">
                        <span className="text-[13px] font-bold text-white mb-0.5 leading-none">Rp {(user.balance/1000).toLocaleString('id-ID')}k</span>
                        <span className="text-[9px] uppercase tracking-widest text-white/40 font-semibold mt-1">Saldo Tersedia</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-[12px] p-2 flex flex-col justify-center items-center text-center">
                         <span className="text-[13px] font-bold text-white mb-0.5 leading-none capitalize">{user.role}</span>
                         <span className="text-[9px] uppercase tracking-widest text-white/40 font-semibold mt-1">Status Akses</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => setTopupModalUser(user.id)}
                        className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/80 font-medium py-2 rounded-[12px] text-[12px] transition-colors"
                    >
                        <Wallet className="w-3.5 h-3.5" /> Top Up Saldo
                    </button>
                    {user.status === 'active' ? (
                        <button 
                            onClick={() => toggleBlockStatus(user.id, user.status)}
                            className="flex items-center justify-center gap-1.5 bg-[#FF453A]/10 hover:bg-[#FF453A]/20 active:bg-[#FF453A]/30 text-[#FF453A] font-medium py-2 rounded-[12px] text-[12px] transition-colors"
                        >
                            <UserX className="w-3.5 h-3.5" /> Blokir
                        </button>
                    ) : (
                        <button 
                            onClick={() => toggleBlockStatus(user.id, user.status)}
                            className="flex items-center justify-center gap-1.5 bg-[#34C759]/10 hover:bg-[#34C759]/20 active:bg-[#34C759]/30 text-[#34C759] font-medium py-2 rounded-[12px] text-[12px] transition-colors"
                        >
                            <UserCheck className="w-3.5 h-3.5" /> Buka Blokir
                        </button>
                    )}
                </div>
            </motion.div>
        ))}
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
              className="w-full max-w-md bg-[#1C1C1E] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative border-t border-white/10 sm:border-white/10"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
              <button 
                onClick={() => setTopupModalUser(null)}
                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-[22px] font-bold text-white mb-6">Top Up Saldo</h3>
              <p className="text-[13px] text-white/50 mb-4 -mt-4">Tambahkan saldo ke dompet pengguna.</p>
              
              <form onSubmit={handleTopup} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-white/60 mb-1.5 uppercase tracking-wider">Nominal Saldo</label>
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="Contoh: 50000"
                    className="w-full bg-white/[0.03] border border-white/5 rounded-[16px] px-4 py-3.5 text-white focus:outline-none focus:border-[#0A84FF]/50 text-[15px]"
                    required
                  />
                </div>
                <button type="submit" disabled={!topupAmount} className="w-full bg-[#0A84FF] disabled:bg-white/5 disabled:text-white/30 hover:bg-[#0A84FF]/90 active:scale-[0.98] text-white font-semibold py-4 rounded-[16px] mt-2 transition-transform text-[15px]">
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
