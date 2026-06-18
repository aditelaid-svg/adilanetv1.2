import React from "react";
import { Bell, Wifi, Zap, Clock, ArrowRight, Home, Package, History, User, Plus, CreditCard, Sparkles, Activity, ShieldCheck, LifeBuoy } from "lucide-react";
import "./ScopedSunset.css";

export function SunsetGlass() {
  return (
    <div className="w-[430px] h-[932px] mx-auto relative overflow-hidden sg-container">
      {/* Background Aurora */}
      <div className="sg-sunset-bg">
        <div className="sg-glow-1"></div>
        <div className="sg-glow-2"></div>
      </div>

      <div className="h-full overflow-y-auto overflow-x-hidden sg-hide-scroll relative z-10 pb-28">
        
        {/* Header */}
        <div className="px-6 pt-14 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white sg-glass shadow-sm">
              <img 
                src="https://api.dicebear.com/7.x/notionists/svg?seed=Ayu&backgroundColor=ffd1c1" 
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs text-slate-600 font-semibold tracking-wide uppercase">Selamat Pagi</p>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">Ayu Lestari</h1>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full sg-glass flex items-center justify-center relative hover:bg-white/60 transition-colors">
            <Bell size={20} className="text-slate-700" />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white"></span>
          </button>
        </div>

        <div className="px-6 space-y-6">
          
          {/* Balance Card */}
          <div className="sg-glass-hero rounded-3xl p-6 mt-2 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <p className="text-sm text-slate-600 font-semibold mb-1 flex items-center gap-1.5">
                  <CreditCard size={16} className="text-rose-500" /> Saldo AdilaNet
                </p>
                <div className="text-4xl font-extrabold tracking-tight text-slate-800 flex items-baseline">
                  <span className="text-xl mr-1 font-semibold text-slate-500">Rp</span>
                  125.000
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-100/80 flex items-center justify-center shadow-sm border border-rose-200">
                <ShieldCheck size={20} className="text-rose-500" />
              </div>
            </div>
            
            <div className="flex gap-3 mt-4 relative z-10">
              <button className="flex-1 py-3.5 rounded-2xl bg-white/80 border border-white hover:bg-white font-semibold text-sm text-slate-700 flex justify-center items-center gap-2 shadow-sm transition-all active:scale-95">
                <Plus size={16} className="text-rose-500" /> Top Up
              </button>
              <button className="flex-1 py-3.5 rounded-2xl bg-rose-500 text-white font-semibold text-sm flex justify-center items-center gap-2 shadow-md hover:bg-rose-600 transition-all active:scale-95 border border-rose-400">
                <Wifi size={16} className="text-rose-100" /> Beli Voucher
              </button>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-4 gap-4 px-2 pt-2">
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-[56px] h-[56px] rounded-[18px] sg-glass flex items-center justify-center group-hover:scale-105 transition-transform bg-white/50">
                <CreditCard size={22} className="text-rose-500" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Transfer</span>
            </div>
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-[56px] h-[56px] rounded-[18px] sg-glass flex items-center justify-center group-hover:scale-105 transition-transform bg-white/50">
                <History size={22} className="text-indigo-500" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Riwayat</span>
            </div>
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-[56px] h-[56px] rounded-[18px] sg-glass flex items-center justify-center group-hover:scale-105 transition-transform bg-white/50">
                <Wifi size={22} className="text-emerald-500" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Jaringan</span>
            </div>
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-[56px] h-[56px] rounded-[18px] sg-glass flex items-center justify-center group-hover:scale-105 transition-transform bg-white/50">
                <LifeBuoy size={22} className="text-sky-500" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Bantuan</span>
            </div>
          </div>

          {/* Active Voucher */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-[15px] font-bold text-slate-800">Status Jaringan</h2>
            </div>
            <div className="sg-glass rounded-[24px] p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shadow-sm">
                    <Activity size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-[15px]">Paket Bulanan Pro</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                      <Clock size={12} /> Sisa 12 hari 4 jam
                    </p>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  Aktif
                </div>
              </div>
              
              <div className="w-full h-2 bg-slate-200/50 rounded-full overflow-hidden shadow-inner mt-1">
                <div className="h-full w-[60%] bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Popular Packages */}
          <div className="pt-2">
            <div className="flex justify-between items-end mb-4 px-1">
              <h2 className="text-[15px] font-bold text-slate-800">Paket Populer</h2>
              <button className="text-xs text-rose-500 font-semibold hover:text-rose-600">Lihat Semua</button>
            </div>
            
            <div className="flex overflow-x-auto sg-hide-scroll gap-4 -mx-6 px-6 snap-x snap-mandatory pb-4">
              
              {/* Package 1 */}
              <div className="min-w-[150px] snap-start sg-glass rounded-[24px] p-4 flex flex-col">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
                  <Zap size={16} className="text-blue-500" />
                </div>
                <h3 className="font-bold text-[15px] text-slate-800">Harian Basic</h3>
                <div className="mt-1 mb-3">
                  <span className="text-lg font-extrabold text-slate-800">Rp 5.000</span>
                </div>
                <div className="space-y-1.5 mt-auto">
                  <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5"><Clock size={12} className="text-slate-400"/> 24 Jam</p>
                  <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5"><Wifi size={12} className="text-slate-400"/> Up to 10 Mbps</p>
                </div>
              </div>

              {/* Package 2 */}
              <div className="min-w-[160px] snap-start bg-slate-800 rounded-[24px] p-4 flex flex-col relative border border-slate-700 shadow-lg">
                <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-rose-400 to-rose-500 text-white text-[10px] font-bold rounded-bl-[16px] rounded-tr-[24px] uppercase tracking-wider">
                  TERLARIS
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center mb-3">
                  <Sparkles size={16} className="text-rose-400" />
                </div>
                <h3 className="font-bold text-[15px] text-white">Mingguan Pro</h3>
                <div className="mt-1 mb-3">
                  <span className="text-lg font-extrabold text-rose-300">Rp 25.000</span>
                </div>
                <div className="space-y-1.5 mt-auto">
                  <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5"><Clock size={12} className="text-slate-400"/> 7 Hari</p>
                  <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5"><Wifi size={12} className="text-slate-400"/> Up to 20 Mbps</p>
                </div>
              </div>

              {/* Package 3 */}
              <div className="min-w-[150px] snap-start sg-glass rounded-[24px] p-4 flex flex-col">
                <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center mb-3">
                  <Package size={16} className="text-purple-500" />
                </div>
                <h3 className="font-bold text-[15px] text-slate-800">Bulanan Max</h3>
                <div className="mt-1 mb-3">
                  <span className="text-lg font-extrabold text-slate-800">Rp 100.000</span>
                </div>
                <div className="space-y-1.5 mt-auto">
                  <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5"><Clock size={12} className="text-slate-400"/> 30 Hari</p>
                  <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5"><Wifi size={12} className="text-slate-400"/> Unlimited</p>
                </div>
              </div>

            </div>
          </div>
          
          {/* Recent Transactions */}
          <div className="pt-2 pb-6">
            <h2 className="text-[15px] font-bold text-slate-800 mb-3 px-1">Transaksi Terakhir</h2>
            <div className="sg-glass rounded-[24px] p-2 flex flex-col gap-1">
              
              {/* Item 1 */}
              <div className="flex items-center gap-4 p-3 rounded-[16px] hover:bg-white/60 transition-colors cursor-pointer">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <Wifi size={18} className="text-slate-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-[14px] font-bold text-slate-800">Paket Mingguan Pro</h4>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">14 Okt 2023, 08:30</p>
                </div>
                <div className="text-[14px] font-bold text-slate-800">
                  -Rp 25.000
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-center gap-4 p-3 rounded-[16px] hover:bg-white/60 transition-colors cursor-pointer">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm">
                  <Plus size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-[14px] font-bold text-slate-800">Top Up Saldo</h4>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">10 Okt 2023, 14:15</p>
                </div>
                <div className="text-[14px] font-bold text-emerald-600">
                  +Rp 100.000
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 h-[88px] sg-nav rounded-t-[32px] flex items-center justify-between px-8 z-20 pb-4">
        <button className="flex flex-col items-center gap-1.5 text-rose-500 relative mt-2">
          <div className="absolute -top-4 w-10 h-1 bg-rose-500 rounded-full"></div>
          <Home size={22} className="drop-shadow-sm" />
          <span className="text-[10px] font-bold">Beranda</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors mt-2">
          <Package size={22} />
          <span className="text-[10px] font-semibold">Paket</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors mt-2">
          <History size={22} />
          <span className="text-[10px] font-semibold">Riwayat</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors mt-2">
          <User size={22} />
          <span className="text-[10px] font-semibold">Profil</span>
        </button>
      </div>

    </div>
  );
}
