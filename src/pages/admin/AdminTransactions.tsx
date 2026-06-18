import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { useToast } from '../../components/Toast';
import { Search, CheckCircle2, Clock, XCircle, ArrowUpRight, Trash2, Receipt } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { formatRupiah, formatDateShort, formatTime } from '../../lib/format';

export default function AdminTransactions() {
  const { transactions, deleteVoucher, loading } = useAppContext();
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

  const copyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success('Kode disalin', code);
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
          <h1 className="text-[28px] font-bold tracking-tight text-slate-800 mb-1">Transaksi</h1>
          <p className="text-slate-500 text-[13px]">{transactions.length} transaksi • {formatRupiah(totalRevenue)}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, paket, atau kode voucher..."
          className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-2xl pl-9 pr-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors shadow-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-[20px] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" strokeWidth={2} />
            <span className="text-[17px] font-bold text-slate-800 leading-none">{successCount}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Berhasil</span>
        </div>
        <div className="glass rounded-[20px] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
            <span className="text-[17px] font-bold text-slate-800 leading-none">{pendingCount}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Pending</span>
        </div>
        <div className="glass rounded-[20px] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-0.5">
            <XCircle className="w-3.5 h-3.5 text-rose-600" strokeWidth={2} />
            <span className="text-[17px] font-bold text-slate-800 leading-none">{failedCount}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Gagal</span>
        </div>
      </div>

      {loading && transactions.length === 0 ? (
        <SkeletonList count={5} />
      ) : (
      <div className="glass-strong rounded-[24px] overflow-hidden">
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Pengguna</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Paket</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Metode</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Jumlah</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((tx) => {
                const date = formatDateShort(tx.created_at);
                const time = formatTime(tx.created_at);
                return (
                  <tr key={tx.id} className="hover:bg-white/60 transition-colors group">
                    <td className="px-4 py-2.5 whitespace-nowrap text-[12px] font-medium text-slate-600">
                      <div>{date}</div>
                      <div className="text-[10px] text-slate-400">{time}</div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-slate-800 leading-tight">{tx.user_name || '-'}</span>
                        <button type="button" onClick={() => copyCode(tx.voucher_code)} title="Salin kode" aria-label="Salin kode voucher" className="text-[10px] text-sky-600 font-mono leading-tight text-left hover:underline">{tx.voucher_code}</button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-[12px] font-medium text-slate-600">{tx.package_name || '-'}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold uppercase">{tx.payment_method}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                      <span className="text-[13px] font-bold text-slate-800 tracking-tight">{formatRupiah(tx.amount)}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <div className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${tx.status === 'success' ? 'bg-teal-100 text-teal-700' : tx.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        {tx.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : tx.status === 'pending' ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        aria-label="Hapus transaksi"
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors mx-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2">
                    <EmptyState
                      icon={Receipt}
                      title={search ? 'Tidak ada hasil' : 'Belum ada transaksi'}
                      description={search ? 'Coba kata kunci lain.' : 'Transaksi voucher akan muncul di sini.'}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 10 && (
          <div className="p-3 border-t border-slate-100 flex justify-center">
            <button className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1">
              Muat Lebih Banyak <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
