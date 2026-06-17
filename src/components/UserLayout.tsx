import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Package, ShoppingCart, Clock, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function UserLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#000000] text-slate-50 font-sans selection:bg-indigo-500/30 overflow-hidden flex justify-center">
      <div className="relative z-10 w-full max-w-md bg-[#000000] border-x border-white/5 min-h-screen flex flex-col relative overflow-x-hidden">
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-24 snap-y snap-mandatory scroll-smooth hide-scrollbar bg-[#000000]">
          <Outlet />
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full max-w-md mx-auto z-50">
          <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-[40px] border-t border-white/10" />
          <div className="relative flex justify-around items-center h-[80px] px-2 pb-safe">
            
            <NavLink to="/user/" end className={({ isActive }) => cn("flex flex-col items-center justify-center w-16 h-full transition-colors relative group", isActive ? "text-[#0A84FF]" : "text-slate-500 hover:text-slate-300")}>
              {({ isActive }) => (
                <>
                  <Home className={cn("w-6 h-6 mb-1 transition-transform", isActive ? "scale-100" : "scale-95")} />
                  <span className="text-[10px] font-medium tracking-wide">Beranda</span>
                </>
              )}
            </NavLink>

            <NavLink to="/user/packages" className={({ isActive }) => cn("flex flex-col items-center justify-center w-16 h-full transition-colors relative group mr-4", isActive ? "text-[#0A84FF]" : "text-slate-500 hover:text-slate-300")}>
              {({ isActive }) => (
                <>
                  <Package className={cn("w-6 h-6 mb-1 transition-transform", isActive ? "scale-100" : "scale-95")} />
                  <span className="text-[10px] font-medium tracking-wide">Paket</span>
                </>
              )}
            </NavLink>

            {/* Floating Action Button */}
            <div className="absolute left-1/2 -top-6 -translate-x-1/2 w-16 h-16 bg-[#000000] rounded-full flex items-center justify-center z-20">
              <button 
                onClick={() => navigate('/user/buy')}
                className="w-14 h-14 rounded-full bg-[#0A84FF] shadow-[0_4px_14px_rgba(10,132,255,0.4)] transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                <ShoppingCart className="w-6 h-6 text-white" fill="currentColor" />
              </button>
            </div>

            <NavLink to="/user/history" className={({ isActive }) => cn("flex flex-col items-center justify-center w-16 h-full transition-colors relative group ml-4", isActive ? "text-[#0A84FF]" : "text-slate-500 hover:text-slate-300")}>
               {({ isActive }) => (
                <>
                  <Clock className={cn("w-6 h-6 mb-1 transition-transform", isActive ? "scale-100" : "scale-95")} />
                  <span className="text-[10px] font-medium tracking-wide">Riwayat</span>
                </>
              )}
            </NavLink>

            <NavLink to="/user/profile" className={({ isActive }) => cn("flex flex-col items-center justify-center w-16 h-full transition-colors relative group", isActive ? "text-[#0A84FF]" : "text-slate-500 hover:text-slate-300")}>
               {({ isActive }) => (
                <>
                  <UserIcon className={cn("w-6 h-6 mb-1 transition-transform", isActive ? "scale-100" : "scale-95")} />
                  <span className="text-[10px] font-medium tracking-wide">Profil</span>
                </>
              )}
            </NavLink>

          </div>
        </nav>
      </div>
    </div>
  );
}
