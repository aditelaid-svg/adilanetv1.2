import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Clock, Check, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { formatRupiah } from '../../lib/format';

export default function UserHistory() {
  const { transactions, currentUser, packages, loading } = useAppContext();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const userHistory = transactions.filter(t => t.user_id === currentUser?.id);
  const totalBelanja = userHistory.filter(t => t.status === 'success').reduce((acc, curr) => acc + curr.amount, 0);

  const getPackageName = (pkgId: number) => {
    const pkg = packages.find(p => p.id === pkgId);
    return pkg?.name || 'Paket Tidak Diketahui';
  };

  const copyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeFormatted = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    return `${dateFormatted}, ${timeFormatted}`;
  };

  const statusColor = {
    success: { bg: 'bg-success/10', text: 'text-success', label: 'Berhasil' },
    pending: { bg: 'bg-gold/10', text: 'text-gold', label: 'Pending' },
    failed: { bg: 'bg-danger/10', text: 'text-danger', label: 'Gagal' },
  };

  return (
    <div className="p-5 pb-24 mt-2">
      <div className="mb-6 pt-2">
        <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Riwayat</h1>
        <p className="text-white/50 text-[13px] font-medium">Total berhasil: {formatRupiah(totalBelanja)}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface border border-white/5 rounded-[20px] p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[22px] font-bold text-success mb-0.5">{userHistory.filter(t => t.status === 'success').length}</span>
          <span className="text-[11px] text-white/50 font-medium tracking-wide">Berhasil</span>
        </div>
        <div className="bg-surface border border-white/5 rounded-[20px] p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[22px] font-bold text-gold mb-0.5">{userHistory.filter(t => t.status === 'pending').length}</span>
          <span className="text-[11px] text-white/50 font-medium tracking-wide">Pending</span>
        </div>
        <div className="bg-surface border border-white/5 rounded-[20px] p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[22px] font-bold text-danger mb-0.5">{userHistory.filter(t => t.status === 'failed').length}</span>
          <span className="text-[11px] text-white/50 font-medium tracking-wide">Gagal</span>
        </div>
      </div>

      <div className="space-y-4">
        {loading && userHistory.length === 0 ? (
          <SkeletonList count={3} />
        ) : userHistory.length === 0 ? (
          <EmptyState icon={Clock} title="Belum ada transaksi" description="Voucher yang kamu beli akan muncul di sini." />
        ) : (
          userHistory.map((tx, index) => {
            const st = statusColor[tx.status] || statusColor.pending;
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-surface border border-white/5 rounded-[24px] p-5 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-[12px] ${st.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Check className={`w-5 h-5 ${st.text}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[15px] text-white leading-tight mb-1">
                        {tx.package_name || getPackageName(tx.package_id)}
                      </h4>
                      <div className="flex gap-2 mb-2">
                        <span className={`${st.bg} ${st.text} text-[10px] font-bold px-2 py-0.5 rounded-md`}>{st.label}</span>
                        <span className="bg-white/5 text-white/60 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">{tx.payment_method}</span>
                      </div>
                      <span className="text-[11px] font-medium text-white/40">{formatDate(tx.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white tracking-tight text-[15px]">{formatRupiah(tx.amount)}</p>
                  </div>
                </div>

                {tx.status === 'success' && tx.voucher_code && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[11px] font-semibold text-white/40 mb-2 tracking-wide uppercase">Kode Voucher</p>
                    <div className="bg-white/[0.02] border border-white/5 rounded-[16px] p-4 flex justify-between items-center">
                      <p className="font-mono font-bold tracking-widest text-brand text-[15px]">{tx.voucher_code}</p>
                      <button
                        onClick={() => copyCode(tx.id, tx.voucher_code)}
                        aria-label="Salin kode voucher"
                        className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors"
                      >
                        {copiedId === tx.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                        <span className="text-[11px] font-bold uppercase tracking-wider">{copiedId === tx.id ? 'Tersalin' : 'Salin'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
