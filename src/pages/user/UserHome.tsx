import React from 'react';
import { useAppContext } from '../../AppContext';
import { Wifi, Zap, ArrowRight, Star, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function UserHome() {
  const { currentUser, packages, transactions } = useAppContext();
  const navigate = useNavigate();

  const userTransactions = transactions.filter(t => t.user_id === currentUser?.id);
  const activeTx = userTransactions[0];
  const activePackage = packages.find(p => p.id === activeTx?.package_id);

  return (
    <div className="space-y-5 pb-6 mt-2">
      
      {/* Top Main Card */}
      <div className="px-5">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] p-5 bg-[#0A84FF] relative overflow-hidden shadow-md"
        >
          {/* Subtle decoration */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/20 blur-2xl rounded-full" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-white/90 mb-0.5">
              <Wifi className="w-4 h-4" />
              <span className="font-semibold text-[13px]">Saldo AdilaNet</span>
            </div>
            <h2 className="text-[32px] font-bold text-white mb-5 tracking-tight">
              Rp {currentUser?.balance.toLocaleString('id-ID') || '60.000'}
            </h2>
            
            <div className="flex gap-2">
              <button 
                className="flex justify-center items-center gap-2 bg-black/20 hover:bg-black/30 text-white font-medium px-4 py-2 rounded-[14px] text-[13px] transition-colors"
              >
                <Zap className="w-4 h-4" fill="currentColor" /> Top Up
              </button>
              <button 
                onClick={() => navigate('/user/buy')}
                className="flex-1 flex justify-center items-center gap-1.5 bg-white text-[#0A84FF] font-semibold px-4 py-2 rounded-[14px] text-[13px] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Beli Voucher <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* active voucher area */}
      <div className="px-5">
        <div className="bg-[#1C1C1E] border border-white/5 rounded-[20px] p-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-[12px] bg-[#34C759]/10 flex items-center justify-center border border-[#34C759]/20">
                <Wifi className="w-5 h-5 text-[#34C759]" />
             </div>
             <div>
                <p className="text-white/50 text-[11px] font-semibold tracking-wide uppercase mb-0.5">Voucher Aktif</p>
                <h4 className="text-white font-semibold text-[13px] leading-tight">{activePackage?.name || 'Paket Harian Basic'}</h4>
                <p className="text-[#34C759] font-mono text-[11px] font-bold mt-0.5">{activeTx?.voucher_code || 'MV7M-LQ66-G'}</p>
             </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </div>
      </div>

      {/* Banners Horizonatl Scroll */}
      <div className="flex overflow-x-auto gap-3 px-5 pb-2 hide-scrollbar snap-x">
          <div className="min-w-[130px] w-[130px] h-24 rounded-[20px] bg-[#5E5CE6] p-3.5 relative overflow-hidden snap-start shrink-0 flex flex-col justify-end">
             <div className="absolute -right-4 -top-8 w-20 h-20 bg-white/20 blur-xl rounded-full" />
             <h4 className="text-white text-[13px] font-semibold relative z-10 leading-tight">Anti<br/>Buffering</h4>
          </div>
          <div className="min-w-[240px] w-[240px] h-24 rounded-[20px] bg-[#FF9F0A] p-3.5 relative overflow-hidden snap-start shrink-0 flex flex-col justify-center">
             <div className="absolute right-0 top-0 w-24 h-24 bg-white/20 blur-xl rounded-full" />
             <Star className="w-4 h-4 text-white mb-1.5 relative z-10" fill="currentColor"/>
             <h4 className="text-white font-bold text-[14px] mb-0.5 relative z-10">Hemat Lebih Banyak</h4>
             <p className="text-white/80 text-[11px] font-medium relative z-10">Beli paket mingguan, lebih irit!</p>
          </div>
      </div>

      {/* Popular Packages */}
      <section className="px-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[17px] font-bold text-white tracking-tight">Paket Populer</h3>
          <button onClick={() => navigate('/user/packages')} className="text-[13px] font-medium text-[#0A84FF] flex items-center">Lihat Semua <ChevronRight className="w-3.5 h-3.5 ml-0.5" /></button>
        </div>

        <div className="flex overflow-x-auto gap-3 hide-scrollbar snap-x pb-4">
          {packages.slice(0,3).map((pkg, idx) => (
            <div key={pkg.id} className="min-w-[140px] w-[140px] bg-[#1C1C1E] border border-white/5 rounded-[20px] relative overflow-hidden snap-start shrink-0 shadow-sm">
               {/* top solid bar */}
               <div className="absolute top-0 left-0 w-full h-[3px] bg-[#0A84FF]" />
               <div className="p-3">
                   <div className="bg-[#0A84FF]/10 text-[#0A84FF] text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mb-2">
                       {idx === 0 ? 'Murah' : idx === 1 ? 'Populer' : 'Terlaris'}
                   </div>
                   <h4 className="font-semibold text-white/90 text-[13px] leading-tight mb-1">{pkg.name}</h4>
                   <p className="text-[16px] font-bold text-white mb-3 tracking-tight">Rp {pkg.price.toLocaleString('id-ID')}</p>
                   
                   <div className="flex gap-1.5">
                       <span className="flex items-center gap-1 bg-white/5 text-white/60 text-[9px] font-medium px-1.5 py-0.5 rounded">
                           <span className="opacity-70">🕒</span>{pkg.duration}
                       </span>
                       <span className="flex items-center gap-1 bg-white/5 text-white/60 text-[9px] font-medium px-1.5 py-0.5 rounded">
                           <span className="opacity-70">⚡</span>{pkg.speed}
                       </span>
                   </div>
               </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
