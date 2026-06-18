import React from 'react';
import { 
  Bell, 
  Plus, 
  Zap, 
  Wifi, 
  Copy, 
  Tag, 
  Home, 
  Package, 
  Clock, 
  User,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export function VibrantNeo() {
  return (
    <div className="w-[430px] min-h-[100dvh] bg-[#F4F6F9] font-['Plus_Jakarta_Sans',sans-serif] relative pb-28 overflow-x-hidden selection:bg-indigo-500/30 text-slate-900 mx-auto border-x border-slate-200 shadow-2xl">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 p-[2px]">
              <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-white">
                <img 
                  src="https://api.dicebear.com/7.x/notionists/svg?seed=Budi&backgroundColor=e2e8f0" 
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-0.5">Selamat datang kembali,</p>
            <h1 className="text-xl font-bold text-slate-900">Halo, Budi 👋</h1>
          </div>
        </div>
        <button className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200/60 flex items-center justify-center text-slate-600 relative hover:bg-slate-50 transition-colors">
          <div className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></div>
          <Bell className="w-5 h-5" />
        </button>
      </header>

      <main className="px-6 space-y-8 mt-2">
        {/* Balance Card */}
        <section>
          <div className="rounded-[32px] bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-500 p-7 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
            {/* Abstract Background Elements */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-[60px] group-hover:bg-white/30 transition-all duration-700" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-fuchsia-500/40 rounded-full blur-[40px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-50 mix-blend-overlay pointer-events-none" />

            <div className="relative z-10">
              <div className="flex justify-between items-center mb-2">
                <p className="text-white/80 text-sm font-medium">Saldo AdilaNet</p>
                <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
                  <span className="text-xs font-semibold">Premium</span>
                </div>
              </div>
              <h2 className="text-[40px] leading-none font-extrabold tracking-tight mb-8 drop-shadow-sm">
                Rp 60.000
              </h2>
              
              <div className="flex gap-3">
                <button className="flex-1 bg-white/15 hover:bg-white/25 backdrop-blur-lg transition-colors py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 text-white border border-white/20 shadow-inner">
                  <Plus className="w-5 h-5" /> Top Up
                </button>
                <button className="flex-1 bg-white text-indigo-600 hover:bg-slate-50 transition-colors py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-black/10">
                  <Zap className="w-5 h-5" fill="currentColor" /> Beli Voucher
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Active Voucher */}
        <section>
          <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100">
            <div className="flex justify-between items-start mb-5">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-[16px] bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                  <Wifi className="w-6 h-6" />
                </div>
                <div className="pt-0.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Voucher Aktif</p>
                  <p className="font-bold text-slate-900 text-lg leading-tight">Paket Harian Basic</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-100/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Aktif</span>
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-100/80 rounded-[20px] p-4 flex justify-between items-center group relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-[20px]"></div>
              <div className="pl-2">
                <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wider">Kode Akses</p>
                <code className="text-xl font-bold text-indigo-600 tracking-[0.2em] font-mono">MV7M-LQ66-G</code>
              </div>
              <button className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Promo Banners */}
        <section className="-mx-6">
          <div className="flex gap-4 px-6 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-4">
            {/* Promo 1 */}
            <div className="snap-center shrink-0 w-[300px] rounded-[24px] bg-gradient-to-br from-amber-400 to-orange-500 p-6 text-white relative overflow-hidden shadow-lg shadow-orange-500/20">
              <div className="absolute -right-6 -bottom-6 opacity-20">
                <Tag className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wider mb-3">Promo Spesial</span>
                <h3 className="font-bold text-xl leading-tight mb-1 w-[80%]">Diskon 20% Paket Bulanan</h3>
                <p className="text-white/80 text-sm font-medium">Klaim sekarang juga!</p>
              </div>
            </div>
            {/* Promo 2 */}
            <div className="snap-center shrink-0 w-[300px] rounded-[24px] bg-gradient-to-br from-emerald-400 to-teal-500 p-6 text-white relative overflow-hidden shadow-lg shadow-teal-500/20">
              <div className="absolute -right-4 -bottom-4 opacity-20">
                <Zap className="w-28 h-28" />
              </div>
              <div className="relative z-10">
                <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wider mb-3">Member Baru</span>
                <h3 className="font-bold text-xl leading-tight mb-1 w-[90%]">Gratis 1 Hari Akses WiFi</h3>
                <p className="text-white/80 text-sm font-medium">Tanpa syarat apapun.</p>
              </div>
            </div>
            {/* Spacer */}
            <div className="shrink-0 w-2" />
          </div>
        </section>

        {/* Popular Packages */}
        <section>
          <div className="flex justify-between items-end mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Paket Populer</h3>
              <p className="text-sm text-slate-500 mt-0.5 font-medium">Pilihan terbaik untukmu</p>
            </div>
            <button className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:text-indigo-700 transition-colors">
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-4 -mx-6 px-6 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-4">
            {/* Package 1 */}
            <div className="snap-center shrink-0 w-[160px] bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col relative overflow-hidden">
              <div className="mb-4">
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-wider">Harian</span>
                <h4 className="font-bold text-slate-900 mt-3 text-lg leading-none">Basic</h4>
              </div>
              <div className="mb-5">
                <span className="text-xs text-slate-500 font-medium">Rp</span>
                <span className="text-2xl font-extrabold text-slate-900 ml-1">5.000</span>
              </div>
              <div className="space-y-2 mt-auto">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> 1 Hari
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Zap className="w-3.5 h-3.5 text-slate-400" /> 10 Mbps
                </div>
              </div>
            </div>

            {/* Package 2 */}
            <div className="snap-center shrink-0 w-[160px] bg-slate-900 rounded-[24px] p-5 shadow-lg shadow-slate-900/10 flex flex-col relative overflow-hidden text-white group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/30 blur-2xl rounded-full group-hover:bg-indigo-500/50 transition-colors"></div>
              <div className="relative z-10">
                <div className="mb-4">
                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">Mingguan</span>
                  <h4 className="font-bold text-white mt-3 text-lg leading-none">Plus</h4>
                </div>
                <div className="mb-5">
                  <span className="text-xs text-slate-400 font-medium">Rp</span>
                  <span className="text-2xl font-extrabold text-white ml-1">25.000</span>
                </div>
                <div className="space-y-2 mt-auto">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" /> 7 Hari
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" /> 20 Mbps
                  </div>
                </div>
              </div>
            </div>

            {/* Package 3 */}
            <div className="snap-center shrink-0 w-[160px] bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col relative overflow-hidden">
              <div className="mb-4">
                <span className="text-[10px] font-bold text-fuchsia-600 bg-fuchsia-50 px-2.5 py-1 rounded-md uppercase tracking-wider">Bulanan</span>
                <h4 className="font-bold text-slate-900 mt-3 text-lg leading-none">Pro</h4>
              </div>
              <div className="mb-5">
                <span className="text-xs text-slate-500 font-medium">Rp</span>
                <span className="text-2xl font-extrabold text-slate-900 ml-1">100<span className="text-lg">k</span></span>
              </div>
              <div className="space-y-2 mt-auto">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> 30 Hari
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Zap className="w-3.5 h-3.5 text-slate-400" /> 50 Mbps
                </div>
              </div>
            </div>
            
            {/* Spacer */}
            <div className="shrink-0 w-2" />
          </div>
        </section>
      </main>

      {/* Fixed Bottom Nav */}
      <nav className="absolute bottom-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 px-6 pb-6 pt-3 flex justify-between items-center rounded-t-[32px] shadow-[0_-10px_40px_rgb(0,0,0,0.03)]">
        <button className="flex flex-col items-center gap-1.5 min-w-[64px] text-indigo-600">
          <div className="relative">
            <div className="absolute -inset-2 bg-indigo-50 rounded-full scale-100 transition-transform"></div>
            <Home className="w-6 h-6 relative z-10" fill="currentColor" strokeWidth={1.5} />
          </div>
          <span className="text-[11px] font-bold">Beranda</span>
        </button>
        
        <button className="flex flex-col items-center gap-1.5 min-w-[64px] text-slate-400 hover:text-slate-600 transition-colors">
          <Package className="w-6 h-6" strokeWidth={2} />
          <span className="text-[11px] font-semibold">Paket</span>
        </button>
        
        <button className="flex flex-col items-center gap-1.5 min-w-[64px] text-slate-400 hover:text-slate-600 transition-colors">
          <Clock className="w-6 h-6" strokeWidth={2} />
          <span className="text-[11px] font-semibold">Riwayat</span>
        </button>
        
        <button className="flex flex-col items-center gap-1.5 min-w-[64px] text-slate-400 hover:text-slate-600 transition-colors">
          <User className="w-6 h-6" strokeWidth={2} />
          <span className="text-[11px] font-semibold">Profil</span>
        </button>
      </nav>
    </div>
  );
}
