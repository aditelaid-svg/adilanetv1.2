import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Router as RouterIcon, Ticket, Receipt, Users, Settings, Menu, X, LogOut, ChevronLeft } from 'lucide-react';
import { cn } from './UserLayout';
import { useAppContext } from '../AppContext';
import { motion, AnimatePresence } from 'motion/react';

const adminNav = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/' },
  { icon: RouterIcon, label: 'Router MikroTik', path: '/admin/routers' },
  { icon: Ticket, label: 'Paket Voucher', path: '/admin/packages' },
  { icon: Receipt, label: 'Transaksi', path: '/admin/transactions' },
  { icon: Users, label: 'Pengguna', path: '/admin/users' },
  { icon: Settings, label: 'Pengaturan', path: '/admin/settings' },
];

export default function AdminLayout() {
  const { currentUser, setCurrentUser } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/admin': case '/admin/': return 'Dashboard';
      case '/admin/routers': return 'Implement dashboards';
      case '/admin/packages': return 'Implement dashboards';
      case '/admin/transactions': return 'Implement dashboards';
      case '/admin/users': return 'Implement dashboards';
      case '/admin/settings': return 'Implement dashboards';
      default: return 'Admin Panel';
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-50 font-sans selection:bg-[#0A84FF]/30 overflow-hidden flex justify-center">
      <div className="relative z-10 w-full max-w-md bg-[#000000] min-h-screen flex flex-col relative overflow-x-hidden border-x border-white/5">
        
        {/* Header */}
        <header className="flex justify-between items-center px-4 py-4 sticky top-0 z-40 bg-[#000000]/80 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center gap-3">
             <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-300 hover:text-white transition-all active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-white flex items-center gap-1.5 text-base tracking-tight">
               Admin Panel <ChevronLeft className="w-4 h-4 rotate-180 text-white/50" />
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-10 scroll-smooth hide-scrollbar p-5 pt-4 bg-[#000000]">
           <Outlet />
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
                className="fixed inset-0 bg-black/60 z-50 backdrop-blur-md max-w-md mx-auto"
              />
              
              {/* Drawer */}
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                className="fixed top-0 left-0 bottom-0 w-[280px] bg-[#1C1C1E]/90 backdrop-blur-2xl z-[60] flex flex-col max-w-md mx-auto shadow-2xl border-r border-white/10"
              >
                <div className="p-5 flex items-center justify-between border-b border-white/10 mt-safe">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#0A84FF] flex items-center justify-center shadow-sm">
                      <RouterIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-white text-[17px] leading-tight tracking-tight">AdilaNet</h2>
                        <p className="text-[13px] text-white/60 font-medium">Admin Panel</p>
                    </div>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white transition-colors active:scale-95">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-4 hide-scrollbar">
                  <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-3 px-2">Menu</p>
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
                              ? "text-white bg-[#0A84FF]" 
                              : "text-white/70 hover:text-white hover:bg-white/10 border-transparent"
                          )
                        }
                      >
                        <item.icon className="w-[18px] h-[18px]" />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </nav>
                </div>

                <div className="p-5 border-t border-white/10 bg-white/5 pb-safe">
                  <div className="flex items-center gap-3 mb-5 px-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center font-bold text-white shadow-sm border border-white/10">
                      {currentUser?.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-[15px] leading-tight tracking-tight">{currentUser?.name || 'Administrator'}</h3>
                      <p className="text-[13px] text-white/60">Administrator</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setCurrentUser(null)}
                    className="flex items-center gap-3 px-3 py-3 text-[#FF453A] hover:bg-[#FF453A]/10 rounded-xl transition-colors text-[15px] font-semibold w-full"
                  >
                    <LogOut className="w-[18px] h-[18px]" />
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
