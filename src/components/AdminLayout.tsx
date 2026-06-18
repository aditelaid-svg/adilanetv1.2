import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Router as RouterIcon, Ticket, Receipt, Users, Settings, Menu, X, LogOut, ChevronLeft, Megaphone, Wallet } from 'lucide-react';
import { cn } from './UserLayout';
import { useAppContext } from '../AppContext';
import { motion, AnimatePresence } from 'motion/react';
import AnimatedOutlet from './AnimatedOutlet';

const adminNav = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/' },
  { icon: RouterIcon, label: 'Router MikroTik', path: '/admin/routers' },
  { icon: Ticket, label: 'Paket Voucher', path: '/admin/packages' },
  { icon: Megaphone, label: 'Promo / Banner', path: '/admin/promos' },
  { icon: Receipt, label: 'Transaksi', path: '/admin/transactions' },
  { icon: Wallet, label: 'Riwayat Top Up', path: '/admin/topups' },
  { icon: Users, label: 'Pengguna', path: '/admin/users' },
  { icon: Settings, label: 'Pengaturan', path: '/admin/settings' },
];

export default function AdminLayout() {
  const { currentUser, setCurrentUser, loading } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen text-slate-800 font-sans selection:bg-sky-200 overflow-hidden flex justify-center">
      <div className="relative w-full max-w-md min-h-screen flex flex-col overflow-x-hidden">

        {/* Coastal gradient background */}
        <div className="coastal-bg fixed inset-0 max-w-md mx-auto">
          <div className="coastal-glow coastal-glow-1" />
          <div className="coastal-glow coastal-glow-2" />
          <div className="coastal-glow coastal-glow-3" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex justify-between items-center px-4 py-4 sticky top-0 glass rounded-b-[24px]">
          <div className="flex items-center gap-3">
             <button 
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Buka menu"
              className="w-10 h-10 flex items-center justify-center rounded-xl glass-pill text-slate-600 hover:text-slate-800 transition-all active:scale-95"
            >
              <Menu className="w-5 h-5" strokeWidth={1.8} />
            </button>
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-base tracking-tight">
               Admin Panel <ChevronLeft className="w-4 h-4 rotate-180 text-slate-400" strokeWidth={1.8} />
            </span>
          </div>
          {loading && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
              <div className="h-full w-1/5 bg-sky-500 loading-bar rounded-full" />
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <main className="relative z-10 flex-1 overflow-y-auto pb-10 scroll-smooth hide-scrollbar p-5 pt-4">
           <AnimatedOutlet />
        </main>

        {/* Sidebar Drawer */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-slate-900/40 z-50 backdrop-blur-md max-w-md mx-auto"
              />
              
              {/* Drawer */}
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                className="fixed top-0 left-0 bottom-0 w-[280px] glass-strong z-[60] flex flex-col max-w-md mx-auto shadow-2xl"
              >
                <div className="p-5 flex items-center justify-between border-b border-slate-100 mt-safe">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-white flex items-center justify-center shadow-[0_8px_20px_rgba(14,165,233,0.25)] ring-1 ring-sky-100 p-1.5">
                      <img src="/logo.png" alt="AdilaNet" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 text-[17px] leading-tight tracking-tight">AdilaNet</h2>
                        <p className="text-[13px] text-slate-500 font-medium">Admin Panel</p>
                    </div>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} aria-label="Tutup menu" className="w-8 h-8 flex items-center justify-center rounded-full glass-pill text-slate-500 hover:text-slate-800 transition-colors active:scale-95">
                    <X className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-4 hide-scrollbar">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3 px-2">Menu</p>
                  <nav className="space-y-1">
                    {adminNav.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/admin/'}
                        onClick={() => setIsSidebarOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative group font-medium text-[15px]",
                            isActive 
                              ? "text-white bg-sky-500 shadow-[0_8px_20px_rgba(14,165,233,0.3)]" 
                              : "text-slate-600 hover:text-slate-800 hover:bg-white/70 border-transparent"
                          )
                        }
                      >
                        <item.icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </nav>
                </div>

                <div className="p-5 border-t border-slate-100 bg-white/40 pb-safe">
                  <div className="flex items-center gap-3 mb-5 px-2">
                    <div className="w-10 h-10 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center font-bold text-sky-600 shadow-sm">
                      {currentUser?.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-[15px] leading-tight tracking-tight">{currentUser?.name || 'Administrator'}</h3>
                      <p className="text-[13px] text-slate-500">Administrator</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setCurrentUser(null)}
                    className="flex items-center gap-3 px-3 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-[15px] font-semibold w-full"
                  >
                    <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
                    <span>Keluar</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
