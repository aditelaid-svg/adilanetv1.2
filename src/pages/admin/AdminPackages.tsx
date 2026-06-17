import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Plus, Edit, Trash2, Clock, Zap, Wifi, Eye, Link as LinkIcon, Check } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminPackages() {
  const { packages } = useAppContext();
  const [copiedLink, setCopiedLink] = useState<number | null>(null);

  const handleCopyLink = (packageId: number) => {
    // Construct the public link
    const url = `${window.location.origin}/checkout/${packageId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(packageId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Paket Voucher</h1>
          <p className="text-white/50 text-[13px] font-medium">{packages.length} paket tersedia</p>
        </div>
        <button className="bg-[#0A84FF] hover:bg-[#0070e0] active:scale-95 text-white px-3.5 py-2 rounded-[14px] text-[13px] font-semibold flex items-center gap-1.5 transition-all">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {packages.map((pkg, idx) => (
          <motion.div 
            key={pkg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/[0.02] border border-white/5 rounded-[24px] p-5 relative overflow-hidden shadow-sm backdrop-blur-xl"
          >
            {/* Top Solid Bar */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-[#0A84FF]" />
            
            <div className="flex justify-between items-start mb-2 mt-1">
              <div className="bg-[#0A84FF]/10 text-[#0A84FF] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {idx === 0 ? 'Murah' : idx === 1 ? 'Populer' : 'Standar'}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleCopyLink(pkg.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#0A84FF]/10 text-[#0A84FF] hover:bg-[#0A84FF]/20 transition-colors tooltip-trigger"
                  title="Salin Link Publik"
                >
                  {copiedLink === pkg.id ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-white/50 hover:text-white transition-colors">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-white/50 hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h3 className="text-[17px] font-semibold text-white mb-0.5">{pkg.name}</h3>
            
            <div className="text-[28px] font-bold text-white mb-4 tracking-tight">
                Rp {pkg.price.toLocaleString('id-ID')}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
               <div className="flex items-center gap-1.5 bg-white/5 text-white/70 text-[11px] font-medium px-2 py-1 rounded-md border border-white/5">
                 <Clock className="w-3.5 h-3.5" />
                 {pkg.duration}
               </div>
               <div className="flex items-center gap-1.5 bg-white/5 text-white/70 text-[11px] font-medium px-2 py-1 rounded-md border border-white/5">
                 <Zap className="w-3.5 h-3.5" />
                 {pkg.speed}
               </div>
               <div className="flex items-center gap-1.5 bg-white/5 text-white/70 text-[11px] font-medium px-2 py-1 rounded-md border border-white/5">
                 <Wifi className="w-3.5 h-3.5" />
                 {pkg.quota}
               </div>
            </div>
               
            <div className="flex justify-between items-center text-[11px] font-semibold tracking-wide uppercase text-white/40 mb-4 px-1">
                <span>Router Pusat</span>
                <span>{Math.floor(Math.random() * 5) + 1}x terjual</span>
            </div>

            <button className="w-full py-2.5 border border-[#34C759]/20 bg-[#34C759]/10 text-[#34C759] font-medium rounded-[14px] flex items-center justify-center gap-1.5 transition-colors text-[13px]">
                <Eye className="w-4 h-4" /> Aktif
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

