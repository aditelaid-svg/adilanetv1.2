import React from 'react';
import { useAppContext } from '../../AppContext';
import { Search, Download, CheckCircle2, Clock, XCircle, ArrowUpRight, Trash2 } from 'lucide-react';

export default function AdminTransactions() {
  const { transactions, users, packages, deleteVoucher } = useAppContext();
  
  const handleDelete = (txId: number) => {
    if (window.confirm('Yakin ingin menghapus data transaksi/voucher ini?')) {
        deleteVoucher(txId);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Transaksi</h1>
          <p className="text-white/50 text-[13px]">{transactions.length} transaksi • Total: Rp 33.000</p>
        </div>
        <button className="bg-white/5 hover:bg-white/10 text-white/80 px-3 py-2 rounded-xl text-[13px] font-medium flex items-center gap-2 border border-white/5 transition-colors active:scale-95">
          <Download className="w-4 h-4 text-white/50" /> Export
        </button>
      </div>

      <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input 
            type="text" 
            placeholder="Cari nama, nomor, paket, kode..." 
            className="w-full bg-white/[0.03] border border-white/10 text-white rounded-[16px] pl-9 pr-4 py-3 text-[13px] focus:outline-none focus:border-[#0A84FF]/50 focus:bg-white/[0.05] transition-colors shadow-sm"
          />
      </div>

      <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-[16px] p-3 flex flex-col justify-center">
             <div className="flex items-center gap-1.5 mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
                <span className="text-[17px] font-bold text-white leading-none">3</span>
             </div>
             <span className="text-[11px] text-white/50 font-medium">Berhasil</span>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-[16px] p-3 flex flex-col justify-center">
             <div className="flex items-center gap-1.5 mb-0.5">
                <Clock className="w-3.5 h-3.5 text-[#FF9F0A]" />
                <span className="text-[17px] font-bold text-white leading-none">1</span>
             </div>
             <span className="text-[11px] text-white/50 font-medium">Pending</span>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-[16px] p-3 flex flex-col justify-center">
             <div className="flex items-center gap-1.5 mb-0.5">
                <XCircle className="w-3.5 h-3.5 text-[#FF453A]" />
                <span className="text-[17px] font-bold text-white leading-none">1</span>
             </div>
             <span className="text-[11px] text-white/50 font-medium">Gagal</span>
          </div>
      </div>

      {/* Excel-style table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-[16px] overflow-hidden backdrop-blur-xl">
         <div className="overflow-x-auto hide-scrollbar">
           <table className="w-full text-left border-collapse min-w-[500px]">
             <thead>
               <tr className="border-b border-white/10 bg-white/[0.02]">
                 <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap min-w-[80px]">Tanggal</th>
                 <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">Pengguna</th>
                 <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">Paket</th>
                 <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">Metode</th>
                 <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap text-right">Jumlah</th>
                 <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {transactions.map((tx) => {
                    const user = users.find(u => u.id === tx.user_id);
                    const pkg = packages.find(p => p.id === tx.package_id);
                    const date = new Date(tx.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                    
                    return (
                        <tr key={tx.id} className="hover:bg-white/[0.04] transition-colors group">
                           <td className="px-4 py-2.5 whitespace-nowrap text-[12px] font-medium text-white/60">
                               {date}
                           </td>
                           <td className="px-4 py-2.5 whitespace-nowrap">
                               <div className="flex flex-col">
                                 <span className="text-[13px] font-semibold text-white leading-tight">{user?.name}</span>
                                 <span className="text-[10px] text-[#0A84FF] font-mono leading-tight">{tx.voucher_code}</span>
                               </div>
                           </td>
                           <td className="px-4 py-2.5 whitespace-nowrap">
                               <span className="text-[12px] font-medium text-white/80">{pkg?.name}</span>
                           </td>
                           <td className="px-4 py-2.5 whitespace-nowrap">
                               <div className="flex items-center gap-1.5">
                                 <span className="text-[10px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded font-semibold uppercase">{tx.payment_method}</span>
                               </div>
                           </td>
                           <td className="px-4 py-2.5 whitespace-nowrap text-right">
                               <span className="text-[13px] font-bold text-white tracking-tight">Rp {(tx.amount).toLocaleString('id-ID')}</span>
                           </td>
                           <td className="px-4 py-2.5 whitespace-nowrap text-center">
                               <div className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${tx.status === 'success' ? 'bg-[#34C759]/20 text-[#34C759]' : tx.status === 'pending' ? 'bg-[#FF9F0A]/20 text-[#FF9F0A]' : 'bg-[#FF453A]/20 text-[#FF453A]'}`}>
                                   {tx.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : tx.status === 'pending' ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                               </div>
                           </td>
                           <td className="px-4 py-2.5 whitespace-nowrap text-center">
                               <button 
                                 onClick={() => handleDelete(tx.id)}
                                 className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-white/50 hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors"
                               >
                                   <Trash2 className="w-3.5 h-3.5" />
                               </button>
                           </td>
                        </tr>
                    )
                })}
             </tbody>
           </table>
         </div>
         <div className="p-3 border-t border-white/5 bg-white/[0.01] flex justify-center">
             <button className="text-[11px] font-semibold text-white/50 hover:text-white flex items-center gap-1">
                 Muat Lebih Banyak <ArrowUpRight className="w-3 h-3" />
             </button>
         </div>
      </div>
    </div>
  );
}
