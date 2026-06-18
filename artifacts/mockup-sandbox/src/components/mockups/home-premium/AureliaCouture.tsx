import React from "react";
import { 
  Bell, 
  Plus, 
  Wifi, 
  Home, 
  Package, 
  Clock, 
  User,
  CreditCard,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Sparkles
} from "lucide-react";
import "./ScopedAureliaCouture.css";

export function AureliaCouture() {
  return (
    <div className="w-[430px] min-h-[100dvh] relative overflow-x-hidden flex flex-col aurelia-container mx-auto shadow-2xl border-x border-[#EAE8E3]">
      
      {/* HEADER */}
      <header className="px-7 pt-14 pb-4 flex justify-between items-center bg-[#F8F7F4]/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#EAE8E3] bg-[#F0EFEA] p-[2px]">
            <img 
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=Nadia&backgroundColor=f0efea`} 
              alt="Profile"
              className="w-full h-full rounded-full object-cover" 
            />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#8A817C] tracking-widest uppercase mb-0.5">Selamat Datang</p>
            <h1 className="aurelia-serif text-[20px] font-semibold text-[#2D2422] leading-none">Nadia Putri</h1>
          </div>
        </div>
        <button className="w-11 h-11 rounded-full flex items-center justify-center relative hover:bg-[#F0EFEA] transition-colors border border-[#EAE8E3]">
          <Bell size={18} strokeWidth={1.5} className="text-[#2D2422]" />
          <span className="absolute top-[12px] right-[12px] w-2 h-2 rounded-full bg-[#C28E67] border-2 border-[#F8F7F4]"></span>
        </button>
      </header>

      <main className="flex-1 pb-32 overflow-y-auto aurelia-hide-scroll">
        
        {/* BALANCE CARD */}
        <section className="px-7 mb-8 mt-2">
          <div className="bg-[#2D2422] text-[#F8F7F4] rounded-[24px] p-7 relative overflow-hidden aurelia-card-shadow">
            {/* Elegant Background Texture / Lines */}
            <div className="absolute top-0 right-0 w-[200px] h-[200px] border border-[#C28E67]/20 rounded-full -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute top-0 right-0 w-[250px] h-[250px] border border-[#C28E67]/10 rounded-full -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[12px] text-[#D8D4CF] tracking-widest uppercase mb-2 font-medium">Saldo Tersedia</p>
                  <h2 className="aurelia-serif text-[38px] leading-none font-medium text-[#F8F7F4]">Rp 125.000</h2>
                </div>
                <div className="w-10 h-10 rounded-full border border-[#C28E67]/30 flex items-center justify-center bg-[#C28E67]/10">
                  <CreditCard size={18} className="text-[#C28E67]" strokeWidth={1.5} />
                </div>
              </div>
              
              <div className="flex gap-4 pt-2 border-t border-[#4A3E3B]">
                <button className="flex-1 py-3 text-[#F8F7F4] font-medium text-[13px] flex items-center justify-center gap-2 hover:bg-[#4A3E3B] rounded-xl transition-colors">
                  <Plus size={16} className="text-[#C28E67]" />
                  Top Up
                </button>
                <div className="w-[1px] h-8 bg-[#4A3E3B] my-auto"></div>
                <button className="flex-1 py-3 text-[#F8F7F4] font-medium text-[13px] flex items-center justify-center gap-2 hover:bg-[#4A3E3B] rounded-xl transition-colors">
                  <Wifi size={16} className="text-[#C28E67]" />
                  Beli Voucher
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ACTIVE VOUCHER */}
        <section className="px-7 mb-10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="aurelia-serif text-[22px] font-medium text-[#2D2422]">Status Koneksi</h3>
            <span className="text-[11px] font-medium tracking-widest uppercase text-[#C28E67]">Aktif</span>
          </div>
          
          <div className="bg-white rounded-[20px] p-6 aurelia-card-shadow border border-[#EAE8E3]">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#F8F7F4] border border-[#EAE8E3] flex items-center justify-center">
                  <Activity size={20} className="text-[#2D2422]" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-semibold text-[#2D2422] text-[16px] mb-1">Bulanan Elite</h4>
                  <div className="flex items-center gap-2 text-[13px] text-[#8A817C]">
                    <Clock size={12} />
                    <span>Sisa 22 Hari</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full bg-[#F8F7F4] h-1.5 rounded-full overflow-hidden mb-3">
              <div className="bg-[#C28E67] h-full w-[45%] rounded-full"></div>
            </div>
            <div className="flex justify-between items-center text-[12px] font-medium">
              <span className="text-[#2D2422]">25 GB Terpakai</span>
              <span className="text-[#8A817C]">50 GB Total</span>
            </div>
            
            <div className="mt-5 pt-4 border-t border-[#EAE8E3] flex justify-between items-center">
              <div className="font-mono text-[14px] tracking-widest text-[#2D2422] font-medium">
                ND9A-KL22-X
              </div>
              <button className="text-[#C28E67] text-[13px] font-semibold tracking-wide uppercase hover:text-[#2D2422] transition-colors">Salin Kode</button>
            </div>
          </div>
        </section>

        {/* CURATED PACKAGES */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between px-7 mb-6">
            <h3 className="aurelia-serif text-[22px] font-medium text-[#2D2422]">Koleksi Paket</h3>
            <button className="text-[#8A817C] text-[12px] font-medium uppercase tracking-widest flex items-center hover:text-[#2D2422] transition-colors">
              Lihat Semua
            </button>
          </div>
          
          <div className="flex overflow-x-auto aurelia-hide-scroll pl-7 pr-3 pb-6 gap-5 snap-x snap-mandatory">
            
            {/* Card 1 - Premium */}
            <div className="min-w-[240px] snap-start bg-[#2D2422] text-[#F8F7F4] rounded-[20px] p-6 relative overflow-hidden flex flex-col aurelia-card-shadow">
              <div className="absolute top-0 right-0 p-4">
                <Sparkles size={20} className="text-[#C28E67]/40" strokeWidth={1.5} />
              </div>
              <div className="mb-8">
                <span className="inline-block text-[#C28E67] text-[10px] font-bold uppercase tracking-widest mb-3">Rekomendasi</span>
                <h4 className="aurelia-serif text-[24px] font-medium mb-2">Mingguan Eksekutif</h4>
                <p className="text-[13px] text-[#D8D4CF]">Akses tanpa batas, kecepatan prioritas selama 7 hari.</p>
              </div>
              <div className="mt-auto flex justify-between items-end">
                <div>
                  <p className="text-[20px] font-medium text-[#F8F7F4]">Rp 45.000</p>
                </div>
                <button className="w-10 h-10 rounded-full bg-[#C28E67] flex items-center justify-center text-white hover:bg-[#b07d57] transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Card 2 - Standard */}
            <div className="min-w-[240px] snap-start bg-white border border-[#EAE8E3] rounded-[20px] p-6 relative flex flex-col aurelia-card-shadow">
              <div className="mb-8">
                <span className="inline-block text-[#8A817C] text-[10px] font-bold uppercase tracking-widest mb-3">Esensial</span>
                <h4 className="aurelia-serif text-[24px] font-medium text-[#2D2422] mb-2">Harian Premium</h4>
                <p className="text-[13px] text-[#8A817C]">Koneksi stabil untuk kebutuhan harian Anda.</p>
              </div>
              <div className="mt-auto flex justify-between items-end">
                <div>
                  <p className="text-[20px] font-medium text-[#2D2422]">Rp 15.000</p>
                </div>
                <button className="w-10 h-10 rounded-full border border-[#EAE8E3] flex items-center justify-center text-[#2D2422] hover:bg-[#F8F7F4] transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* RECENT TRANSACTIONS */}
        <section className="px-7 mb-6">
          <h3 className="aurelia-serif text-[22px] font-medium text-[#2D2422] mb-5">Riwayat Terakhir</h3>
          
          <div className="space-y-4">
            <div className="bg-white rounded-[16px] p-4 flex items-center justify-between border border-[#EAE8E3]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#F8F7F4] flex items-center justify-center">
                  <ArrowDownLeft size={18} className="text-[#C28E67]" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-semibold text-[#2D2422] text-[14px]">Top Up Saldo</h4>
                  <p className="text-[12px] text-[#8A817C] mt-0.5">Hari ini, 09:41</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-[#2D2422] text-[14px]">+Rp 50.000</p>
                <p className="text-[11px] text-[#C28E67] font-medium uppercase tracking-wider mt-0.5">Berhasil</p>
              </div>
            </div>

            <div className="bg-white rounded-[16px] p-4 flex items-center justify-between border border-[#EAE8E3]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#F8F7F4] flex items-center justify-center">
                  <ArrowUpRight size={18} className="text-[#2D2422]" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-semibold text-[#2D2422] text-[14px]">Mingguan Eksekutif</h4>
                  <p className="text-[12px] text-[#8A817C] mt-0.5">12 Mar 2024</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-[#2D2422] text-[14px]">-Rp 45.000</p>
                <p className="text-[11px] text-[#C28E67] font-medium uppercase tracking-wider mt-0.5">Berhasil</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* BOTTOM NAV */}
      <nav className="absolute bottom-0 left-0 right-0 bg-[#F8F7F4]/90 backdrop-blur-xl border-t border-[#EAE8E3] px-8 pt-4 pb-8 z-50 aurelia-glass">
        <div className="flex justify-between items-center max-w-sm mx-auto">
          <button className="flex flex-col items-center gap-1.5 group">
            <div className="w-10 h-10 rounded-full flex items-center justify-center">
              <Home size={22} className="text-[#2D2422]" strokeWidth={2} />
            </div>
            <span className="text-[10px] font-semibold text-[#2D2422] tracking-widest uppercase">Beranda</span>
          </button>
          
          <button className="flex flex-col items-center gap-1.5 group opacity-50 hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full flex items-center justify-center">
              <Package size={22} className="text-[#2D2422]" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-medium text-[#2D2422] tracking-widest uppercase">Paket</span>
          </button>
          
          <button className="flex flex-col items-center gap-1.5 group opacity-50 hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full flex items-center justify-center">
              <Clock size={22} className="text-[#2D2422]" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-medium text-[#2D2422] tracking-widest uppercase">Riwayat</span>
          </button>
          
          <button className="flex flex-col items-center gap-1.5 group opacity-50 hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full flex items-center justify-center">
              <User size={22} className="text-[#2D2422]" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-medium text-[#2D2422] tracking-widest uppercase">Profil</span>
          </button>
        </div>
      </nav>
      
    </div>
  );
}
