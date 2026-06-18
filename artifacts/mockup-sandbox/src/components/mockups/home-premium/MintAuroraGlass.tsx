import React from "react";
import { 
  Bell, Wifi, Plus, Zap, Activity, Clock, 
  Home, Search, History, User, CreditCard, 
  ShieldCheck, HelpCircle, ChevronRight, LayoutGrid 
} from "lucide-react";
import "./ScopedMintAuroraGlass.css";

export function MintAuroraGlass() {
  return (
    <div className="w-[430px] h-[932px] mx-auto relative overflow-hidden mint-container text-slate-800">
      {/* Aurora Background */}
      <div className="mint-bg">
        <div className="mint-blob-1"></div>
        <div className="mint-blob-2"></div>
        <div className="mint-blob-3"></div>
      </div>

      <div className="h-full overflow-y-auto overflow-x-hidden mint-hide-scroll relative z-10 pb-32">
        
        {/* Header */}
        <div className="px-6 pt-16 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/80 mint-glass shadow-sm">
              <img 
                src="https://api.dicebear.com/7.x/notionists/svg?seed=Nadia&backgroundColor=d8b4fe" 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-[13px] text-slate-600 font-medium mb-0.5">Selamat Datang,</p>
              <h1 className="text-[20px] font-bold tracking-tight text-slate-900 leading-none">Nadia Putri</h1>
            </div>
          </div>
          <button className="w-11 h-11 rounded-full mint-glass-pill flex items-center justify-center relative hover:bg-white/60 transition-all shadow-sm">
            <Bell size={20} className="text-slate-700" strokeWidth={2} />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white"></span>
          </button>
        </div>

        <div className="px-6 mt-6 space-y-6">
          
          {/* Balance Card */}
          <div className="mint-glass-heavy rounded-[28px] p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[13px] text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                  Total Saldo
                </p>
                <div className="text-[36px] font-bold tracking-tight text-slate-900 flex items-baseline">
                  <span className="text-[20px] mr-1 font-semibold text-slate-500">Rp</span>
                  125.000
                </div>
              </div>
              <div className="w-10 h-10 rounded-full mint-glass flex items-center justify-center shadow-sm">
                <CreditCard size={20} className="text-emerald-600" strokeWidth={2} />
              </div>
            </div>
            
            <div className="flex gap-3 pt-5 border-t border-slate-200/40 relative">
              <button className="flex-1 py-3.5 rounded-2xl bg-white border border-white/60 shadow-[0_4px_12px_rgba(0,0,0,0.04)] font-semibold text-[14px] text-slate-700 flex justify-center items-center gap-2 hover:bg-slate-50 transition-all">
                <Plus size={18} className="text-emerald-500" strokeWidth={2.5} /> Top Up
              </button>
              <button className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white shadow-[0_8px_20px_rgba(15,23,42,0.15)] font-semibold text-[14px] flex justify-center items-center gap-2 hover:bg-slate-800 transition-all">
                <Wifi size={18} className="text-mint-300" strokeWidth={2.5} /> Beli Voucher
              </button>
            </div>
          </div>

          {/* Active Session */}
          <div>
            <h2 className="text-[15px] font-bold text-slate-800 mb-3 px-1">Status Jaringan</h2>
            <div className="mint-glass rounded-[24px] p-5 flex flex-col gap-4 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-[14px] bg-emerald-100/80 border border-emerald-200/50 flex items-center justify-center shadow-sm">
                    <Activity size={20} className="text-emerald-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[16px] text-slate-900">Paket 30 Hari</h3>
                    <p className="text-[12px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                      <Clock size={12} /> Sisa 12 hari 4 jam
                    </p>
                  </div>
                </div>
                <div className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Aktif
                </div>
              </div>
              
              <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden shadow-inner">
                <div className="h-full w-[60%] bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-4 gap-3 px-1">
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-[56px] h-[56px] rounded-[18px] mint-glass flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <LayoutGrid size={22} className="text-purple-600" strokeWidth={2} />
              </div>
              <span className="text-[11px] font-semibold text-slate-600">Semua</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-[56px] h-[56px] rounded-[18px] mint-glass flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <History size={22} className="text-blue-600" strokeWidth={2} />
              </div>
              <span className="text-[11px] font-semibold text-slate-600">Riwayat</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-[56px] h-[56px] rounded-[18px] mint-glass flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <ShieldCheck size={22} className="text-emerald-600" strokeWidth={2} />
              </div>
              <span className="text-[11px] font-semibold text-slate-600">Keamanan</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-[56px] h-[56px] rounded-[18px] mint-glass flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <HelpCircle size={22} className="text-rose-500" strokeWidth={2} />
              </div>
              <span className="text-[11px] font-semibold text-slate-600">Bantuan</span>
            </div>
          </div>

          {/* Recommended Packages */}
          <div className="pt-2">
            <div className="flex justify-between items-end mb-3 px-1">
              <h2 className="text-[15px] font-bold text-slate-800">Pilihan Cerdas</h2>
              <button className="text-[12px] text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-0.5">
                Lihat Semua <ChevronRight size={14} />
              </button>
            </div>
            
            <div className="flex overflow-x-auto mint-hide-scroll gap-4 -mx-6 px-6 pb-4 snap-x snap-mandatory">
              
              {/* Package 1 */}
              <div className="min-w-[150px] snap-start mint-glass rounded-[24px] p-4 flex flex-col relative transition-transform hover:-translate-y-1">
                <div className="w-9 h-9 rounded-full bg-white/70 border border-white flex items-center justify-center mb-3 shadow-sm">
                  <Zap size={16} className="text-amber-500" strokeWidth={2} />
                </div>
                <h3 className="font-bold text-[15px] text-slate-800 mb-1">Harian Basic</h3>
                <div className="text-[18px] font-extrabold text-slate-900 mb-3 tracking-tight">
                  Rp 5.000
                </div>
                <div className="space-y-1.5 mt-auto">
                  <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" /> 24 Jam
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                    <Wifi size={12} className="text-slate-400" /> 10 Mbps
                  </p>
                </div>
              </div>

              {/* Package 2 */}
              <div className="min-w-[150px] snap-start bg-slate-900 rounded-[24px] p-4 flex flex-col relative text-white transition-transform hover:-translate-y-1 shadow-[0_12px_24px_rgba(15,23,42,0.15)] border border-slate-700">
                <div className="absolute top-0 right-0 px-2.5 py-1 bg-emerald-400 text-emerald-950 text-[9px] font-bold rounded-bl-[14px] rounded-tr-[24px] uppercase tracking-wider">
                  Populer
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center mb-3">
                  <Activity size={16} className="text-emerald-400" strokeWidth={2} />
                </div>
                <h3 className="font-bold text-[15px] text-white mb-1">Mingguan Pro</h3>
                <div className="text-[18px] font-extrabold text-emerald-400 mb-3 tracking-tight">
                  Rp 25.000
                </div>
                <div className="space-y-1.5 mt-auto">
                  <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" /> 7 Hari
                  </p>
                  <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                    <Wifi size={12} className="text-slate-400" /> 20 Mbps
                  </p>
                </div>
              </div>

              {/* Package 3 */}
              <div className="min-w-[150px] snap-start mint-glass rounded-[24px] p-4 flex flex-col relative transition-transform hover:-translate-y-1">
                <div className="w-9 h-9 rounded-full bg-white/70 border border-white flex items-center justify-center mb-3 shadow-sm">
                  <Zap size={16} className="text-purple-500" strokeWidth={2} />
                </div>
                <h3 className="font-bold text-[15px] text-slate-800 mb-1">Bulanan Max</h3>
                <div className="text-[18px] font-extrabold text-slate-900 mb-3 tracking-tight">
                  Rp 100.000
                </div>
                <div className="space-y-1.5 mt-auto">
                  <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" /> 30 Hari
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                    <Wifi size={12} className="text-slate-400" /> Unlimited
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Recent Transactions */}
          <div className="pb-4">
            <h2 className="text-[15px] font-bold text-slate-800 mb-3 px-1">Terakhir</h2>
            <div className="mint-glass rounded-[24px] p-2.5 flex flex-col gap-1">
              
              <div className="flex items-center gap-3 p-2.5 rounded-[16px] hover:bg-white/40 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-[12px] bg-white/70 flex items-center justify-center border border-white shadow-sm">
                  <Wifi size={18} className="text-slate-700" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[13px] font-bold text-slate-800">Paket Mingguan</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Hari ini, 08:30</p>
                </div>
                <div className="text-[13px] font-bold text-slate-900">
                  -Rp 25.000
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-[16px] hover:bg-white/40 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-[12px] bg-emerald-100/70 flex items-center justify-center border border-emerald-100 shadow-sm">
                  <Plus size={18} className="text-emerald-600" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[13px] font-bold text-slate-800">Top Up Saldo</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Kemarin, 14:15</p>
                </div>
                <div className="text-[13px] font-bold text-emerald-600">
                  +Rp 100.000
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Floating Bottom Nav */}
      <div className="absolute bottom-6 left-6 right-6 z-20">
        <div className="mint-glass-heavy h-16 rounded-[24px] flex items-center justify-around px-2 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <button className="flex flex-col items-center justify-center w-16 h-full text-emerald-600 relative">
            <div className="absolute top-0 w-8 h-1 bg-emerald-500 rounded-full"></div>
            <Home size={22} strokeWidth={2.5} className="mb-0.5 mt-1" />
            <span className="text-[10px] font-bold">Beranda</span>
          </button>
          <button className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-slate-700 transition-colors">
            <Wifi size={22} strokeWidth={2} className="mb-0.5" />
            <span className="text-[10px] font-semibold">Paket</span>
          </button>
          <button className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-slate-700 transition-colors">
            <History size={22} strokeWidth={2} className="mb-0.5" />
            <span className="text-[10px] font-semibold">Riwayat</span>
          </button>
          <button className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-slate-700 transition-colors">
            <User size={22} strokeWidth={2} className="mb-0.5" />
            <span className="text-[10px] font-semibold">Profil</span>
          </button>
        </div>
      </div>

    </div>
  );
}
