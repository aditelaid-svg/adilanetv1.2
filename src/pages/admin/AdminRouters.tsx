import React, { useState } from 'react';
import { useAppContext, MikrotikProfile, ActiveUser } from '../../AppContext';
import { useToast } from '../../components/Toast';
import { Router, Plus, X, Pencil, CheckCircle, XCircle, Loader2, Activity, Layers, Trash2, Gauge, Users, Clock, Wifi, RefreshCw, Smartphone, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { formatBytes } from '../../lib/format';
import EmptyState from '../../components/ui/EmptyState';

type RouterForm = { name: string; ip_address: string; api_port: string; username: string; password: string };
const emptyForm: RouterForm = { name: '', ip_address: '', api_port: '8728', username: 'admin', password: '' };

type ProfileForm = { name: string; rateLimit: string; sharedUsers: string; durationValue: string; durationUnit: 'm' | 'h' | 'd' };
const emptyProfileForm: ProfileForm = { name: '', rateLimit: '', sharedUsers: '1', durationValue: '', durationUnit: 'h' };

type TestResult = { connected: boolean; message: string; latency?: number } | null;

export default function AdminRouters() {
  const {
    routers, addRouter, updateRouter, deleteRouter, testRouterConnection,
    getRouterActiveUsers, getRouterProfiles, createRouterProfile, updateRouterProfile, deleteRouterProfile,
  } = useAppContext();
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<RouterForm>(emptyForm);
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});
  const [testingId, setTestingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── Profile management state ───
  const [profileRouterId, setProfileRouterId] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<MikrotikProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesSource, setProfilesSource] = useState<string>('');
  const [profilesWarning, setProfilesWarning] = useState<string | undefined>();
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileEditId, setProfileEditId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm);
  const [profileSaving, setProfileSaving] = useState(false);

  // ─── Active (online) users state ───
  const [activeRouterId, setActiveRouterId] = useState<number | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [activeLoading, setActiveLoading] = useState(false);

  const openActiveUsers = async (routerId: number) => {
    setActiveRouterId(routerId);
    setActiveUsers([]);
    setActiveLoading(true);
    try {
      const list = await getRouterActiveUsers(routerId);
      setActiveUsers(list);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat user aktif');
      setActiveRouterId(null);
    } finally {
      setActiveLoading(false);
    }
  };

  const refreshActiveUsers = async () => {
    if (activeRouterId == null) return;
    setActiveLoading(true);
    try {
      const list = await getRouterActiveUsers(activeRouterId);
      setActiveUsers(list);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat user aktif');
    } finally {
      setActiveLoading(false);
    }
  };

  const loadProfiles = async (routerId: number) => {
    setProfilesLoading(true);
    try {
      const res = await getRouterProfiles(routerId);
      setProfiles(res.data);
      setProfilesSource(res.source);
      setProfilesWarning(res.warning);
    } catch (e: any) {
      toast.error('Gagal memuat profil', e.message);
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  };

  const openProfiles = async (routerId: number) => {
    setProfileRouterId(routerId);
    setShowProfileForm(false);
    setProfileForm(emptyProfileForm);
    setProfileEditId(null);
    await loadProfiles(routerId);
  };

  const closeProfiles = () => {
    setProfileRouterId(null);
    setProfiles([]);
    setShowProfileForm(false);
  };

  const openProfileAdd = () => {
    setProfileForm(emptyProfileForm);
    setProfileEditId(null);
    setShowProfileForm(true);
  };

  const openProfileEdit = (p: MikrotikProfile) => {
    const mm = (p.validityRaw || '').match(/^(\d+)([mhd])$/);
    setProfileForm({
      name: p.name,
      rateLimit: p.rateLimit === 'N/A' ? '' : p.rateLimit,
      sharedUsers: p.sharedUsers || '1',
      durationValue: mm ? mm[1] : '',
      durationUnit: (mm ? mm[2] : 'h') as 'm' | 'h' | 'd',
    });
    setProfileEditId(p.id);
    setShowProfileForm(true);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRouterId || !profileForm.name) return;
    if (profilesSource !== 'mikrotik') {
      toast.error('Router tidak terhubung', 'Profil hanya bisa diubah saat router MikroTik terhubung.');
      return;
    }
    setProfileSaving(true);
    try {
      const payload = {
        name: profileForm.name,
        rateLimit: profileForm.rateLimit || undefined,
        sharedUsers: profileForm.sharedUsers || undefined,
        validity: profileForm.durationValue ? `${profileForm.durationValue}${profileForm.durationUnit}` : undefined,
      };
      if (profileEditId) {
        await updateRouterProfile(profileRouterId, profileEditId, payload);
        toast.success('Profil diperbarui', `"${profileForm.name}" berhasil disimpan.`);
      } else {
        await createRouterProfile(profileRouterId, payload);
        toast.success('Profil dibuat', `"${profileForm.name}" berhasil ditambahkan.`);
      }
      setShowProfileForm(false);
      await loadProfiles(profileRouterId);
    } catch (err: any) {
      toast.error('Gagal menyimpan profil', err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileDelete = async (p: MikrotikProfile) => {
    if (!profileRouterId) return;
    if (profilesSource !== 'mikrotik') {
      toast.error('Router tidak terhubung', 'Profil hanya bisa dihapus saat router MikroTik terhubung.');
      return;
    }
    const ok = await toast.confirm(
      'Hapus Profil?',
      `Profil "${p.name}" akan dihapus dari router MikroTik.`,
      { confirmText: 'Ya, Hapus', danger: true }
    );
    if (!ok) return;
    try {
      await deleteRouterProfile(profileRouterId, p.id);
      toast.success('Profil dihapus', `"${p.name}" berhasil dihapus.`);
      await loadProfiles(profileRouterId);
    } catch (err: any) {
      toast.error('Gagal menghapus profil', err.message);
    }
  };

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowAdd(true); };
  const openEdit = (r: typeof routers[0]) => {
    setForm({ name: r.name, ip_address: r.ip_address, api_port: r.api_port || '8728', username: r.username || 'admin', password: r.password || '' });
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

  const handleDelete = async (id: number, name: string) => {
    const ok = await toast.confirm(
      'Hapus Router?',
      `Router "${name}" akan dihapus. Pastikan tidak ada voucher aktif yang bergantung pada router ini.`,
      { confirmText: 'Ya, Hapus', danger: true }
    );
    if (ok) {
      await deleteRouter(id);
      toast.success('Router dihapus', `${name} berhasil dihapus.`);
    }
  };

  const statusColor = (s: string) =>
    s === 'online' ? 'text-teal-600' : s === 'warning' ? 'text-amber-600' : 'text-rose-600';
  const dotColor = (s: string) =>
    s === 'online' ? 'bg-teal-500' : s === 'warning' ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-800 mb-1">Router MikroTik</h1>
          <p className="text-slate-500 text-[13px] font-medium">Konfigurasi perangkat router.</p>
        </div>
        <button onClick={openAdd} className="w-10 h-10 bg-sky-500 hover:bg-sky-600 text-white rounded-[16px] flex items-center justify-center transition-all active:scale-95 shadow-[0_8px_20px_rgba(14,165,233,0.3)]">
          <Plus className="w-5 h-5" strokeWidth={2} />
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
              className="glass-strong rounded-[24px] p-5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-[14px] bg-white border border-slate-100 flex items-center justify-center">
                      <Router className={`w-6 h-6 ${statusColor(router.status)}`} strokeWidth={1.8} />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${dotColor(router.status)}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px] text-slate-800 mb-0.5 leading-tight">{router.name}</h3>
                    <p className="font-mono text-[11px] text-sky-600">{router.ip_address}:{router.api_port || 8728}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(router)}
                    aria-label="Edit router"
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleDelete(router.id, router.name)}
                    aria-label="Hapus router"
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => openActiveUsers(router.id)}
                  className="text-left bg-white hover:bg-slate-50 border border-slate-100 rounded-[16px] p-3 transition-colors group"
                >
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1 flex items-center gap-1">
                    <Wifi className="w-3 h-3" strokeWidth={2} /> User Online
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <p className="text-[20px] font-bold text-slate-800 leading-none">{router.connected_users}</p>
                    <span className="text-[10px] text-sky-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Lihat →</span>
                  </div>
                </button>
                <div className="bg-white border border-slate-100 rounded-[16px] p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Status</p>
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
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {test.connected
                        ? <CheckCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                        : <XCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
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
                  className="flex-1 bg-white border border-slate-100 hover:bg-slate-50 text-slate-700 text-[13px] font-semibold py-2.5 rounded-[14px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {isTesting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
                    : <><Activity className="w-4 h-4" strokeWidth={2} /> Test Koneksi</>
                  }
                </button>
                <button
                  onClick={() => openProfiles(router.id)}
                  className="flex-1 bg-sky-50 hover:bg-sky-100 text-sky-600 text-[13px] font-semibold py-2.5 rounded-[14px] transition-all flex items-center justify-center gap-2"
                >
                  <Layers className="w-4 h-4" strokeWidth={2} />
                  Kelola Profil
                </button>
              </div>
            </motion.div>
          );
        })}

        {routers.length === 0 && (
          <EmptyState
            icon={Router}
            title="Belum ada router"
            description="Tap + untuk menambah router MikroTik."
          />
        )}
      </div>

      {/* Add / Edit Modal */}
      {createPortal(
        <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="w-full max-w-md glass-strong rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl relative"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
              <button onClick={closeModal} aria-label="Tutup" className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white border border-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
              <h3 className="text-[22px] font-bold text-slate-800 mb-6">
                {editId !== null ? 'Edit Router' : 'Tambah Router'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Nama Router</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Router Utama" required
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">IP Address</label>
                  <input type="text" value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })}
                    placeholder="e.g. 192.168.1.1" required
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 font-mono text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">API Port</label>
                    <input type="text" value={form.api_port} onChange={e => setForm({ ...form, api_port: e.target.value })}
                      placeholder="8728"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Username</label>
                    <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                      placeholder="admin"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300" />
                </div>
                <button type="submit" disabled={saving}
                  className="w-full bg-sky-500 hover:bg-sky-600 active:scale-95 disabled:opacity-60 transition-all text-white font-semibold py-4 rounded-[16px] mt-2 max-sm:pb-8 text-[15px] shadow-[0_8px_20px_rgba(14,165,233,0.3)]">
                  {saving ? 'Menyimpan...' : (editId !== null ? 'Simpan Perubahan' : 'Tambah Router')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body
      )}

      {/* Profile Manager Modal */}
      {createPortal(
        <AnimatePresence>
        {profileRouterId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="w-full max-w-md glass-strong rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl relative max-h-[88vh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />
              <button onClick={closeProfiles} aria-label="Tutup" className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white border border-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-5 h-5 text-sky-600" strokeWidth={2} />
                <h3 className="text-[22px] font-bold text-slate-800">Profil Hotspot</h3>
              </div>
              <p className="text-slate-400 text-[12px] mb-4">
                {routers.find(r => r.id === profileRouterId)?.name}
              </p>

              {profilesSource === 'demo' && (
                <div className="flex items-center gap-2 rounded-[12px] px-3 py-2 mb-3 text-[12px] font-medium bg-amber-100 text-amber-700">
                  <XCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                  <span className="flex-1">{profilesWarning || 'Router tidak terjangkau — perubahan dinonaktifkan.'}</span>
                </div>
              )}

              {showProfileForm ? (
                <form onSubmit={handleProfileSubmit} className="space-y-4 overflow-y-auto">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Nama Profil</label>
                    <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                      placeholder="e.g. 1jam" required disabled={profileEditId !== null}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Rate Limit (up/down)</label>
                    <input type="text" value={profileForm.rateLimit} onChange={e => setProfileForm({ ...profileForm, rateLimit: e.target.value })}
                      placeholder="e.g. 2M/2M"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 font-mono text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Masa Aktif Voucher</label>
                    <div className="flex gap-2">
                      <input type="number" min="1" value={profileForm.durationValue}
                        onChange={e => setProfileForm({ ...profileForm, durationValue: e.target.value })}
                        placeholder={profileEditId ? 'kosong = tetap' : 'e.g. 10'}
                        className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300" />
                      <select value={profileForm.durationUnit}
                        onChange={e => setProfileForm({ ...profileForm, durationUnit: e.target.value as 'm' | 'h' | 'd' })}
                        className="w-32 bg-white border border-slate-200 rounded-2xl px-3 py-3.5 text-slate-800 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300">
                        <option value="m">Menit</option>
                        <option value="h">Jam</option>
                        <option value="d">Hari</option>
                      </select>
                    </div>
                    <p className="text-[12px] text-slate-400 mt-1.5 leading-snug">Dihitung sejak voucher login pertama kali. Setelah masa ini habis, voucher otomatis hangus walau belum dipakai penuh.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Shared Users <span className="text-slate-400 font-normal">(perangkat bersamaan)</span></label>
                    <input type="text" value={profileForm.sharedUsers} onChange={e => setProfileForm({ ...profileForm, sharedUsers: e.target.value })}
                      placeholder="1"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300" />
                  </div>
                  <div className="flex gap-2 pt-1 max-sm:pb-6">
                    <button type="button" onClick={() => setShowProfileForm(false)}
                      className="flex-1 bg-white border border-slate-100 hover:bg-slate-50 text-slate-700 font-semibold py-3.5 rounded-[16px] text-[15px] transition-colors shadow-sm">
                      Batal
                    </button>
                    <button type="submit" disabled={profileSaving}
                      className="flex-1 bg-sky-500 hover:bg-sky-600 active:scale-95 disabled:opacity-60 transition-all text-white font-semibold py-3.5 rounded-[16px] text-[15px] shadow-[0_8px_20px_rgba(14,165,233,0.3)]">
                      {profileSaving ? 'Menyimpan...' : (profileEditId ? 'Simpan' : 'Tambah')}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <button
                    onClick={openProfileAdd}
                    disabled={profilesSource !== 'mikrotik'}
                    className="w-full flex items-center justify-center gap-2 bg-sky-50 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed text-sky-600 font-semibold py-3 rounded-[16px] text-[14px] transition-colors mb-3"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2} /> Tambah Profil
                  </button>

                  <div className="space-y-2 overflow-y-auto -mx-1 px-1">
                    {profilesLoading ? (
                      <div className="flex items-center justify-center py-10 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : profiles.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 text-[14px]">Belum ada profil.</div>
                    ) : (
                      profiles.map(p => (
                        <div key={p.id} className="bg-white border border-slate-100 rounded-[16px] p-3.5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-slate-800 text-[15px]">{p.name}</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => openProfileEdit(p)}
                                disabled={profilesSource !== 'mikrotik'}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-sky-600 hover:bg-sky-50 disabled:opacity-30 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                              </button>
                              <button
                                onClick={() => handleProfileDelete(p)}
                                disabled={profilesSource !== 'mikrotik'}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1"><Gauge className="w-3 h-3" strokeWidth={2} /> {p.rateLimit}</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" strokeWidth={2} /> {p.sharedUsers}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" strokeWidth={2} /> {p.validity}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body
      )}

      {/* Active (online) Users Modal */}
      {createPortal(
        <AnimatePresence>
        {activeRouterId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveRouterId(null)}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              onClick={e => e.stopPropagation()}
              className="glass-strong rounded-t-[28px] sm:rounded-[28px] w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[12px] bg-teal-100 flex items-center justify-center">
                    <Wifi className="w-[18px] h-[18px] text-teal-600" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-slate-800 font-bold text-[16px] leading-tight">User Online</h3>
                    <p className="text-[12px] text-slate-400">
                      {routers.find(r => r.id === activeRouterId)?.name} · {activeUsers.length} terhubung
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={refreshActiveUsers}
                    disabled={activeLoading}
                    aria-label="Muat ulang"
                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-100 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${activeLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setActiveRouterId(null)}
                    aria-label="Tutup"
                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-100 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto p-4 space-y-2.5">
                {activeLoading && activeUsers.length === 0 ? (
                  <div className="py-14 flex flex-col items-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mb-3" />
                    <p className="text-[13px]">Membaca sesi dari router...</p>
                  </div>
                ) : activeUsers.length === 0 ? (
                  <div className="py-14 flex flex-col items-center text-slate-400 text-center">
                    <Wifi className="w-9 h-9 mb-3 text-slate-300" strokeWidth={1.5} />
                    <p className="text-[15px] font-medium text-slate-500">Tidak ada user online</p>
                    <p className="text-[13px] mt-1">Belum ada perangkat yang terhubung saat ini.</p>
                  </div>
                ) : (
                  activeUsers.map((u) => (
                    <div key={u.id || u.macAddress || u.user} className="bg-white border border-slate-100 rounded-[16px] p-3.5">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                          </div>
                          <span className="text-slate-800 font-semibold text-[14px] truncate">{u.user}</span>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                          <Clock className="w-3 h-3" strokeWidth={2} /> {u.uptime}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {u.address && (
                          <span className="flex items-center gap-1.5 text-slate-500 truncate">
                            <Smartphone className="w-3 h-3 shrink-0 text-slate-400" strokeWidth={2} /> {u.address}
                          </span>
                        )}
                        {u.macAddress && (
                          <span className="text-slate-400 font-mono truncate">{u.macAddress}</span>
                        )}
                        <span className="flex items-center gap-1.5 text-sky-600">
                          <ArrowDownToLine className="w-3 h-3 shrink-0" strokeWidth={2} /> {formatBytes(u.bytesIn)}
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-600">
                          <ArrowUpFromLine className="w-3 h-3 shrink-0" strokeWidth={2} /> {formatBytes(u.bytesOut)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
