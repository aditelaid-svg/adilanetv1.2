import React, { useState } from 'react';
import { useAppContext, Package } from '../../AppContext';
import { Wifi, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function UserPackages() {
  const { packages, currentUser, buyPackage } = useAppContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('Semua');

  return (
    <div className="p-5 pb-24">
      <div className="mb-5 pt-4">
        <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Paket Voucher</h1>
        <p className="text-slate-400 text-[13px] font-medium">{packages.length} paket tersedia saat ini</p>
      </div>

      <div className="relative mb-5">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input 
            type="text" 
            placeholder="Cari paket..." 
            className="w-full bg-[#1C1C1E] border border-white/5 text-white rounded-2xl pl-11 pr-4 py-3 text-[15px] focus:outline-none focus:border-[#0A84FF]/50 shadow-sm transition-colors"
          />
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2 mb-4 hide-scrollbar snap-x">
          {['Semua', '1 Hari', '3 Hari', '7 Hari', '30 Hari'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`snap-start shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all border ${filter === f ? 'bg-[#0A84FF] text-white border-transparent' : 'bg-[#1C1C1E] text-slate-300 hover:bg-white/10 border-white/5'}`}
              >
                  {f}
              </button>
          ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {packages.map((pkg, idx) => (
          <motion.div 
            key={pkg.id} 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-[#1C1C1E] border border-white/5 rounded-3xl relative overflow-hidden shadow-sm flex flex-col"
          >
            {/* Top Solid Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#0A84FF]" />
            
            <div className="p-4 flex-1 flex flex-col">
                <div className="bg-[#0A84FF]/10 text-[#0A84FF] text-[10px] font-bold px-2 py-0.5 rounded-md w-fit mb-3">
                    {idx === 0 ? 'Murah' : idx === 1 ? 'Populer' : 'Hemat'}
                </div>
                
                <h3 className="text-white font-semibold text-[15px] leading-tight mb-1">{pkg.name}</h3>
                <div className="text-[20px] font-bold text-white mb-4 tracking-tight">
                    Rp {pkg.price.toLocaleString('id-ID')}
                </div>
                
                <div className="space-y-2 mb-5 flex-1">
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] font-medium">
                        <div className="w-4 h-4 rounded bg-white/5 flex items-center justify-center"><span className="text-[10px]">🕒</span></div> {pkg.duration}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] font-medium">
                        <div className="w-4 h-4 rounded bg-white/5 flex items-center justify-center"><span className="text-[10px]">⚡</span></div> {pkg.speed}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] font-medium">
                        <div className="w-4 h-4 rounded bg-white/5 flex items-center justify-center"><span className="text-[10px]"><Wifi className="w-2.5 h-2.5 text-slate-400"/></span></div> {pkg.quota}
                    </div>
                </div>

                <button 
                  onClick={() => navigate('/user/buy', { state: { packageId: pkg.id } })}
                  className="w-full bg-[#0A84FF] hover:bg-[#0070e0] text-white font-semibold py-2.5 rounded-xl text-[13px] transition-transform hover:scale-[1.02] active:scale-[0.98] mt-auto"
                >
                  Beli
                </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
