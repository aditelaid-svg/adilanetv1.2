import React, { useState, useEffect } from 'react';
import { useAppContext, Package } from '../../AppContext';
import { useToast } from '../../components/Toast';
import { Plus, Edit, Trash2, Clock, Zap, Wifi, Link as LinkIcon, Check, X, RefreshCw, AlertCircle, Router } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { formatRupiah } from '../../lib/format';
import EmptyState from '../../components/ui/EmptyState';

interface MikrotikProfile {
  id: string;
  name: string;
  sessionTimeout: string;
  validity: string;
  validityRaw: string;
  sharedUsers: string;
  rateLimit: string;
}

type PkgForm = {
  name: string;
  speed: string;
  quota: string;
  duration: string;
  price: string;
  badge_color: string;
  router_id: string;
  mikrotik_profile: string;
};

const emptyForm: PkgForm = {
  name: '', speed: '', quota: 'Unlimited', duration: '', price: '', badge_color: 'blue',
  router_id: '', mikrotik_profile: '',
};

const COLORS = [
  { value: 'blue', cls: 'bg-blue-500' },
  { value: 'purple', cls: 'bg-purple-500' },
  { value: 'cyan', cls: 'bg-cyan-500' },
  { value: 'emerald', cls: 'bg-emerald-500' },
  { value: 'orange', cls: 'bg-orange-500' },
  { value: 'red', cls: 'bg-red-500' },
];

const BADGE_LABEL: Record<string, string> = {
  blue: 'Standar', purple: 'Premium', cyan: 'Pro', emerald: 'Hemat', orange: 'Populer', red: 'Eksklusif',
};

