import React from 'react';
import { useAppContext, Promo } from '../../AppContext';
import { Wifi, Zap, ArrowRight, ChevronRight, Plus, CreditCard, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { formatRupiah } from '../../lib/format';
import { PROMO_BG, PromoIcon } from '../../lib/promoStyles';

export default function UserHome() {
  const { currentUser, packages, transactions, promos } = useAppContext();
  const navigate = useNavigate();

  const userTransactions = transactions.filter(t => t.user_id === currentUser?.id);
  const activeTx = userTransactions[0];
  const activePackage = packages.find(p => p.id === activeTx?.package_id);

  const handlePromoClick = (p: Promo) => {
    if (p.link_type === 'packages') navigate('/user/packages');
    else if (p.link_type === 'package' && p.link_value) navigate('/user/buy', { state: { packageId: Number(p.link_value), promoId: p.id } });
    else if (p.link_type === 'external' && p.link_value) window.open(p.link_value, '_blank', 'noopener');
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 19) return 'Selamat Sore';
    return 'Selamat Malam';
  })();

  return (
    <div className="space-y-6 pb-4">

      {/* Header */}
      <div className="px-6 pt-14 pb-1 flex justify-between items-center">
        <div>
          <p className="text-[12px] text-slate-500 font-semibold tracking-wide uppercase mb-0.5">{greeting}</p>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-800 leading-none">{currentUser?.name || 'Pelanggan'}</h1>
        </div>
        <div className="w-12 h-12 rounded-full glass-pill flex items-center justify-center shadow-sm text-sky-600 font-bold text-[17px]">
          {(currentUser?.name || 'A').charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Balance Card */}
      <div className="px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-[32px] p-7 relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[14px] text-slate-500 font-semibold mb-2">Saldo AdilaNet</p>
              <div className="text-[38px] font-bold tracking-tight text-slate-800 flex items-baseline">
                <span className="text-[20px] mr-1.5 font-semibold text-slate-400">Rp</span>
                {formatRupiah(currentUser?.balance ?? 0, false)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center shadow-inner border border-sky-200">
              <CreditCard size={24} className="text-sky-600" strokeWidth={1.5} />
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-200/60">
            <button className="flex-1 py-3.5 rounded-[18px] bg-white border border-slate-100 shadow-sm font-semibold text-[14px] text-slate-700 flex justify-center items-center gap-2 active:scale-95 transition-transform">
              <Plus size={18} className="text-slate-400" /> Top Up
            </button>
            <button
              onClick={() => navigate('/user/buy')}
              className="flex-1 py-3.5 rounded-[18px] bg-sky-500 text-white shadow-[0_8px_20px_rgba(14,165,233,0.3)] font-semibold text-[14px] flex justify-center items-center gap-2 active:scale-95 transition-transform"
            >
              <Wifi size={18} className="text-white" /> Beli Voucher
            </button>
          </div>
        </motion.div>
      </div>

      {/* Active Voucher */}
      {activeTx?.voucher_code && (
        <div className="px-6">
          <h2 className="text-[15px] font-bold text-slate-800 mb-3 px-1">Voucher Aktif</h2>
          <div className="glass rounded-[24px] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-[14px] bg-teal-50 border border-teal-100 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-teal-600" strokeWidth={1.8} />
              </div>
              <div>
                <h4 className="text-slate-800 font-bold text-[14px] leading-tight">{activePackage?.name || 'Paket Aktif'}</h4>
                <p className="text-sky-600 font-mono text-[13px] font-bold mt-0.5">{activeTx.voucher_code}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>
        </div>
      )}

      {/* Promo Banners */}
      {promos.length > 0 && (
        <div className="flex overflow-x-auto gap-3 px-6 pb-1 hide-scrollbar snap-x">
          {promos.map((p) => {
            const clickable = p.link_type !== 'none';
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => clickable && handlePromoClick(p)}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handlePromoClick(p); } }}
                className={`min-w-[240px] w-[240px] h-24 rounded-[20px] p-3.5 relative overflow-hidden snap-start shrink-0 flex flex-col justify-end shadow-[0_8px_24px_rgba(14,165,233,0.12)] ${p.image_url ? 'bg-slate-900' : (PROMO_BG[p.color] || 'bg-iris')} ${clickable ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
              >
                {p.image_url ? (
                  <>
                    <img src={p.image_url} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  </>
                ) : (
                  <div className="absolute -right-4 -top-8 w-24 h-24 bg-white/20 blur-xl rounded-full" />
                )}
                <div className="relative z-10">
                  {p.badge && (
                    <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/30 text-white uppercase tracking-wide mb-1">{p.badge}</span>
                  )}
                  {!p.image_url && <PromoIcon name={p.icon} className="w-4 h-4 text-white mb-1" />}
                  <h4 className="text-white font-bold text-[14px] leading-tight">{p.title}</h4>
                  {p.subtitle && <p className="text-white/85 text-[11px] font-medium leading-snug mt-0.5 line-clamp-1">{p.subtitle}</p>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Popular Packages */}
      <section className="px-6">
        <div className="flex justify-between items-end mb-4 px-1">
          <h2 className="text-[15px] font-bold text-slate-800">Paket Populer</h2>
          <button onClick={() => navigate('/user/packages')} className="text-[13px] font-semibold text-sky-600 flex items-center gap-0.5 active:opacity-70">
            Lihat Semua <ArrowRight size={14} />
          </button>
        </div>

        <div className="flex overflow-x-auto gap-4 hide-scrollbar snap-x pb-2 -mx-6 px-6">
          {packages.slice(0, 5).map((pkg, idx) => {
            const popular = idx === 1;
            return (
              <button
                key={pkg.id}
                onClick={() => navigate('/user/buy', { state: { packageId: pkg.id } })}
                className={`min-w-[160px] w-[160px] snap-start shrink-0 rounded-[28px] p-5 flex flex-col relative text-left transition-transform active:scale-95 ${popular ? 'glass-strong ring-2 ring-sky-300 shadow-[0_12px_32px_rgba(14,165,233,0.25)]' : 'glass-strong'}`}
              >
                {popular && (
                  <div className="absolute top-0 right-0 px-3 py-1.5 bg-sky-500 text-white text-[10px] font-bold rounded-bl-xl rounded-tr-[28px] uppercase tracking-wider">
                    Populer
                  </div>
                )}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${popular ? 'bg-sky-500 border border-sky-400' : 'bg-sky-50 border border-sky-100'}`}>
                  <Zap size={18} className={popular ? 'text-white' : 'text-sky-500'} strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-[16px] mb-1 text-slate-800">{pkg.name}</h3>
                <div className={`text-[20px] font-extrabold mb-4 tracking-tight ${popular ? 'text-sky-600' : 'text-slate-800'}`}>
                  {formatRupiah(pkg.price)}
                </div>
                <div className="space-y-2 mt-auto">
                  <p className="text-[12px] font-medium flex items-center gap-2 text-slate-500">
                    <Clock size={14} className="text-slate-400" /> {pkg.duration}
                  </p>
                  <p className="text-[12px] font-medium flex items-center gap-2 text-slate-500">
                    <Wifi size={14} className="text-slate-400" /> {pkg.speed}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

    </div>
  );
}
