import React from "react";
import { Bell, Wifi, Zap, Clock, ArrowRight, Home, Package, History, User, Plus, CreditCard, Sparkles, Activity } from "lucide-react";
import "./_group.css";

export function AuroraGlass() {
  return (
    <div className="w-[430px] h-[932px] mx-auto relative overflow-hidden text-white font-['Outfit',sans-serif] ag-container">
      {/* Background Aurora */}
      <div className="ag-aurora-bg">
        <div className="ag-glow-1"></div>
        <div className="ag-glow-2"></div>
        <div className="ag-glow-3"></div>
      </div>

      <div className="h-full overflow-y-auto overflow-x-hidden ag-hide-scroll relative z-10 pb-28">
        
        {/* Header */}
        <div className="px-6 pt-14 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 ag-glass p-0.5">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Budi&backgroundColor=b6e3f4" 
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover bg-teal-900/50"
              />
            </div>
            <div>
              <p className="text-xs text-teal-100/70 font-medium tracking-wide">Selamat datang kembali</p>
              <h1 className="text-xl font-semibold tracking-tight">Halo, Budi 👋</h1>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full ag-glass flex items-center justify-center relative hover:bg-white/5 transition-colors">
            <Bell size={20} className="text-teal-50" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]"></span>
          </button>
        </div>

        <div className="px-6 space-y-8">
          
          {/* Balance Card - Premium Fintech Style */}
          <div className="ag-glass-hero rounded-3xl p-6 mt-4">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm text-teal-100/70 mb-1 flex items-center gap-1.5">
                  <CreditCard size={14} /> Saldo AdilaNet
                </p>
                <div className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-teal-200">
                  <span className="text-2xl mr-1 font-medium text-white/70">Rp</span>
                  60.000
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                <Wifi size={20} className="text-teal-300" />
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button className="flex-1 py-3.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 font-medium text-sm flex justify-center items-center gap-2 backdrop-blur-md transition-all active:scale-95">
                <Plus size={16} /> Top Up
              </button>
              <button className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 font-semibold text-sm text-slate-900 flex justify-center items-center gap-2 shadow-[0_4px_20px_rgba(45,212,191,0.4)] transition-all active:scale-95">
                <Zap size={16} className="fill-slate-900" /> Beli Voucher
              </button>
            </div>
          </div>

          {/* Active Voucher */}
          <div>
            <h2 className="text-sm font-medium text-white/60 mb-3 px-1 uppercase tracking-wider">Voucher Aktif</h2>
            <div className="ag-glass rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                    <Activity size={18} className="text-teal-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Paket Harian Basic</h3>
                    <p className="text-xs text-teal-100/60 mt-0.5 flex items-center gap-1">
                      <Clock size={12} /> Sisa 14 jam 20 menit
                    </p>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Aktif
                </div>
              </div>
              
              <div className="bg-black/30 rounded-xl p-3 flex justify-between items-center border border-white/5">
                <p className="font-['Space_Mono'] text-teal-200 tracking-[0.1em] text-lg">MV7M-LQ66-G</p>
                <button className="text-xs text-white/50 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg">Salin</button>
              </div>
            </div>
          </div>

          {/* Promos (Horizontal Scroll) */}
          <div className="px-0 -mx-6">
            <h2 className="text-sm font-medium text-white/60 mb-3 px-7 uppercase tracking-wider">Spesial Untukmu</h2>
            <div className="flex overflow-x-auto ag-hide-scroll gap-4 px-6 snap-x snap-mandatory">
              
              {/* Promo 1 */}
              <div className="min-w-[280px] snap-center ag-glass rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <span className="inline-block px-2 py-1 rounded bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[10px] font-bold mb-3">DISKON 20%</span>
                  <h3 className="font-bold text-lg leading-tight mb-1">Paket Bulanan</h3>
                  <p className="text-xs text-white/60">Lebih hemat, internet lancar sebulan penuh.</p>
                </div>
                <button className="mt-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center relative z-10 group-hover:bg-purple-500/50 transition-colors">
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Promo 2 */}
              <div className="min-w-[280px] snap-center ag-glass rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <span className="inline-block px-2 py-1 rounded bg-blue-500/30 border border-blue-500/40 text-blue-200 text-[10px] font-bold mb-3">MEMBER BARU</span>
                  <h3 className="font-bold text-lg leading-tight mb-1">Gratis 1 Hari</h3>
                  <p className="text-xs text-white/60">Coba ngebutnya AdilaNet tanpa biaya.</p>
                </div>
                <button className="mt-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center relative z-10 group-hover:bg-blue-500/50 transition-colors">
                  <ArrowRight size={14} />
                </button>
              </div>

            </div>
          </div>

          {/* Popular Packages */}
          <div className="pb-6">
            <div className="flex justify-between items-end mb-4 px-1">
              <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">Paket Populer</h2>
              <button className="text-xs text-teal-400 font-medium hover:text-teal-300">Lihat Semua</button>
            </div>
            
            <div className="flex overflow-x-auto ag-hide-scroll gap-4 -mx-6 px-6 snap-x snap-mandatory">
              
              {/* Package 1 */}
              <div className="min-w-[150px] snap-start ag-glass rounded-2xl p-4 flex flex-col">
                <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center mb-3">
                  <Zap size={14} className="text-teal-400" />
                </div>
                <h3 className="font-medium text-sm text-white/90">Harian Basic</h3>
                <div className="mt-1 mb-3">
                  <span className="text-lg font-bold">Rp 5k</span>
                </div>
                <div className="space-y-1.5 mt-auto">
                  <p className="text-[11px] text-white/50 flex items-center gap-1.5"><Clock size={10}/> 1 Hari</p>
                  <p className="text-[11px] text-white/50 flex items-center gap-1.5"><Wifi size={10}/> 10 Mbps</p>
                </div>
              </div>

              {/* Package 2 */}
              <div className="min-w-[150px] snap-start ag-glass-hero rounded-2xl p-4 flex flex-col relative border-teal-500/40">
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-teal-500 text-slate-900 text-[9px] font-bold rounded-bl-lg rounded-tr-xl">TERLARIS</div>
                <div className="w-8 h-8 rounded-full bg-teal-400 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(45,212,191,0.5)]">
                  <Sparkles size={14} className="text-slate-900" />
                </div>
                <h3 className="font-medium text-sm text-white">Mingguan Plus</h3>
                <div className="mt-1 mb-3">
                  <span className="text-lg font-bold text-teal-300">Rp 25k</span>
                </div>
                <div className="space-y-1.5 mt-auto">
                  <p className="text-[11px] text-teal-100/70 flex items-center gap-1.5"><Clock size={10}/> 7 Hari</p>
                  <p className="text-[11px] text-teal-100/70 flex items-center gap-1.5"><Wifi size={10}/> 20 Mbps</p>
                </div>
              </div>

              {/* Package 3 */}
              <div className="min-w-[150px] snap-start ag-glass rounded-2xl p-4 flex flex-col">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                  <Package size={14} className="text-purple-400" />
                </div>
                <h3 className="font-medium text-sm text-white/90">Bulanan Pro</h3>
                <div className="mt-1 mb-3">
                  <span className="text-lg font-bold">Rp 100k</span>
                </div>
                <div className="space-y-1.5 mt-auto">
                  <p className="text-[11px] text-white/50 flex items-center gap-1.5"><Clock size={10}/> 30 Hari</p>
                  <p className="text-[11px] text-white/50 flex items-center gap-1.5"><Wifi size={10}/> 50 Mbps</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 h-20 ag-nav rounded-t-3xl flex items-center justify-between px-8 z-20">
        <button className="flex flex-col items-center gap-1.5 text-teal-400 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-teal-400 rounded-full shadow-[0_0_10px_rgba(45,212,191,0.8)]"></div>
          <Home size={22} className="drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
          <span className="text-[10px] font-medium">Beranda</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors">
          <Package size={22} />
          <span className="text-[10px] font-medium">Paket</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors">
          <History size={22} />
          <span className="text-[10px] font-medium">Riwayat</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors">
          <User size={22} />
          <span className="text-[10px] font-medium">Profil</span>
        </button>
      </div>

    </div>
  );
}
