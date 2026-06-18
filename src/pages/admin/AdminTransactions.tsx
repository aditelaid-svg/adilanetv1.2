import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { useToast } from '../../components/Toast';
import { Search, CheckCircle2, Clock, XCircle, ArrowUpRight, Trash2 } from 'lucide-react';

export default function AdminTransactions() {
  const { transactions, deleteVoucher } = useAppContext();
  const toast = useToast();
  const [search, setSearch] = useState('');

  const handleDelete = async (txId: number) => {
    const ok = await toast.confirm(
      'Hapus Transaksi?',
      'Data transaksi dan voucher ini akan dihapus permanen.',
      { confirmText: 'Ya, Hapus', danger: true }
    );
    if (ok) {
      await deleteVoucher(txId);
      toast.success('Transaksi dihapus');
    }
  };

  const filtered = transactions.filter(tx =>
    !search ||
    (tx.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (tx.package_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (tx.voucher_code || '').toLowerCase().includes(search.toLowerCase())
  );

  const successCount = transactions.filter(t => t.status === 'success').length;
  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const failedCount = transactions.filter(t => t.status === 'failed').length;
  const totalRevenue = transactions.filter(t => t.status === 'success').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Transaksi</h1>
          <p className="text-white/50 text-[13px]">{transactions.length} transaksi • Rp {totalRevenue.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, paket, atau kode voucher..."
          className="w-full bg-white/[0.03] border border-white/10 text-white rounded-[16px] pl-9 pr-4 py-3 text-[13px] focus:outline-none focus:border-[#0A84FF]/50 focus:bg-white/[0.05] transition-colors shadow-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-[16px] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
            <span className="text-[17px] font-bold text-white leading-none">{successCount}</span>
          </div>
          <span className="text-[11px] text-white/50 font-medium">Berhasil</span>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-[16px] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Clock className="w-3.5 h-3.5 text-[#FF9F0A]" />
            <span className="text-[17px] font-bold text-white leading-none">{pendingCount}</span>
          </div>
          <span className="text-[11px] text-white/50 font-medium">Pending</span>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-[16px] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-0.5">
            <XCircle className="w-3.5 h-3.5 text-[#FF453A]" />
            <span className="text-[17px] font-bold text-white leading-none">{failedCount}</span>
          </div>
          <span className="text-[11px] text-white/50 font-medium">Gagal</span>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-[16px] overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">Pengguna</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">Paket</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">Metode</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap text-right">Jumlah</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((tx) => {
                const date = new Date(tx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                const time = new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                return (
                  <tr key={tx.id} className="hover:bg-white/[0.04] transition-colors group">
                    <td className="px-4 py-2.5 whitespace-nowrap text-[12px] font-medium text-white/60">
                      <div>{date}</div>
                      <div className="text-[10px] text-white/30">{time}</div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-white leading-tight">{tx.user_name || '-'}</span>
                        <span className="text-[10px] text-[#0A84FF] font-mono leading-tight">{tx.voucher_code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-[12px] font-medium text-white/80">{tx.package_name || '-'}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-[10px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded font-semibold uppercase">{tx.payment_method}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                      <span className="text-[13px] font-bold text-white tracking-tight">Rp {tx.amount.toLocaleString('id-ID')}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <div className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${tx.status === 'success' ? 'bg-[#34C759]/20 text-[#34C759]' : tx.status === 'pending' ? 'bg-[#FF9F0A]/20 text-[#FF9F0A]' : 'bg-[#FF453A]/20 text-[#FF453A]'}`}>
                        {tx.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : tx.status === 'pending' ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-white/50 hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors mx-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/30 text-[13px]">Tidak ada transaksi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 10 && (
          <div className="p-3 border-t border-white/5 bg-white/[0.01] flex justify-center">
            <button className="text-[11px] font-semibold text-white/50 hover:text-white flex items-center gap-1">
              Muat Lebih Banyak <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
