import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Package, ShoppingCart, Clock, User as UserIcon } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAppContext } from '../AppContext';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function UserLayout() {
  const navigate = useNavigate();
  const { loading } = useAppContext();

  return (
    <div className="min-h-screen text-slate-800 font-sans selection:bg-sky-200 overflow-hidden flex justify-center">
      <div className="relative w-full max-w-md min-h-screen flex flex-col overflow-x-hidden">
        {/* Coastal gradient background */}
        <div className="coastal-bg fixed inset-0 max-w-md mx-auto">
          <div className="coastal-glow coastal-glow-1" />
          <div className="coastal-glow coastal-glow-2" />
          <div className="coastal-glow coastal-glow-3" />
        </div>

        {loading && (
          <div className="fixed top-0 left-0 right-0 max-w-md mx-auto h-0.5 overflow-hidden z-[60]">
            <div className="h-full w-1/5 bg-sky-500 loading-bar rounded-full" />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-28 scroll-smooth hide-scrollbar relative z-10">
          <Outlet />
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full max-w-md mx-auto z-50">
          <div className="absolute inset-0 glass-nav rounded-t-[32px]" />
          <div className="relative flex justify-around items-center h-[80px] px-2 pb-safe">

            <NavLink to="/user/" end className={({ isActive }) => cn("flex flex-col items-center justify-center w-16 h-full transition-colors relative group", isActive ? "text-sky-600" : "text-slate-400 hover:text-slate-600")}>
              {({ isActive }) => (
                <>
                  <Home className={cn("w-6 h-6 mb-1 transition-transform", isActive ? "scale-100" : "scale-95")} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className={cn("text-[10px] tracking-wide", isActive ? "font-bold" : "font-medium")}>Beranda</span>
                </>
              )}
            </NavLink>

            <NavLink to="/user/packages" className={({ isActive }) => cn("flex flex-col items-center justify-center w-16 h-full transition-colors relative group mr-4", isActive ? "text-sky-600" : "text-slate-400 hover:text-slate-600")}>
              {({ isActive }) => (
                <>
                  <Package className={cn("w-6 h-6 mb-1 transition-transform", isActive ? "scale-100" : "scale-95")} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className={cn("text-[10px] tracking-wide", isActive ? "font-bold" : "font-medium")}>Paket</span>
                </>
              )}
            </NavLink>

            {/* Floating Action Button */}
            <div className="absolute left-1/2 -top-6 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center z-20">
              <div className="absolute inset-0 glass-nav rounded-full" />
              <button
                onClick={() => navigate('/user/buy')}
                aria-label="Beli voucher"
                className="relative w-14 h-14 rounded-full bg-sky-500 shadow-[0_8px_20px_rgba(14,165,233,0.4)] transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                <ShoppingCart className="w-6 h-6 text-white" />
              </button>
            </div>

            <NavLink to="/user/history" className={({ isActive }) => cn("flex flex-col items-center justify-center w-16 h-full transition-colors relative group ml-4", isActive ? "text-sky-600" : "text-slate-400 hover:text-slate-600")}>
              {({ isActive }) => (
                <>
                  <Clock className={cn("w-6 h-6 mb-1 transition-transform", isActive ? "scale-100" : "scale-95")} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className={cn("text-[10px] tracking-wide", isActive ? "font-bold" : "font-medium")}>Riwayat</span>
                </>
              )}
            </NavLink>

            <NavLink to="/user/profile" className={({ isActive }) => cn("flex flex-col items-center justify-center w-16 h-full transition-colors relative group", isActive ? "text-sky-600" : "text-slate-400 hover:text-slate-600")}>
              {({ isActive }) => (
                <>
                  <UserIcon className={cn("w-6 h-6 mb-1 transition-transform", isActive ? "scale-100" : "scale-95")} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className={cn("text-[10px] tracking-wide", isActive ? "font-bold" : "font-medium")}>Profil</span>
                </>
              )}
            </NavLink>

          </div>
        </nav>
      </div>
    </div>
  );
}
