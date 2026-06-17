import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Router, Plus, MoreVertical, Wifi, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminRouters() {
  const { routers, addRouter, syncRouter, deleteRouter } = useAppContext();
  const [showAdd, setShowAdd] = useState(false);
  const [newRouter, setNewRouter] = useState({ name: '', ip_address: '', api_port: '8728', username: '', password: '' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if(newRouter.name && newRouter.ip_address) {
      addRouter(newRouter);
      setShowAdd(false);
      setNewRouter({ name: '', ip_address: '', api_port: '8728', username: '', password: '' });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Yakin ingin menghapus router ini?')) {
        deleteRouter(id);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Router MikroTik</h1>
          <p className="text-white/50 text-[13px] font-medium">Konfigurasi perangkat router.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="w-10 h-10 bg-[#0A84FF]/10 hover:bg-[#0A84FF]/20 border border-[#0A84FF]/20 text-[#0A84FF] rounded-[14px] flex items-center justify-center transition-all active:scale-95">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid gap-4">
         {routers.map((router, idx) => (
             <motion.div 
               key={router.id}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: idx * 0.1 }}
               className="bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[24px] p-5 shadow-sm group relative overflow-hidden"
             >
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-[14px] bg-white/[0.04] border border-white/5 flex items-center justify-center">
                          <Router className={`w-6 h-6 ${router.status === 'online' ? 'text-[#34C759]' : router.status === 'warning' ? 'text-[#FF9F0A]' : 'text-[#FF453A]'}`} />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black ${router.status === 'online' ? 'bg-[#34C759]' : router.status === 'warning' ? 'bg-[#FF9F0A]' : 'bg-[#FF453A]'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[15px] text-white mb-0.5 leading-tight">{router.name}</h3>
                      <p className="font-mono text-[11px] text-[#0A84FF]">{router.ip_address}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(router.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/50 hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors">
                       <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                    <div className="bg-white/[0.02] border border-white/5 rounded-[16px] p-3">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1">User Aktif</p>
                        <p className="text-[20px] font-bold text-white leading-none mt-1">{router.connected_users}</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-[16px] p-3">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1">Status</p>
                        <p className={`text-[15px] font-bold capitalize mt-1 leading-none ${router.status === 'online' ? 'text-[#34C759]' : router.status === 'warning' ? 'text-[#FF9F0A]' : 'text-[#FF453A]'}`}>
                          {router.status}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 relative z-10">
                    <button 
                      onClick={() => syncRouter(router.id)}
                      className="flex-1 bg-[#0A84FF]/10 hover:bg-[#0A84FF]/20 active:bg-[#0A84FF]/30 text-[#0A84FF] text-[13px] font-semibold py-2.5 rounded-[14px] transition-all flex items-center justify-center gap-2"
                    >
                      <Wifi className="w-4 h-4" />
                      Sync Profil
                    </button>
                </div>
             </motion.div>
         ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/40 backdrop-blur-md"
          >
             <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md bg-[#1C1C1E] border-t border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative"
            >
               <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
               <button 
                  onClick={() => setShowAdd(false)} 
                  className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-[22px] font-bold text-white mb-6">Tambah Router</h3>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">Nama Router</label>
                    <input
                      type="text"
                      value={newRouter.name}
                      onChange={e => setNewRouter({...newRouter, name: e.target.value})}
                      placeholder="e.g. Router Utama"
                      className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">IP Address</label>
                    <input
                      type="text"
                      value={newRouter.ip_address}
                      onChange={e => setNewRouter({...newRouter, ip_address: e.target.value})}
                      placeholder="e.g. 192.168.1.1"
                      className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white font-mono text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium text-white/60 mb-1.5">API Port</label>
                      <input
                        type="text"
                        value={newRouter.api_port}
                        onChange={e => setNewRouter({...newRouter, api_port: e.target.value})}
                        placeholder="8728"
                        className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium text-white/60 mb-1.5">Username</label>
                      <input
                        type="text"
                        value={newRouter.username}
                        onChange={e => setNewRouter({...newRouter, username: e.target.value})}
                        placeholder="admin"
                        className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-white/60 mb-1.5">Password</label>
                      <input
                        type="password"
                        value={newRouter.password}
                        onChange={e => setNewRouter({...newRouter, password: e.target.value})}
                        placeholder="••••"
                        className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-[#0A84FF] hover:bg-[#0A84FF]/90 active:scale-[0.98] transition-transform text-white font-semibold py-4 rounded-[16px] mt-4 max-sm:pb-8 text-[15px]">Simpan Router</button>
                </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
