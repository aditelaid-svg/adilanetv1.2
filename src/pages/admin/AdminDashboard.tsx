import React from 'react';
import { useAppContext } from '../../AppContext';
import { Users, Router, Receipt, TrendingUp, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const { users, routers, packages, transactions } = useAppContext();

  const totalRevenue = transactions.filter(t => t.status === 'success').reduce((acc, curr) => acc + curr.amount, 0);
  const activeUsers = users.filter(u => u.role === 'user' && u.status === 'active').length;
  const onlineRouters = routers.filter(r => r.status === 'online').length;

  const statCards = [
    { label: 'Pendapatan', value: `Rp ${(totalRevenue / 1000).toLocaleString('id-ID')}k`, icon: TrendingUp, color: 'var(--color-brand)', bg: 'bg-brand' },
    { label: 'User Aktif', value: activeUsers.toString(), icon: Users, color: 'var(--color-success)', bg: 'bg-success' },
    { label: 'Router On', value: `${onlineRouters}/${routers.length}`, icon: Router, color: 'var(--color-iris)', bg: 'bg-iris' },
    { label: 'Transaksi', value: transactions.length.toString(), icon: Receipt, color: 'var(--color-gold)', bg: 'bg-gold' },
  ];

  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Dashboard</h1>
        <p className="text-white/50 text-[13px] font-medium">Statistik jaringan WiFi hari ini.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {statCards.map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[20px] p-4 relative overflow-hidden group shadow-sm flex flex-col justify-between min-h-[100px]"
          >
            <div className={`absolute -right-6 -top-6 w-20 h-20 ${stat.bg}/10 rounded-full blur-2xl transition-all group-hover:scale-150`} />
            <div className="flex justify-between items-start relative z-10 w-full mb-2">
                <div className={`w-8 h-8 rounded-full ${stat.bg}/10 flex items-center justify-center border border-white/5`}>
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
            </div>
            <div className="relative z-10">
              <p className="text-[11px] text-white/50 font-semibold uppercase tracking-wider mb-0.5">{stat.label}</p>
              <p className="text-[20px] font-bold text-white tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        {/* Routers Status */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[24px] p-5 shadow-sm">
           <h2 className="text-[15px] font-semibold mb-4 text-white">Status Router</h2>
           <div className="space-y-2">
             {routers.map(router => (
               <div key={router.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-[16px] border border-white/5 transition-colors hover:bg-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center border border-white/5 ${router.status === 'online' ? 'bg-success/10' : router.status === 'warning' ? 'bg-gold/10' : 'bg-danger/10'}`}>
                        <Router className={`w-5 h-5 ${router.status === 'online' ? 'text-success' : router.status === 'warning' ? 'text-gold' : 'text-danger'}`} />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-[#000000] ${router.status === 'online' ? 'bg-success' : router.status === 'warning' ? 'bg-gold' : 'bg-danger'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-[13px] text-white leading-tight mb-0.5">{router.name}</p>
                      <p className="text-[11px] text-white/50 font-mono tracking-wide">{router.ip_address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-white tracking-tight leading-tight">{router.connected_users}</p>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">User</p>
                  </div>
               </div>
             ))}
             {routers.length === 0 && (
               <p className="text-center text-white/30 text-[13px] py-6">Belum ada router terdaftar.</p>
             )}
           </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[24px] p-5 shadow-sm mb-4">
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-[15px] font-semibold text-white">Transaksi Terbaru</h2>
             <button className="text-[11px] text-brand font-semibold bg-brand/10 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform">Lihat Semua</button>
           </div>
           
           <div className="space-y-2">
              {transactions.slice(0, 4).map(tx => {
                  const user = users.find(u => u.id === tx.user_id);
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors rounded-[16px] border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[12px] bg-white/5 flex items-center justify-center border border-white/5 text-white/50">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[13px] font-semibold text-white leading-tight mb-1">{user?.name}</p>
                                <span className="font-mono text-[10px] font-bold tracking-widest text-brand bg-brand/10 px-1.5 py-0.5 rounded">{tx.voucher_code}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[13px] font-bold text-white tracking-tight mb-1">Rp {(tx.amount/1000).toLocaleString('id-ID')}k</p>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${tx.status === 'success' ? 'bg-success/10 text-success' : 'bg-gold/10 text-gold'}`}>
                                {tx.status}
                            </span>
                        </div>
                    </div>
                  )
              })}
              {transactions.length === 0 && (
                <p className="text-center text-white/30 text-[13px] py-6">Belum ada transaksi.</p>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
