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
    { label: 'Pendapatan', value: `Rp ${(totalRevenue / 1000).toLocaleString('id-ID')}k`, icon: TrendingUp, color: '#0ea5e9', bg: 'bg-sky-50', border: 'border-sky-100' },
    { label: 'User Aktif', value: activeUsers.toString(), icon: Users, color: '#14b8a6', bg: 'bg-teal-50', border: 'border-teal-100' },
    { label: 'Router On', value: `${onlineRouters}/${routers.length}`, icon: Router, color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: 'Transaksi', value: transactions.length.toString(), icon: Receipt, color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-100' },
  ];

  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h1 className="text-[28px] font-bold tracking-tight text-slate-800 mb-1">Dashboard</h1>
        <p className="text-slate-500 text-[13px] font-medium">Statistik jaringan WiFi hari ini.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {statCards.map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-strong rounded-[20px] p-4 relative overflow-hidden group flex flex-col justify-between min-h-[100px]"
          >
            <div className="flex justify-between items-start relative z-10 w-full mb-2">
                <div className={`w-8 h-8 rounded-full ${stat.bg} flex items-center justify-center border ${stat.border}`}>
                    <stat.icon className="w-4 h-4" strokeWidth={1.8} style={{ color: stat.color }} />
                </div>
            </div>
            <div className="relative z-10">
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">{stat.label}</p>
              <p className="text-[20px] font-bold text-slate-800 tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        {/* Routers Status */}
        <div className="glass rounded-[24px] p-5">
           <h2 className="text-[15px] font-bold mb-4 text-slate-800 tracking-tight">Status Router</h2>
           <div className="space-y-2">
             {routers.map(router => (
               <div key={router.id} className="flex items-center justify-between p-3 bg-white/60 rounded-[16px] border border-slate-100 transition-colors hover:bg-white/80">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center border ${router.status === 'online' ? 'bg-teal-50 border-teal-100' : router.status === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'}`}>
                        <Router className={`w-5 h-5 ${router.status === 'online' ? 'text-teal-600' : router.status === 'warning' ? 'text-amber-600' : 'text-rose-600'}`} strokeWidth={1.8} />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-white ${router.status === 'online' ? 'bg-teal-500' : router.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-[13px] text-slate-800 leading-tight mb-0.5">{router.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono tracking-wide">{router.ip_address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-slate-800 tracking-tight leading-tight">{router.connected_users}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">User</p>
                  </div>
               </div>
             ))}
             {routers.length === 0 && (
               <p className="text-center text-slate-400 text-[13px] py-6">Belum ada router terdaftar.</p>
             )}
           </div>
        </div>

        {/* Recent Transactions List */}
        <div className="glass rounded-[24px] p-5 mb-4">
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">Transaksi Terbaru</h2>
             <button className="text-[11px] text-sky-600 font-semibold bg-sky-50 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform">Lihat Semua</button>
           </div>
           
           <div className="space-y-2">
              {transactions.slice(0, 4).map(tx => {
                  const user = users.find(u => u.id === tx.user_id);
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-white/60 hover:bg-white/80 transition-colors rounded-[16px] border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[12px] bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                                <Receipt className="w-5 h-5" strokeWidth={1.8} />
                            </div>
                            <div>
                                <p className="text-[13px] font-semibold text-slate-800 leading-tight mb-1">{user?.name}</p>
                                <span className="font-mono text-[10px] font-bold tracking-widest text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">{tx.voucher_code}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[13px] font-bold text-slate-800 tracking-tight mb-1">Rp {(tx.amount/1000).toLocaleString('id-ID')}k</p>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${tx.status === 'success' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                                {tx.status}
                            </span>
                        </div>
                    </div>
                  )
              })}
              {transactions.length === 0 && (
                <p className="text-center text-slate-400 text-[13px] py-6">Belum ada transaksi.</p>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
