import React from "react";
import { 
  Bell, 
  Wifi, 
  Plus, 
  ArrowRight, 
  Home, 
  LayoutGrid, 
  Clock, 
  User, 
  Zap, 
  Activity, 
  ChevronRight, 
  ShieldCheck,
  CreditCard,
  History,
  LifeBuoy
} from "lucide-react";
import "./ScopedLiquidMesh.css";

export function LiquidMesh() {
  return (
    <div className="w-[430px] h-[932px] mx-auto relative overflow-hidden lm-container text-slate-800">
      {/* Mesh Background */}
      <div className="lm-mesh-bg">
        <div className="lm-blob-1"></div>
        <div className="lm-blob-2"></div>
        <div className="lm-blob-3"></div>
      </div>

      {/* Main Content Area */}
      <div className="h-full overflow-y-auto overflow-x-hidden lm-hide-scroll relative z-10 pb-32">
        
        {/* Header */}
        <div className="px-6 pt-16 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white lm-glass-pill shadow-sm">
              <img 
                src="https://api.dicebear.com/7.x/notionists/svg?seed=Budi&backgroundColor=f1f5f9" 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-[13px] text-slate-500 font-semibold tracking-wide uppercase mb-0.5">Selamat Pagi</p>
              <h1 className="text-[22px] font-bold tracking-tight lm-text-gradient leading-none">Budi Santoso</h1>
            </div>
          </div>
          <button className="w-12 h-12 rounded-full lm-glass-pill flex items-center justify-center relative hover:bg-white/80 transition-all shadow-sm">
            <Bell size={22} className="text-slate-700" strokeWidth={1.5} />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-rose-400 border-2 border-white"></span>
          </button>
        </div>

        <div className="px-6 mt-4 space-y-6">
          
          {/* Balance Card - VisionOS Style */}
          <div className="lm-glass-strong rounded-[32px] p-7 relative overflow-hidden">
            {/* Inner highlights */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-50"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[14px] text-slate-500 font-semibold flex items-center gap-1.5 mb-2">
                  Saldo Tersedia
                </p>
                <div className="text-[42px] font-bold tracking-tight lm-text-gradient flex items-baseline">
                  <span className="text-[24px] mr-1.5 font-semibold text-slate-400">Rp</span>
                  125.000
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-50/50 flex items-center justify-center shadow-inner border border-indigo-100/50">
                <ShieldCheck size={24} className="text-indigo-500" strokeWidth={1.5} />
              </div>
            </div>
            
            {/* Quick Actions Row */}
            <div className="flex gap-3 pt-6 border-t border-slate-200/50 relative">
              <button className="flex-1 py-4 rounded-[20px] bg-white border border-white shadow-[0_4px_12px_rgba(0,0,0,0.03)] font-semibold text-[14px] text-slate-700 flex justify-center items-center gap-2 hover:bg-slate-50 transition-all">
                <Plus size={18} className="text-slate-400" /> Top Up
              </button>
              <button className="flex-1 py-4 rounded-[20px] bg-slate-800 text-white shadow-[0_8px_24px_rgba(15,23,42,0.15)] font-semibold text-[14px] flex justify-center items-center gap-2 hover:bg-slate-700 transition-all border border-slate-700">
                <Wifi size={18} className="text-indigo-200" /> Beli Voucher
              </button>
            </div>
          </div>

          {/* Active Session - Floating Card */}
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-[15px] font-bold text-slate-800">Status Jaringan</h2>
            </div>
            <div className="lm-glass rounded-[28px] p-6 flex flex-col gap-5 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-100 rounded-full blur-2xl opacity-60"></div>
              
              <div className="relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100/80 border border-emerald-200/50 flex items-center justify-center shadow-sm">
                    <Activity size={22} className="text-emerald-600" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[17px] text-slate-800">Paket 30 Hari</h3>
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Aktif</span>
                    </div>
                    <p className="text-[13px] text-slate-500 font-medium">Sisa 12 hari 4 jam</p>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
                <div className="absolute top-0 left-0 h-full w-[60%] bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Recommended Packages (Horizontal Scroll) */}
          <div className="pt-2">
            <div className="flex justify-between items-end mb-4 px-2">
              <h2 className="text-[15px] font-bold text-slate-800">Rekomendasi Paket</h2>
              <button className="text-[13px] text-indigo-600 font-semibold hover:text-indigo-500 flex items-center gap-0.5">
                Lihat Semua <ChevronRight size={14} />
              </button>
            </div>
            
            <div className="flex overflow-x-auto lm-hide-scroll gap-4 -mx-6 px-6 pb-6 snap-x snap-mandatory">
              
              {/* Package 1 */}
              <div className="min-w-[160px] snap-start lm-glass-strong rounded-[28px] p-5 flex flex-col relative transition-transform hover:-translate-y-1">
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                  <Zap size={18} className="text-indigo-500" strokeWidth={1.5} />
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
              <div className="min-w-[160px] snap-start bg-slate-800 rounded-[28px] p-5 flex flex-col relative text-white transition-transform hover:-translate-y-1 shadow-[0_12px_32px_rgba(15,23,42,0.2)] border border-slate-700">
                <div className="absolute top-0 right-0 px-3 py-1.5 bg-gradient-to-r from-amber-200 to-amber-400 text-amber-900 text-[10px] font-bold rounded-bl-xl rounded-tr-[28px] uppercase tracking-wider">
                  Populer
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center mb-4">
                  <Activity size={18} className="text-amber-300" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-[16px] text-white mb-1">Mingguan Pro</h3>
                <div className="text-[20px] font-extrabold text-amber-300 mb-4 tracking-tight">
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
              <div className="min-w-[160px] snap-start lm-glass-strong rounded-[28px] p-5 flex flex-col relative transition-transform hover:-translate-y-1">
                <div className="w-10 h-10 rounded-full bg-cyan-50 border border-cyan-100 flex items-center justify-center mb-4">
                  <LayoutGrid size={18} className="text-cyan-600" strokeWidth={1.5} />
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
              <div className="w-[60px] h-[60px] rounded-[20px] lm-glass-pill flex items-center justify-center group-hover:scale-105 transition-transform">
                <CreditCard size={24} className="text-blue-500" strokeWidth={1.5} />
              </div>
              <span className="text-[12px] font-semibold text-slate-600">Transfer</span>
            </div>
            <div className="flex flex-col items-center gap-2.5 group cursor-pointer">
              <div className="w-[60px] h-[60px] rounded-[20px] lm-glass-pill flex items-center justify-center group-hover:scale-105 transition-transform">
                <History size={24} className="text-purple-500" strokeWidth={1.5} />
              </div>
              <span className="text-[12px] font-semibold text-slate-600">Riwayat</span>
            </div>
            <div className="flex flex-col items-center gap-2.5 group cursor-pointer">
              <div className="w-[60px] h-[60px] rounded-[20px] lm-glass-pill flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wifi size={24} className="text-emerald-500" strokeWidth={1.5} />
              </div>
              <span className="text-[12px] font-semibold text-slate-600">Jaringan</span>
            </div>
            <div className="flex flex-col items-center gap-2.5 group cursor-pointer">
              <div className="w-[60px] h-[60px] rounded-[20px] lm-glass-pill flex items-center justify-center group-hover:scale-105 transition-transform">
                <LifeBuoy size={24} className="text-rose-500" strokeWidth={1.5} />
              </div>
              <span className="text-[12px] font-semibold text-slate-600">Bantuan</span>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="pb-8">
            <h2 className="text-[15px] font-bold text-slate-800 mb-4 px-2">Transaksi Terakhir</h2>
            <div className="lm-glass rounded-[28px] p-3 flex flex-col gap-1">
              
              {/* Item 1 */}
              <div className="flex items-center gap-4 p-3 rounded-[20px] hover:bg-white/40 transition-colors cursor-pointer">
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

              {/* Item 2 */}
              <div className="flex items-center gap-4 p-3 rounded-[20px] hover:bg-white/40 transition-colors cursor-pointer">
                <div className="w-12 h-12 rounded-[16px] bg-emerald-50 flex items-center justify-center border border-emerald-100/50">
                  <Plus size={20} className="text-emerald-600" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[14px] font-bold text-slate-800">Top Up Saldo</h4>
                  <p className="text-[12px] text-slate-500 font-medium mt-0.5">10 Okt 2023, 14:15</p>
                </div>
                <div className="text-[14px] font-bold text-emerald-600">
                  +Rp 100.000
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Floating Bottom Nav */}
      <div className="absolute bottom-8 left-6 right-6 z-20">
        <div className="lm-glass-strong h-16 rounded-[24px] flex items-center justify-around px-2 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <button className="flex flex-col items-center justify-center w-16 h-full text-indigo-600 relative">
            <div className="absolute top-1 w-8 h-1 bg-indigo-500 rounded-full"></div>
            <Home size={22} strokeWidth={2} className="mb-0.5 mt-1" />
            <span className="text-[10px] font-bold">Beranda</span>
          </button>
          <button className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-slate-600 transition-colors">
            <LayoutGrid size={22} strokeWidth={1.5} className="mb-0.5" />
            <span className="text-[10px] font-semibold">Paket</span>
          </button>
          <button className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-slate-600 transition-colors">
            <History size={22} strokeWidth={1.5} className="mb-0.5" />
            <span className="text-[10px] font-semibold">Riwayat</span>
          </button>
          <button className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-slate-600 transition-colors">
            <User size={22} strokeWidth={1.5} className="mb-0.5" />
            <span className="text-[10px] font-semibold">Profil</span>
          </button>
        </div>
      </div>

    </div>
  );
}
