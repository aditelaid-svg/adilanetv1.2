import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Router, Plus, Wifi, X, Pencil, CheckCircle, XCircle, Loader2, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type RouterForm = { name: string; ip_address: string; api_port: string; username: string; password: string };
const emptyForm: RouterForm = { name: '', ip_address: '', api_port: '8728', username: 'admin', password: '' };

type TestResult = { connected: boolean; message: string; latency?: number } | null;

export default function AdminRouters() {
  const { routers, addRouter, updateRouter, syncRouter, deleteRouter, testRouterConnection } = useAppContext();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<RouterForm>(emptyForm);
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});
  const [testingId, setTestingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowAdd(true); };
  const openEdit = (r: typeof routers[0]) => {
    setForm({ name: r.name, ip_address: r.ip_address, api_port: r.api_port || '8728', username: r.username, password: r.password });
    setEditId(r.id);
    setShowAdd(true);
  };
  const closeModal = () => { setShowAdd(false); setEditId(null); setForm(emptyForm); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.ip_address) return;
    setSaving(true);
    if (editId !== null) {
      await updateRouter(editId, form);
    } else {
      await addRouter(form);
    }
    setSaving(false);
    closeModal();
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    setTestResults(prev => ({ ...prev, [id]: null }));
    const result = await testRouterConnection(id);
    setTestResults(prev => ({ ...prev, [id]: result }));
    setTestingId(null);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Yakin ingin menghapus router ini?')) deleteRouter(id);
  };

  const statusColor = (s: string) =>
    s === 'online' ? 'text-[#34C759]' : s === 'warning' ? 'text-[#FF9F0A]' : 'text-[#FF453A]';
  const dotColor = (s: string) =>
    s === 'online' ? 'bg-[#34C759]' : s === 'warning' ? 'bg-[#FF9F0A]' : 'bg-[#FF453A]';

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Router MikroTik</h1>
          <p className="text-white/50 text-[13px] font-medium">Konfigurasi perangkat router.</p>
        </div>
        <button onClick={openAdd} className="w-10 h-10 bg-[#0A84FF]/10 hover:bg-[#0A84FF]/20 border border-[#0A84FF]/20 text-[#0A84FF] rounded-[14px] flex items-center justify-center transition-all active:scale-95">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid gap-4">
        {routers.map((router, idx) => {
          const test = testResults[router.id];
          const isTesting = testingId === router.id;
          return (
            <motion.div
              key={router.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[24px] p-5 shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-[14px] bg-white/[0.04] border border-white/5 flex items-center justify-center">
                      <Router className={`w-6 h-6 ${statusColor(router.status)}`} />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black ${dotColor(router.status)}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px] text-white mb-0.5 leading-tight">{router.name}</h3>
                    <p className="font-mono text-[11px] text-[#0A84FF]">{router.ip_address}:{router.api_port || 8728}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(router)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/50 hover:text-[#0A84FF] hover:bg-[#0A84FF]/10 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(router.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/50 hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/[0.02] border border-white/5 rounded-[16px] p-3">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1">User Aktif</p>
                  <p className="text-[20px] font-bold text-white leading-none mt-1">{router.connected_users}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-[16px] p-3">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1">Status</p>
                  <p className={`text-[15px] font-bold capitalize mt-1 leading-none ${statusColor(router.status)}`}>
                    {router.status}
                  </p>
                </div>
              </div>

              {/* Test result bar */}
              <AnimatePresence>
                {test && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-3"
                  >
                    <div className={`flex items-center gap-2 rounded-[12px] px-3 py-2 text-[12px] font-medium ${
                      test.connected
                        ? 'bg-[#34C759]/10 border border-[#34C759]/20 text-[#34C759]'
                        : 'bg-[#FF453A]/10 border border-[#FF453A]/20 text-[#FF453A]'
                    }`}>
                      {test.connected
                        ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        : <XCircle className="w-3.5 h-3.5 shrink-0" />
                      }
                      <span className="flex-1 truncate">{test.message}</span>
                      {test.latency && (
                        <span className="text-[11px] opacity-70 shrink-0">{test.latency}ms</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2">
                <button
                  onClick={() => handleTest(router.id)}
                  disabled={isTesting}
                  className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] text-white/80 text-[13px] font-semibold py-2.5 rounded-[14px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isTesting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
                    : <><Activity className="w-4 h-4" /> Test Koneksi</>
                  }
                </button>
                <button
                  onClick={() => syncRouter(router.id)}
                  className="flex-1 bg-[#0A84FF]/10 hover:bg-[#0A84FF]/20 active:bg-[#0A84FF]/30 text-[#0A84FF] text-[13px] font-semibold py-2.5 rounded-[14px] transition-all flex items-center justify-center gap-2"
                >
                  <Wifi className="w-4 h-4" />
                  Sync Profil
                </button>
              </div>
            </motion.div>
          );
        })}

        {routers.length === 0 && (
          <div className="text-center py-16 text-white/30">
            <Router className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-[15px] font-medium">Belum ada router</p>
            <p className="text-[13px] mt-1">Tap + untuk menambah router MikroTik</p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="w-full max-w-md bg-[#1C1C1E] border-t border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
              <button onClick={closeModal} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-[22px] font-bold text-white mb-6">
                {editId !== null ? 'Edit Router' : 'Tambah Router'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-white/60 mb-1.5">Nama Router</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Router Utama" required
                    className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-white/60 mb-1.5">IP Address</label>
                  <input type="text" value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })}
                    placeholder="e.g. 192.168.1.1" required
                    className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white font-mono text-[15px] focus:outline-none focus:border-[#0A84FF]/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">API Port</label>
                    <input type="text" value={form.api_port} onChange={e => setForm({ ...form, api_port: e.target.value })}
                      placeholder="8728"
                      className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">Username</label>
                    <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                      placeholder="admin"
                      className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-white/60 mb-1.5">Password</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••"
                    className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50" />
                </div>
                <button type="submit" disabled={saving}
                  className="w-full bg-[#0A84FF] hover:bg-[#0A84FF]/90 active:scale-[0.98] disabled:opacity-60 transition-all text-white font-semibold py-4 rounded-[16px] mt-2 max-sm:pb-8 text-[15px]">
                  {saving ? 'Menyimpan...' : (editId !== null ? 'Simpan Perubahan' : 'Tambah Router')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
