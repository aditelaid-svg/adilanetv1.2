import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../AppContext';
import { Bell, Wallet, ShoppingBag, Info, ChevronLeft, CheckCheck } from 'lucide-react';
import { motion } from 'motion/react';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';

const typeStyle = {
  topup: { icon: Wallet, bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-600' },
  purchase: { icon: ShoppingBag, bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-600' },
  info: { icon: Info, bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-500' },
} as const;

export default function UserNotifications() {
  const navigate = useNavigate();
  const { notifications, loading, fetchNotifications, markNotificationRead, markAllNotificationsRead } = useAppContext();

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const unread = notifications.filter(n => !n.read).length;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    return `${date}, ${time}`;
  };

  return (
    <div className="p-5 pb-24 mt-2">
      <div className="flex items-center gap-3 mb-6 pt-12">
        <button
          onClick={() => navigate(-1)}
          aria-label="Kembali"
          className="w-10 h-10 flex items-center justify-center rounded-xl glass-pill text-slate-600 hover:text-slate-800 transition-all active:scale-95 shrink-0"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.8} />
        </button>
        <div className="flex-1">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-800 leading-none">Notifikasi</h1>
          <p className="text-slate-500 text-[13px] font-medium mt-1">{unread > 0 ? `${unread} belum dibaca` : 'Semua sudah dibaca'}</p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAllNotificationsRead()}
            className="flex items-center gap-1.5 glass-pill text-sky-600 font-semibold py-2 px-3 rounded-[12px] text-[12px] active:scale-95 transition-all shrink-0"
          >
            <CheckCheck className="w-4 h-4" strokeWidth={2} /> Baca semua
          </button>
        )}
      </div>

      <div className="space-y-3">
        {loading && notifications.length === 0 ? (
          <SkeletonList count={4} />
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} title="Belum ada notifikasi" description="Pemberitahuan saldo & pembelian akan muncul di sini." />
        ) : (
          notifications.map((n, idx) => {
            const st = typeStyle[n.type] || typeStyle.info;
            const Icon = st.icon;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => { if (!n.read) markNotificationRead(n.id); }}
                className={`glass-strong rounded-[20px] p-4 flex gap-3 cursor-pointer transition-colors ${n.read ? '' : 'ring-1 ring-sky-200'}`}
              >
                <div className={`w-10 h-10 rounded-[12px] ${st.bg} border ${st.border} flex items-center justify-center shrink-0 ${st.text}`}>
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800 text-[14px] leading-tight">{n.title}</h3>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />}
                  </div>
                  <p className="text-[12px] text-slate-500 mt-1 leading-snug">{n.body}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5">{formatDate(n.created_at)}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
