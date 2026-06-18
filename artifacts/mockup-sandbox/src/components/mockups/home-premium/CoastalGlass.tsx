import React from "react";
import { Bell, Wifi, Zap, Clock, ArrowRight, Home, Package, History, User, Plus, CreditCard, ShieldCheck, Activity, LifeBuoy } from "lucide-react";
import "./ScopedCoastal.css";

export function CoastalGlass() {
  return (
    <div className="w-[430px] h-[932px] mx-auto relative overflow-hidden text-slate-800 cg-container">
      {/* Background */}
      <div className="cg-bg">
        <div className="cg-glow-1"></div>
        <div className="cg-glow-2"></div>
        <div className="cg-glow-3"></div>
      </div>

      <div className="h-full overflow-y-auto overflow-x-hidden cg-hide-scroll relative z-10 pb-28">
        
        {/* Header */}
        <div className="px-6 pt-16 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm cg-glass-pill">
              <img 
                src="https://api.dicebear.com/7.x/notionists/svg?seed=Budi&backgroundColor=e0f2fe" 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-[13px] text-slate-500 font-semibold tracking-wide uppercase mb-0.5">Selamat Pagi</p>
              <h1 className="text-[22px] font-bold tracking-tight text-slate-800 leading-none">Budi Santoso</h1>
            </div>
          </div>
          <button className="w-12 h-12 rounded-full cg-glass-pill flex items-center justify-center relative shadow-sm active:scale-95 transition-transform">
            <Bell size={22} className="text-slate-700" strokeWidth={1.5} />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white"></span>
          </button>
        </div>

        <div className="px-6 mt-4 space-y-6">
          
          {/* Balance Card */}
          <div className="cg-glass-strong rounded-[32px] p-7 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[14px] text-slate-500 font-semibold flex items-center gap-1.5 mb-2">
                  Saldo Tersedia
                </p>
                <div className="text-[40px] font-bold tracking-tight text-slate-800 flex items-baseline">
                  <span className="text-[22px] mr-1.5 font-semibold text-slate-400">Rp</span>
                  125.000
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center shadow-inner border border-sky-200">
                <CreditCard size={24} className="text-sky-600" strokeWidth={1.5} />
              </div>
            </div>
            
            {/* Quick Actions Row */}
            <div className="flex gap-3 pt-6 border-t border-slate-200/50">
              <button className="flex-1 py-4 rounded-[20px] bg-white border border-slate-100 shadow-sm font-semibold text-[14px] text-slate-700 flex justify-center items-center gap-2 active:scale-95 transition-transform">
                <Plus size={18} className="text-slate-400" /> Top Up
              </button>
              <button className="flex-1 py-4 rounded-[20px] bg-sky-500 text-white shadow-[0_8px_20px_rgba(14,165,233,0.3)] font-semibold text-[14px] flex justify-center items-center gap-2 active:scale-95 transition-transform">
                <Wifi size={18} className="text-white" /> Beli Voucher
              </button>
            </div>
          </div>

          {/* Active Session */}
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-[15px] font-bold text-slate-800">Status Jaringan</h2>
            </div>
            <div className="cg-glass rounded-[28px] p-6 flex flex-col gap-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
                    <Activity size={22} className="text-teal-600" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[17px] text-slate-800">Paket 30 Hari</h3>
                      <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Aktif</span>
                    </div>
                    <p className="text-[13px] text-slate-500 font-medium">Sisa 12 hari 4 jam</p>
                  </div>
                </div>
              </div>
              
              <div className="w-full h-2.5 bg-slate-200/50 rounded-full overflow-hidden shadow-inner">
                <div className="h-full w-[60%] bg-teal-400 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Recommended Packages */}
          <div className="pt-2">
            <div className="flex justify-between items-end mb-4 px-2">
              <h2 className="text-[15px] font-bold text-slate-800">Rekomendasi Paket</h2>
              <button className="text-[13px] text-sky-600 font-semibold flex items-center gap-0.5 active:opacity-70">
                Lihat Semua <ArrowRight size={14} />
              </button>
            </div>
            
            <div className="flex overflow-x-auto cg-hide-scroll gap-4 -mx-6 px-6 pb-6 snap-x snap-mandatory">
              
              {/* Package 1 */}
              <div className="min-w-[160px] snap-start cg-glass-strong rounded-[28px] p-5 flex flex-col relative transition-transform active:scale-95">
                <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center mb-4">
                  <Zap size={18} className="text-sky-500" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-[16px] text-slate-800 mb-1">Harian Basic</h3>
                <div className="text-[20px] font-extrabold text-slate-800 mb-4 tracking-tight">
                  Rp 5.000
                </div>
                <div className="space-y-2 mt-auto">
                  <p className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" /> 24 Jam
                  </p>
                  <p className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
                    <Wifi size={14} className="text-slate-400" /> Up to 10 Mbps
                  </p>
                </div>
              </div>

              {/* Package 2 */}
              <div className="min-w-[160px] snap-start bg-slate-900 rounded-[28px] p-5 flex flex-col relative text-white transition-transform active:scale-95 shadow-xl shadow-slate-900/10">
                <div className="absolute top-0 right-0 px-3 py-1.5 bg-sky-400 text-white text-[10px] font-bold rounded-bl-xl rounded-tr-[28px] uppercase tracking-wider">
                  Populer
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                  <Activity size={18} className="text-sky-400" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-[16px] text-white mb-1">Mingguan Pro</h3>
                <div className="text-[20px] font-extrabold text-sky-400 mb-4 tracking-tight">
                  Rp 25.000
                </div>
                <div className="space-y-2 mt-auto">
                  <p className="text-[12px] text-slate-300 font-medium flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" /> 7 Hari
                  </p>
                  <p className="text-[12px] text-slate-300 font-medium flex items-center gap-2">
                    <Wifi size={14} className="text-slate-400" /> Up to 20 Mbps
                  </p>
                </div>
              </div>

              {/* Package 3 */}
              <div className="min-w-[160px] snap-start cg-glass-strong rounded-[28px] p-5 flex flex-col relative transition-transform active:scale-95">
                <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center mb-4">
                  <Package size={18} className="text-teal-600" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-[16px] text-slate-800 mb-1">Bulanan Max</h3>
                <div className="text-[20px] font-extrabold text-slate-800 mb-4 tracking-tight">
                  Rp 100.000
                </div>
                <div className="space-y-2 mt-auto">
                  <p className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" /> 30 Hari
                  </p>
                  <p className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
                    <Wifi size={14} className="text-slate-400" /> Unlimited
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-4 gap-4 px-2 pb-4">
            <div className="flex flex-col items-center gap-2.5 group cursor-pointer">
              <div className="w-[60px] h-[60px] rounded-[20px] cg-glass-pill flex items-center justify-center active:scale-90 transition-transform">
                <CreditCard size={24} className="text-sky-500" strokeWidth={1.5} />
              </div>
              <span className="text-[12px] font-semibold text-slate-600">Transfer</span>
            </div>
            <div className="flex flex-col items-center gap-2.5 group cursor-pointer">
              <div className="w-[60px] h-[60px] rounded-[20px] cg-glass-pill flex items-center justify-center active:scale-90 transition-transform">
                <History size={24} className="text-teal-500" strokeWidth={1.5} />
              </div>
              <span className="text-[12px] font-semibold text-slate-600">Riwayat</span>
            </div>
            <div className="flex flex-col items-center gap-2.5 group cursor-pointer">
              <div className="w-[60px] h-[60px] rounded-[20px] cg-glass-pill flex items-center justify-center active:scale-90 transition-transform">
                <Wifi size={24} className="text-blue-500" strokeWidth={1.5} />
              </div>
              <span className="text-[12px] font-semibold text-slate-600">Jaringan</span>
            </div>
            <div className="flex flex-col items-center gap-2.5 group cursor-pointer">
              <div className="w-[60px] h-[60px] rounded-[20px] cg-glass-pill flex items-center justify-center active:scale-90 transition-transform">
                <LifeBuoy size={24} className="text-rose-500" strokeWidth={1.5} />
              </div>
              <span className="text-[12px] font-semibold text-slate-600">Bantuan</span>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="pb-8">
            <h2 className="text-[15px] font-bold text-slate-800 mb-4 px-2">Transaksi Terakhir</h2>
            <div className="cg-glass rounded-[28px] p-3 flex flex-col gap-1">
              
              <div className="flex items-center gap-4 p-3 rounded-[20px] active:bg-white/40 transition-colors cursor-pointer">
                <div className="w-12 h-12 rounded-[16px] bg-slate-100 flex items-center justify-center border border-slate-200/50">
                  <Wifi size={20} className="text-slate-600" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[14px] font-bold text-slate-800">Paket Mingguan Pro</h4>
                  <p className="text-[12px] text-slate-500 font-medium mt-0.5">14 Okt 2023, 08:30</p>
                </div>
                <div className="text-[14px] font-bold text-slate-800">
                  -Rp 25.000
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-[20px] active:bg-white/40 transition-colors cursor-pointer">
                <div className="w-12 h-12 rounded-[16px] bg-sky-50 flex items-center justify-center border border-sky-100/50">
                  <Plus size={20} className="text-sky-600" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[14px] font-bold text-slate-800">Top Up Saldo</h4>
                  <p className="text-[12px] text-slate-500 font-medium mt-0.5">10 Okt 2023, 14:15</p>
                </div>
                <div className="text-[14px] font-bold text-sky-600">
                  +Rp 100.000
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 h-20 cg-nav rounded-t-[32px] flex items-center justify-between px-8 z-20">
        <button className="flex flex-col items-center gap-1 text-sky-600">
          <Home size={24} strokeWidth={2} />
          <span className="text-[10px] font-bold">Beranda</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 active:text-slate-600">
          <Package size={24} strokeWidth={1.5} />
          <span className="text-[10px] font-semibold">Paket</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 active:text-slate-600">
          <History size={24} strokeWidth={1.5} />
          <span className="text-[10px] font-semibold">Riwayat</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 active:text-slate-600">
          <User size={24} strokeWidth={1.5} />
          <span className="text-[10px] font-semibold">Profil</span>
        </button>
      </div>

    </div>
  );
}