export default function AdminPackages() {
  const { packages, routers, deletePackage, addPackage, updatePackage } = useAppContext();
  const toast = useToast();

  const [copiedLink, setCopiedLink] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg] = useState<Package | null>(null);
  const [form, setForm] = useState<PkgForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [profiles, setProfiles] = useState<MikrotikProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profileSource, setProfileSource] = useState<'mikrotik' | 'demo' | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setForm(f => ({ ...f, mikrotik_profile: '' }));
    setProfiles([]);
    setProfileSource(null);
    setProfileError(null);

    if (!form.router_id) return;

    setLoadingProfiles(true);
    fetch(`/api/routers/${form.router_id}/profiles`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setProfiles(data.data);
          setProfileSource(data.source);
        } else {
          setProfileError(data.error || 'Gagal memuat profil');
        }
      })
      .catch(() => setProfileError('Gagal memuat profil dari router'))
      .finally(() => setLoadingProfiles(false));
  }, [form.router_id]);

  const handleProfileChange = (profileName: string) => {
    const found = profiles.find(p => p.name === profileName);
    setForm(f => ({
      ...f,
      mikrotik_profile: profileName,
      duration: found?.validity && found.validity !== 'N/A' ? found.validity : f.duration,
      speed: found?.rateLimit && found.rateLimit !== 'N/A' ? found.rateLimit : f.speed,
    }));
  };

  const handleCopyLink = (id: number) => {
    navigator.clipboard.writeText(`${window.location.origin}/checkout/${id}`);
    setCopiedLink(id);
    toast.success('Link disalin!', `${window.location.origin}/checkout/${id}`);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const openAdd = () => {
    setEditPkg(null);
    setForm(emptyForm);
    setProfiles([]);
    setProfileSource(null);
    setShowModal(true);
  };

  const openEdit = (pkg: Package) => {
    setEditPkg(pkg);
    setForm({
      name: pkg.name,
      speed: pkg.speed,
      quota: pkg.quota,
      duration: pkg.duration,
      price: String(pkg.price),
      badge_color: pkg.badge_color,
      router_id: pkg.router_id ? String(pkg.router_id) : '',
      mikrotik_profile: pkg.mikrotik_profile || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditPkg(null);
    setForm(emptyForm);
    setProfiles([]);
    setProfileSource(null);
    setProfileError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        name: form.name,
        speed: form.speed,
        quota: form.quota,
        duration: form.duration,
        price: parseFloat(form.price),
        badge_color: form.badge_color,
        router_id: form.router_id ? parseInt(form.router_id) : null,
        mikrotik_profile: form.mikrotik_profile || null,
      };
      if (editPkg) {
        await updatePackage(editPkg.id, data);
        toast.success('Paket diperbarui!', `${data.name} berhasil disimpan.`);
      } else {
        await addPackage(data);
        toast.success('Paket ditambahkan!', `${data.name} siap digunakan.`);
      }
      closeModal();
    } catch {
      toast.error('Gagal menyimpan paket', 'Coba lagi atau periksa koneksi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg: Package) => {
    const ok = await toast.confirm(
      'Hapus Paket?',
      `Paket "${pkg.name}" akan dihapus permanen. Transaksi yang sudah ada tidak terpengaruh.`,
      { confirmText: 'Ya, Hapus', cancelText: 'Batal', danger: true }
    );
    if (ok) {
      await deletePackage(pkg.id);
      toast.success('Paket dihapus', `"${pkg.name}" berhasil dihapus.`);
    }
  };

  const selectedProfile = profiles.find(p => p.name === form.mikrotik_profile);

  return (
    <div className="space-y-5 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-800 mb-0.5">Paket Voucher</h1>
          <p className="text-slate-500 text-[13px] font-medium">{packages.length} paket tersedia</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-sky-500 hover:bg-sky-600 active:scale-95 text-white px-4 py-2.5 rounded-[16px] text-[13px] font-semibold flex items-center gap-1.5 transition-all shadow-[0_8px_20px_rgba(14,165,233,0.3)]"
        >
          <Plus className="w-4 h-4" strokeWidth={2} /> Tambah
        </button>
      </div>

      {packages.length === 0 && (
        <EmptyState
          icon={Wifi}
          title="Belum ada paket"
          description="Tambah paket voucher pertama Anda."
        />
      )}

      <div className="grid grid-cols-1 gap-4">
        {packages.map((pkg, idx) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="glass-strong rounded-[24px] p-5 relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-full h-[3px] ${COLORS.find(c => c.value === pkg.badge_color)?.cls || 'bg-sky-500'}`} />

            <div className="flex justify-between items-start mb-3 mt-1">
              <div className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-slate-100 text-slate-600">
                {BADGE_LABEL[pkg.badge_color] || 'Standar'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyLink(pkg.id)}
                  title="Salin link publik untuk hotspot"
                  className="w-7 h-7 flex items-center justify-center rounded-[10px] bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                >
                  {copiedLink === pkg.id ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : <LinkIcon className="w-3.5 h-3.5" strokeWidth={2} />}
                </button>
                <button
                  onClick={() => openEdit(pkg)}
                  className="w-7 h-7 flex items-center justify-center rounded-[10px] bg-white border border-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <button
                  onClick={() => handleDelete(pkg)}
                  className="w-7 h-7 flex items-center justify-center rounded-[10px] bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>

            <h3 className="text-[17px] font-bold text-slate-800 mb-0.5">{pkg.name}</h3>
            {pkg.mikrotik_profile && (
              <p className="text-[11px] text-sky-600 font-medium mb-2 flex items-center gap-1">
                <Router className="w-3 h-3" strokeWidth={2} /> Profil: {pkg.mikrotik_profile}
              </p>
            )}
            <div className="text-[28px] font-bold text-slate-800 mb-4 tracking-tight">
              {formatRupiah(pkg.price)}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-white border border-slate-100 text-slate-500 text-[11px] font-semibold px-2.5 py-1.5 rounded-[10px]">
                <Clock className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} /> {pkg.duration}
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-slate-100 text-slate-500 text-[11px] font-semibold px-2.5 py-1.5 rounded-[10px]">
                <Zap className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} /> {pkg.speed}
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-slate-100 text-slate-500 text-[11px] font-semibold px-2.5 py-1.5 rounded-[10px]">
                <Wifi className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} /> {pkg.quota}
              </div>
            </div>

            <div className="w-full py-2.5 border border-slate-100 bg-white text-slate-400 font-medium rounded-[14px] flex items-center justify-center gap-2 text-[12px]">
              <LinkIcon className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="truncate text-[11px]">{window.location.origin}/checkout/{pkg.id}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {createPortal(
        <AnimatePresence>
        {showModal && (
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
              transition={{ type: 'spring', bounce: 0, duration: 0.38 }}
              className="w-full max-w-md glass-strong rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />
              <button onClick={closeModal} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-white border border-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
              <h3 className="text-[20px] font-bold text-slate-800 mb-5">{editPkg ? 'Edit Paket' : 'Tambah Paket Baru'}</h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Nama Paket</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Harian Hemat"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Router (Opsional — untuk auto-isi dari Mikrotik)
                  </label>
                  <select
                    value={form.router_id}
                    onChange={e => setForm({ ...form, router_id: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 appearance-none"
                  >
                    <option value="">— Tanpa Router —</option>
                    {routers.map(r => (
                      <option value={r.id} key={r.id}>
                        {r.name} ({r.ip_address})
                      </option>
                    ))}
                  </select>
                </div>

                {form.router_id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-slate-600">
                        Profil Hotspot Mikrotik
                      </label>
                      {loadingProfiles && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                      {profileSource === 'mikrotik' && (
                        <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-bold">LIVE</span>
                      )}
                      {profileSource === 'demo' && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">DEMO</span>
                      )}
                    </div>
                    {profileError && (
                      <div className="flex items-center gap-2 text-[12px] text-rose-600 bg-rose-50 rounded-[10px] p-2.5 mb-2 border border-rose-100">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} /> {profileError}
                      </div>
                    )}
                    <select
                      value={form.mikrotik_profile}
                      onChange={e => handleProfileChange(e.target.value)}
                      disabled={loadingProfiles || profiles.length === 0}
                      className={`w-full rounded-2xl px-4 py-3 text-slate-800 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-200 appearance-none transition-colors ${profileSource === 'mikrotik' ? 'bg-sky-50 border border-sky-200 focus:border-sky-300' : 'bg-white border border-slate-200 focus:border-sky-300'}`}
                    >
                      <option value="">
                        {loadingProfiles ? 'Mengambil profil dari router...' : 'Pilih Profil...'}
                      </option>
                      {profiles.map(p => (
                        <option value={p.name} key={p.id}>
                          {p.name} — {p.validity} — {p.rateLimit}
                        </option>
                      ))}
                    </select>
                    {selectedProfile && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[11px] bg-sky-50 text-sky-600 px-2 py-1 rounded-[8px] border border-sky-100 font-semibold">
                          ⏱ {selectedProfile.validity}
                        </span>
                        <span className="text-[11px] bg-white text-slate-500 px-2 py-1 rounded-[8px] border border-slate-100 font-semibold">
                          ⚡ {selectedProfile.rateLimit}
                        </span>
                        <span className="text-[11px] bg-white text-slate-500 px-2 py-1 rounded-[8px] border border-slate-100 font-semibold">
                          👥 ×{selectedProfile.sharedUsers}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">↑ Durasi & Kecepatan diisi otomatis</span>
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Kecepatan</label>
                    <input
                      type="text"
                      value={form.speed}
                      onChange={e => setForm({ ...form, speed: e.target.value })}
                      placeholder="e.g. 10 Mbps"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Durasi</label>
                    <input
                      type="text"
                      value={form.duration}
                      onChange={e => setForm({ ...form, duration: e.target.value })}
                      placeholder="e.g. 1 Hari"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Kuota</label>
                    <input
                      type="text"
                      value={form.quota}
                      onChange={e => setForm({ ...form, quota: e.target.value })}
                      placeholder="e.g. Unlimited"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Harga (Rp)</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={e => setForm({ ...form, price: e.target.value })}
                      placeholder="5000"
                      min="0"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Warna Badge</label>
                  <div className="flex gap-2.5">
                    {COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm({ ...form, badge_color: c.value })}
                        className={`w-8 h-8 rounded-full ${c.cls} transition-all ${form.badge_color === c.value ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-white scale-110' : 'opacity-50 hover:opacity-75'}`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 active:scale-95 transition-all text-white font-semibold py-4 rounded-[16px] mt-2 text-[15px] shadow-[0_8px_20px_rgba(14,165,233,0.3)]"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...
                    </span>
                  ) : editPkg ? 'Simpan Perubahan' : 'Tambah Paket'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
