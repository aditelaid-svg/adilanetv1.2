import React from "react";
import { 
  Bell, 
  Wifi, 
  ArrowRight, 
  Home, 
  Compass, 
  History, 
  User, 
  Plus, 
  CreditCard,
  Activity,
  ShieldCheck,
  ChevronRight,
  HeadphonesIcon
} from "lucide-react";
import "./ScopedObsidian.css";

export function ObsidianGold() {
  return (
    <div className="w-[430px] min-h-[932px] mx-auto relative overflow-hidden obsidian-container">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
      `}} />

      {/* Subtle background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[20%] bg-[#D4AF37] opacity-[0.03] blur-[100px] rounded-full pointer-events-none"></div>

      <div className="h-full overflow-y-auto obsidian-hide-scroll relative z-10 pb-28">
        
        {/* Header */}
        <header className="px-7 pt-16 pb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden obsidian-gold-border bg-[#111]">
              <img 
                src="https://api.dicebear.com/7.x/notionists/svg?seed=Andi&backgroundColor=111111" 
                alt="Avatar" 
                className="w-full h-full object-cover opacity-80 mix-blend-luminosity"
              />
            </div>
            <div>
              <p className="text-[11px] text-[#A3A3A3] font-medium tracking-[0.15em] uppercase mb-0.5">Anggota Eksklusif</p>
              <h1 className="obsidian-serif text-2xl font-medium text-white tracking-wide">Bapak Andi</h1>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center relative hover:bg-white/5 transition-colors border border-white/5">
            <Bell size={18} strokeWidth={1.5} className="text-[#D4AF37]" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_5px_rgba(212,175,55,0.8)]"></span>
          </button>
        </header>

        <div className="px-7 space-y-9">
          
          {/* Centurion Balance Card */}
          <div className="obsidian-metal-card obsidian-gold-border rounded-[20px] p-7 mt-2">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[12px] text-[#A3A3A3] mb-2 font-medium tracking-widest uppercase">Saldo Utama</p>
                <div className="obsidian-serif text-[40px] leading-none font-medium text-white flex items-baseline gap-2">
                  <span className="text-xl text-[#A3A3A3] font-sans font-light">Rp</span>
                  1.250.000
                </div>
              </div>
              <div className="w-10 h-10 rounded-full border border-[#D4AF37]/30 flex items-center justify-center bg-[#000]/40">
                <ShieldCheck size={20} strokeWidth={1.5} className="text-[#D4AF37]" />
              </div>
            </div>
            
            <div className="flex gap-4">
              <button className="flex-1 py-3.5 rounded-xl border border-[#D4AF37]/40 bg-[#000]/40 hover:bg-[#D4AF37]/10 font-medium text-[13px] flex justify-center items-center gap-2 transition-all">
                <Plus size={16} className="text-[#D4AF37]" /> 
                <span className="text-[#E0E0E0]">Top Up</span>
              </button>
              <button className="flex-1 py-3.5 rounded-xl obsidian-gold-bg font-semibold text-[13px] text-black flex justify-center items-center gap-2 shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:opacity-90 transition-all">
                <Wifi size={16} strokeWidth={2} /> Beli Voucher
              </button>
            </div>
          </div>

          {/* Quick Actions (Minimalist) */}
          <div className="flex justify-between px-2">
            {[
              { icon: Activity, label: "Transfer" },
              { icon: CreditCard, label: "Tagihan" },
              { icon: History, label: "Riwayat" },
              { icon: HeadphonesIcon, label: "Bantuan" }
            ].map((action, i) => (
              <button key={i} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-2xl bg-[#111] border border-white/5 flex items-center justify-center group-hover:border-[#D4AF37]/40 transition-all">
                  <action.icon size={20} strokeWidth={1.5} className="text-[#A3A3A3] group-hover:text-[#D4AF37] transition-colors" />
                </div>
                <span className="text-[11px] text-[#A3A3A3] font-medium tracking-wide">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Active Voucher (Pass style) */}
          <div className="relative">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-[12px] text-[#A3A3A3] font-medium uppercase tracking-[0.2em]">Koneksi Aktif</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.6)]"></span>
                <span className="text-[11px] text-[#D4AF37] font-medium uppercase tracking-wider">Terhubung</span>
              </div>
            </div>
            
            <div className="bg-[#111] obsidian-gold-border rounded-[20px] p-6 relative overflow-hidden">
              {/* Subtle watermark */}
              <Wifi className="absolute -right-6 -bottom-6 w-32 h-32 text-white/[0.02] -rotate-12" strokeWidth={1} />
              
              <div className="relative z-10 flex justify-between items-center mb-5">
                <div>
                  <h3 className="obsidian-serif text-xl font-medium text-white">Privilege 30 Hari</h3>
                  <p className="text-[13px] text-[#A3A3A3] mt-1 font-light tracking-wide">Unlimited Data • 100 Mbps</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#A3A3A3] uppercase tracking-wider mb-1">Sisa Waktu</p>
                  <p className="text-lg font-medium text-[#D4AF37] font-mono">14<span className="text-xs text-[#A3A3A3] ml-0.5 mr-1">h</span>22<span className="text-xs text-[#A3A3A3] ml-0.5">m</span></p>
                </div>
              </div>
              
              <div className="h-1.5 w-full bg-[#222] rounded-full overflow-hidden">
                <div className="h-full obsidian-gold-bg w-[65%] rounded-full relative">
                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Catalog (Elegant Horizontal Scroll) */}
          <div>
            <div className="flex justify-between items-end mb-5">
              <h2 className="text-[12px] text-[#A3A3A3] font-medium uppercase tracking-[0.2em]">Katalog Premium</h2>
              <button className="text-[11px] text-[#D4AF37] font-medium uppercase tracking-wider flex items-center gap-1 hover:text-white transition-colors">
                Lihat Semua <ChevronRight size={12} />
              </button>
            </div>
            
            <div className="flex overflow-x-auto obsidian-hide-scroll gap-4 -mx-7 px-7 pb-4 snap-x snap-mandatory">
              
              {[
                { name: "Gold Pass", duration: "7 Hari", speed: "50 Mbps", price: "45.000", popular: false },
                { name: "Platinum Pass", duration: "30 Hari", speed: "100 Mbps", price: "150.000", popular: true },
                { name: "Diamond Pass", duration: "90 Hari", speed: "200 Mbps", price: "400.000", popular: false },
              ].map((pkg, i) => (
                <div key={i} className={`min-w-[200px] snap-start rounded-[20px] p-5 flex flex-col relative ${pkg.popular ? 'obsidian-metal-card obsidian-gold-border' : 'bg-[#111] border border-white/5'}`}>
                  {pkg.popular && (
                    <div className="absolute top-0 right-5 -translate-y-1/2 bg-[#D4AF37] text-black text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-sm">
                      Rekomendasi
                    </div>
                  )}
                  
                  <h3 className={`obsidian-serif text-lg mb-1 ${pkg.popular ? 'text-[#D4AF37]' : 'text-white'}`}>{pkg.name}</h3>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-[11px] text-[#A3A3A3] font-medium">{pkg.duration}</span>
                    <span className="w-1 h-1 rounded-full bg-[#333]"></span>
                    <span className="text-[11px] text-[#A3A3A3] font-medium">{pkg.speed}</span>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
                    <div className="font-medium text-white">
                      <span className="text-[10px] text-[#A3A3A3] mr-1">Rp</span>
                      {pkg.price}
                    </div>
                    <button className={`w-8 h-8 rounded-full flex items-center justify-center ${pkg.popular ? 'bg-[#D4AF37] text-black' : 'bg-[#222] text-white'}`}>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
              
            </div>
          </div>
          
          {/* Recent Transactions (Minimal list) */}
          <div className="pb-8">
            <h2 className="text-[12px] text-[#A3A3A3] font-medium uppercase tracking-[0.2em] mb-5">Transaksi Terakhir</h2>
            <div className="space-y-4">
              {[
                { title: "Top Up Saldo", date: "Hari ini, 09:41", amount: "+ Rp 500.000", type: "in" },
                { title: "Platinum Pass 30 Hari", date: "Kemarin, 14:20", amount: "- Rp 150.000", type: "out" },
              ].map((tx, i) => (
                <div key={i} className="flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/5 ${tx.type === 'in' ? 'bg-[#111]' : 'bg-[#000]'}`}>
                      {tx.type === 'in' ? <Plus size={14} className="text-white" /> : <Wifi size={14} className="text-[#A3A3A3]" />}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-white mb-0.5">{tx.title}</p>
                      <p className="text-[11px] text-[#A3A3A3]">{tx.date}</p>
                    </div>
                  </div>
                  <span className={`text-[13px] font-medium font-mono ${tx.type === 'in' ? 'text-[#D4AF37]' : 'text-white'}`}>
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-20 pointer-events-none"></div>
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[85%] h-[60px] bg-[#111]/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-between px-6 z-30 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <button className="flex flex-col items-center gap-1 text-[#D4AF37]">
          <Home size={20} strokeWidth={2} />
        </button>
        <button className="flex flex-col items-center gap-1 text-[#A3A3A3] hover:text-white transition-colors">
          <Compass size={20} strokeWidth={1.5} />
        </button>
        <button className="flex flex-col items-center gap-1 text-[#A3A3A3] hover:text-white transition-colors">
          <History size={20} strokeWidth={1.5} />
        </button>
        <button className="flex flex-col items-center gap-1 text-[#A3A3A3] hover:text-white transition-colors">
          <User size={20} strokeWidth={1.5} />
        </button>
      </div>

    </div>
  );
}
