import React, { useState } from 'react';
import { useAppContext, Package } from '../../AppContext';
import { Wifi, Search, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { formatRupiah } from '../../lib/format';

export default function UserPackages() {
  const { packages, currentUser, buyPackage } = useAppContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('Semua');

  return (
    <div className="px-6 pt-14 pb-24">
      <div className="mb-5">
        <h1 className="text-[28px] font-bold tracking-tight text-slate-800 mb-1">Paket Voucher</h1>
        <p className="text-slate-500 text-[13px] font-medium">{packages.length} paket tersedia saat ini</p>
      </div>

      <div className="relative mb-5">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
          <input 
            type="text" 
            placeholder="Cari paket..." 
            className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-2xl pl-11 pr-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 shadow-sm transition-colors"
          />
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2 mb-4 hide-scrollbar snap-x">
          {['Semua', '1 Hari', '3 Hari', '7 Hari', '30 Hari'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`snap-start shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all border ${filter === f ? 'bg-sky-500 text-white border-transparent shadow-[0_8px_20px_rgba(14,165,233,0.3)]' : 'bg-white text-slate-600 hover:bg-sky-50 border-slate-100 shadow-sm'}`}
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
            className="glass-strong rounded-[28px] relative overflow-hidden flex flex-col"
          >
            {/* Top Solid Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-sky-500" />
            
            <div className="p-4 flex-1 flex flex-col">
                <div className="bg-sky-50 text-sky-600 border border-sky-100 text-[10px] font-bold px-2 py-0.5 rounded-md w-fit mb-3">
                    {idx === 0 ? 'Murah' : idx === 1 ? 'Populer' : 'Hemat'}
                </div>
                
                <h3 className="text-slate-800 font-bold text-[15px] leading-tight mb-1 tracking-tight">{pkg.name}</h3>
                <div className="text-[20px] font-bold text-slate-800 mb-4 tracking-tight">
                    {formatRupiah(pkg.price)}
                </div>
                
                <div className="space-y-2 mb-5 flex-1">
                    <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
                        <div className="w-5 h-5 rounded-[8px] bg-sky-50 flex items-center justify-center"><Clock className="w-3 h-3 text-sky-500" strokeWidth={1.8} /></div> {pkg.duration}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
                        <div className="w-5 h-5 rounded-[8px] bg-sky-50 flex items-center justify-center"><Zap className="w-3 h-3 text-sky-500" strokeWidth={1.8} /></div> {pkg.speed}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
                        <div className="w-5 h-5 rounded-[8px] bg-sky-50 flex items-center justify-center"><Wifi className="w-3 h-3 text-sky-500" strokeWidth={1.8} /></div> {pkg.quota}
                    </div>
                </div>

                <button 
                  onClick={() => navigate('/user/buy', { state: { packageId: pkg.id } })}
                  className="w-full bg-sky-500 text-white font-semibold py-2.5 rounded-[18px] text-[13px] shadow-[0_8px_20px_rgba(14,165,233,0.3)] transition-transform active:scale-95 mt-auto"
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
