import React from "react";
import { 
  Bell, 
  Plus, 
  ChevronRight, 
  Home, 
  Package, 
  Clock, 
  User,
  Zap,
  CheckCircle2,
  TicketPercent
} from "lucide-react";
import "./_group.css";

export function EditorialPremium() {
  return (
    <div className="w-[430px] min-h-[100dvh] relative overflow-x-hidden flex flex-col editorial-premium-container mx-auto shadow-2xl border-x border-[#ebebeb]">
      
      {/* HEADER */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-center bg-[#fdfdfc]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[#ebebeb] bg-[#f5f5f5]">
            <img 
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=Budi&backgroundColor=e9f0ed`} 
              alt="Budi"
              className="w-full h-full object-cover" 
            />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[#737373] uppercase tracking-wide">Selamat Pagi</p>
            <h1 className="text-[18px] font-semibold text-[#1c1c1c]">Halo, Budi <span className="inline-block origin-bottom-right hover:rotate-12 transition-transform">👋</span></h1>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full border border-[#ebebeb] flex items-center justify-center relative hover:bg-[#fafafa] transition-colors">
          <Bell size={18} strokeWidth={1.5} className="text-[#1c1c1c]" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#0f4c3a] border border-white"></span>
        </button>
      </header>

      <main className="flex-1 pb-32 overflow-y-auto ep-hide-scrollbar">
        
        {/* BALANCE CARD */}
        <section className="px-6 mb-8">
          <div className="bg-[#0f4c3a] text-white rounded-[24px] p-6 relative overflow-hidden shadow-[0_12px_24px_-12px_rgba(15,76,58,0.4)]">
            {/* Subtle decorative circles */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full translate-y-1/3 -translate-x-1/4 blur-xl"></div>
            
            <div className="relative z-10">
              <p className="text-[13px] text-white/80 font-medium tracking-wide mb-1 uppercase">Saldo AdilaNet</p>
              <h2 className="editorial-premium-display text-[40px] leading-none mb-6">Rp 60.000</h2>
              
              <div className="flex gap-3">
                <button className="flex-1 bg-white text-[#0f4c3a] py-3.5 px-4 rounded-full font-semibold text-[14px] flex justify-center items-center gap-2 hover:bg-[#f0f0f0] transition-colors">
                  <Zap size={16} strokeWidth={2.5} />
                  Beli Voucher
                </button>
                <button className="flex-1 bg-white/10 text-white py-3.5 px-4 rounded-full font-semibold text-[14px] flex justify-center items-center gap-2 hover:bg-white/20 transition-colors border border-white/10">
                  <Plus size={16} strokeWidth={2.5} />
                  Top Up
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ACTIVE VOUCHER */}
        <section className="px-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="editorial-premium-display text-[20px] font-medium text-[#1c1c1c]">Voucher Aktif</h3>
          </div>
          
          <div className="border border-[#ebebeb] bg-white rounded-[20px] p-5 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-[15px] font-semibold text-[#1c1c1c]">Paket Harian Basic</p>
                <p className="text-[13px] text-[#737373] mt-0.5">Berakhir 14:30 hari ini</p>
              </div>
              <div className="flex items-center gap-1.5 bg-[#e9f0ed] text-[#0f4c3a] px-2.5 py-1 rounded-full text-[12px] font-semibold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f4c3a] animate-pulse"></span>
                Aktif
              </div>
            </div>
            
            <div className="bg-[#fafafa] border border-[#ebebeb] rounded-xl p-3 flex justify-between items-center">
              <div className="font-mono text-[16px] tracking-[0.1em] text-[#1c1c1c] font-medium">
                MV7M-LQ66-G
              </div>
              <button className="text-[#0f4c3a] text-[13px] font-semibold hover:underline">Salin</button>
            </div>
          </div>
        </section>

        {/* PROMO BANNERS */}
        <section className="mb-10">
          <div className="flex items-center justify-between px-6 mb-4">
            <h3 className="editorial-premium-display text-[20px] font-medium text-[#1c1c1c]">Penawaran</h3>
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1c1c1c]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#ebebeb]"></div>
            </div>
          </div>
          
          <div className="flex overflow-x-auto ep-hide-scrollbar pl-6 pr-2 pb-4 gap-4">
            {/* Promo 1 */}
            <div className="min-w-[280px] bg-gradient-to-br from-[#1c1c1c] to-[#3a3a3a] rounded-[20px] p-5 text-white relative overflow-hidden shrink-0">
              <TicketPercent className="absolute -right-4 -bottom-4 text-white/10 w-32 h-32" />
              <div className="relative z-10">
                <span className="inline-block bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md mb-3">Spesial</span>
                <h4 className="text-[18px] font-medium leading-tight mb-2 pr-8">Diskon 20% Paket Bulanan</h4>
                <p className="text-[13px] text-white/70">Klaim sekarang sebelum kehabisan</p>
              </div>
            </div>
            
            {/* Promo 2 */}
            <div className="min-w-[280px] border border-[#ebebeb] bg-[#fafafa] rounded-[20px] p-5 relative overflow-hidden shrink-0">
              <div className="absolute right-0 top-0 w-24 h-24 bg-[#e9f0ed] rounded-bl-[100px] -z-0"></div>
              <div className="relative z-10">
                <span className="inline-block bg-[#0f4c3a] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md mb-3">Member Baru</span>
                <h4 className="text-[18px] font-medium leading-tight mb-2 pr-8 text-[#1c1c1c]">Gratis 1 Hari untuk Member</h4>
                <p className="text-[13px] text-[#737373]">Khusus pengguna baru aplikasi</p>
              </div>
            </div>
          </div>
        </section>

        {/* PAKET POPULER */}
        <section className="mb-6">
          <div className="flex items-baseline justify-between px-6 mb-5">
            <h3 className="editorial-premium-display text-[20px] font-medium text-[#1c1c1c]">Paket Populer</h3>
            <button className="text-[#0f4c3a] text-[13px] font-semibold flex items-center hover:underline">
              Lihat Semua <ChevronRight size={14} className="ml-0.5" />
            </button>
          </div>
          
          <div className="flex overflow-x-auto ep-hide-scrollbar pl-6 pr-6 pb-6 gap-4">
            {/* Card 1 */}
            <div className="min-w-[200px] border border-[#ebebeb] bg-white rounded-[20px] p-5 shrink-0 flex flex-col hover:border-[#0f4c3a] transition-colors cursor-pointer group">
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-[#1c1c1c]">Harian Basic</h4>
                  <div className="bg-[#fafafa] text-[#737373] text-[11px] px-2 py-0.5 rounded-full font-medium border border-[#ebebeb]">1 Hari</div>
                </div>
                <div className="flex items-center text-[#737373] text-[13px]">
                  <Zap size={14} className="mr-1 text-[#0f4c3a]" /> 10 Mbps
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-[#ebebeb] group-hover:border-[#e9f0ed] transition-colors">
                <p className="editorial-premium-display text-[22px] text-[#0f4c3a] mb-1">Rp 5.000</p>
                <p className="text-[12px] text-[#737373]">Sekali bayar</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="min-w-[200px] border-2 border-[#0f4c3a] bg-white rounded-[20px] p-5 shrink-0 flex flex-col relative cursor-pointer shadow-[0_8px_16px_-8px_rgba(15,76,58,0.15)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0f4c3a] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                Terlaris
              </div>
              <div className="mb-4 mt-1">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-[#1c1c1c]">Mingguan Plus</h4>
                  <div className="bg-[#fafafa] text-[#737373] text-[11px] px-2 py-0.5 rounded-full font-medium border border-[#ebebeb]">7 Hari</div>
                </div>
                <div className="flex items-center text-[#737373] text-[13px]">
                  <Zap size={14} className="mr-1 text-[#0f4c3a]" /> 20 Mbps
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-[#ebebeb]">
                <p className="editorial-premium-display text-[22px] text-[#0f4c3a] mb-1">Rp 25.000</p>
                <p className="text-[12px] text-[#737373]">Sekali bayar</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="min-w-[200px] border border-[#ebebeb] bg-white rounded-[20px] p-5 shrink-0 flex flex-col hover:border-[#0f4c3a] transition-colors cursor-pointer group">
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-[#1c1c1c]">Bulanan Pro</h4>
                  <div className="bg-[#fafafa] text-[#737373] text-[11px] px-2 py-0.5 rounded-full font-medium border border-[#ebebeb]">30 Hari</div>
                </div>
                <div className="flex items-center text-[#737373] text-[13px]">
                  <Zap size={14} className="mr-1 text-[#0f4c3a]" /> 50 Mbps
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-[#ebebeb] group-hover:border-[#e9f0ed] transition-colors">
                <p className="editorial-premium-display text-[22px] text-[#0f4c3a] mb-1">Rp 100.000</p>
                <p className="text-[12px] text-[#737373]">Sekali bayar</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* BOTTOM NAV */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#ebebeb] px-6 py-4 pb-8 z-50">
        <div className="flex justify-between items-center max-w-sm mx-auto">
          <button className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-8 rounded-full bg-[#e9f0ed] flex items-center justify-center">
              <Home size={20} className="text-[#0f4c3a]" strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-semibold text-[#0f4c3a]">Beranda</span>
          </button>
          
          <button className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-8 rounded-full flex items-center justify-center group-hover:bg-[#fafafa] transition-colors">
              <Package size={20} className="text-[#737373]" strokeWidth={2} />
            </div>
            <span className="text-[11px] font-medium text-[#737373]">Paket</span>
          </button>
          
          <button className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-8 rounded-full flex items-center justify-center group-hover:bg-[#fafafa] transition-colors">
              <Clock size={20} className="text-[#737373]" strokeWidth={2} />
            </div>
            <span className="text-[11px] font-medium text-[#737373]">Riwayat</span>
          </button>
          
          <button className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-8 rounded-full flex items-center justify-center group-hover:bg-[#fafafa] transition-colors">
              <User size={20} className="text-[#737373]" strokeWidth={2} />
            </div>
            <span className="text-[11px] font-medium text-[#737373]">Profil</span>
          </button>
        </div>
      </nav>
      
    </div>
  );
}