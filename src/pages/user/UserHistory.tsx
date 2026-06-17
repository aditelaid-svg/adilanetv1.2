import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Clock, Check, Copy } from 'lucide-react';
import { motion } from 'motion/react';

export default function UserHistory() {
  const { transactions, currentUser, packages } = useAppContext();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  const userHistory = transactions.filter(t => t.user_id === currentUser?.id);
  const totalBelanja = userHistory.reduce((acc, curr) => acc + curr.amount, 0);

  const getPackageInfo = (pkgId: number) => packages.find(p => p.id === pkgId);

  const copyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-5 pb-24 mt-2">
       <div className="mb-6 pt-2">
        <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Riwayat</h1>
        <p className="text-slate-400 text-[13px] font-medium">Total belanja: Rp {totalBelanja.toLocaleString('id-ID')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#1C1C1E] border border-white/5 rounded-[20px] p-4 flex flex-col items-center justify-center shadow-sm">
             <span className="text-[22px] font-bold text-[#34C759] mb-0.5">{userHistory.filter(t => t.status === 'success').length}</span>
             <span className="text-[11px] text-white/50 font-medium tracking-wide">Berhasil</span>
          </div>
          <div className="bg-[#1C1C1E] border border-white/5 rounded-[20px] p-4 flex flex-col items-center justify-center shadow-sm">
             <span className="text-[22px] font-bold text-[#FF9F0A] mb-0.5">{userHistory.filter(t => t.status === 'pending').length}</span>
             <span className="text-[11px] text-white/50 font-medium tracking-wide">Pending</span>
          </div>
          <div className="bg-[#1C1C1E] border border-white/5 rounded-[20px] p-4 flex flex-col items-center justify-center shadow-sm">
             <span className="text-[22px] font-bold text-[#FF453A] mb-0.5">{userHistory.filter(t => t.status === 'failed').length}</span>
             <span className="text-[11px] text-white/50 font-medium tracking-wide">Gagal</span>
          </div>
      </div>

      <div className="space-y-4">
        {userHistory.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="w-16 h-16 bg-[#1C1C1E] rounded-full flex items-center justify-center mb-4">
               <Clock className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40 font-medium text-[15px]">Belum ada transaksi</p>
          </div>
        ) : (
          userHistory.map((tx, index) => {
            const pkg = getPackageInfo(tx.package_id);
            const dateStr = new Date(tx.date).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'short', year: 'numeric'
            });
            const timeStr = new Date(tx.date).toLocaleTimeString('id-ID', {
              hour: '2-digit', minute: '2-digit'
            }).replace('.', ':');

            return (
              <motion.div 
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#1C1C1E] border border-white/5 rounded-[24px] p-5 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-[12px] bg-[#34C759]/10 border border-[#34C759]/20 flex items-center justify-center shrink-0 mt-0.5">
                       <Check className="w-5 h-5 text-[#34C759]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[15px] text-white leading-tight mb-1">{pkg?.name}</h4>
                      <p className="text-[13px] text-white/50 mb-2 font-medium">RT Maju Jaya - Blok A</p>
                      <div className="flex gap-2 mb-2">
                        <span className="bg-[#34C759]/10 text-[#34C759] text-[10px] font-bold px-2 py-0.5 rounded-md">Berhasil</span>
                        <span className="bg-white/5 text-white/60 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">{tx.payment_method}</span>
                      </div>
                      <span className="text-[11px] font-medium text-white/40">{dateStr}, {timeStr}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white tracking-tight text-[15px]">Rp {tx.amount.toLocaleString('id-ID')}</p>
                  </div>
                </div>

                {tx.status === 'success' && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[11px] font-semibold text-white/40 mb-2 tracking-wide uppercase">Kode Voucher</p>
                    <div className="bg-white/[0.02] border border-white/5 rounded-[16px] p-4 flex justify-between items-center group">
                      <p className="font-mono font-bold tracking-widest text-[#0A84FF] text-[15px]">{tx.voucher_code}</p>
                      <button 
                        onClick={() => copyCode(tx.id, tx.voucher_code)}
                        className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors"
                      >
                        {copiedId === tx.id ? <Check className="w-4 h-4 text-[#34C759]" /> : <Copy className="w-4 h-4" />}
                        <span className="text-[11px] font-bold uppercase tracking-wider">{copiedId === tx.id ? 'Tersalin' : 'Salin'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  );
}
