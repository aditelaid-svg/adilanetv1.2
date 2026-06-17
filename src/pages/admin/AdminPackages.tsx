import React, { useState } from 'react';
import { useAppContext, Package } from '../../AppContext';
import { Plus, Edit, Trash2, Clock, Zap, Wifi, Eye, Link as LinkIcon, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type PkgForm = {
  name: string;
  speed: string;
  quota: string;
  duration: string;
  price: string;
  badge_color: string;
};

const emptyForm: PkgForm = { name: '', speed: '', quota: 'Unlimited', duration: '', price: '', badge_color: 'blue' };

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Biru', cls: 'bg-blue-500' },
  { value: 'purple', label: 'Ungu', cls: 'bg-purple-500' },
  { value: 'cyan', label: 'Cyan', cls: 'bg-cyan-500' },
  { value: 'emerald', label: 'Hijau', cls: 'bg-emerald-500' },
  { value: 'orange', label: 'Oranye', cls: 'bg-orange-500' },
  { value: 'red', label: 'Merah', cls: 'bg-red-500' },
];

export default function AdminPackages() {
  const { packages, deletePackage, addPackage } = useAppContext();
  const [copiedLink, setCopiedLink] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg] = useState<Package | null>(null);
  const [form, setForm] = useState<PkgForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus paket ini?')) {
      await deletePackage(id);
    }
  };

  const handleCopyLink = (packageId: number) => {
    const url = `${window.location.origin}/checkout/${packageId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(packageId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const openAdd = () => {
    setEditPkg(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (pkg: Package) => {
    setEditPkg(pkg);
    setForm({ name: pkg.name, speed: pkg.speed, quota: pkg.quota, duration: pkg.duration, price: String(pkg.price), badge_color: pkg.badge_color });
    setShowModal(true);
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
      };
      if (editPkg) {
        // Edit not fully implemented yet — use add for now
        await addPackage(data);
      } else {
        await addPackage(data);
      }
      setShowModal(false);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const badges = ['Murah', 'Populer', 'Standar', 'Premium', 'Hemat', 'VIP'];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Paket Voucher</h1>
          <p className="text-white/50 text-[13px] font-medium">{packages.length} paket tersedia</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-[#0A84FF] hover:bg-[#0070e0] active:scale-95 text-white px-3.5 py-2 rounded-[14px] text-[13px] font-semibold flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {packages.map((pkg, idx) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white/[0.02] border border-white/5 rounded-[24px] p-5 relative overflow-hidden shadow-sm backdrop-blur-xl"
          >
            <div className="absolute top-0 left-0 w-full h-[3px] bg-[#0A84FF]" />

            <div className="flex justify-between items-start mb-2 mt-1">
              <div className="bg-[#0A84FF]/10 text-[#0A84FF] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {badges[idx] || 'Standar'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyLink(pkg.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#0A84FF]/10 text-[#0A84FF] hover:bg-[#0A84FF]/20 transition-colors"
                  title="Salin Link Publik"
                >
                  {copiedLink === pkg.id ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => openEdit(pkg)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-white/50 hover:text-white transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(pkg.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-white/50 hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h3 className="text-[17px] font-semibold text-white mb-0.5">{pkg.name}</h3>
            <div className="text-[28px] font-bold text-white mb-4 tracking-tight">
              Rp {pkg.price.toLocaleString('id-ID')}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-white/5 text-white/70 text-[11px] font-medium px-2 py-1 rounded-md border border-white/5">
                <Clock className="w-3.5 h-3.5" /> {pkg.duration}
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 text-white/70 text-[11px] font-medium px-2 py-1 rounded-md border border-white/5">
                <Zap className="w-3.5 h-3.5" /> {pkg.speed}
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 text-white/70 text-[11px] font-medium px-2 py-1 rounded-md border border-white/5">
                <Wifi className="w-3.5 h-3.5" /> {pkg.quota}
              </div>
            </div>

            <button className="w-full py-2.5 border border-[#34C759]/20 bg-[#34C759]/10 text-[#34C759] font-medium rounded-[14px] flex items-center justify-center gap-1.5 transition-colors text-[13px]">
              <Eye className="w-4 h-4" /> Aktif
            </button>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md bg-[#1C1C1E] border-t border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-[22px] font-bold text-white mb-6">{editPkg ? 'Edit Paket' : 'Tambah Paket Baru'}</h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-white/60 mb-1.5">Nama Paket</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Harian Hemat"
                    className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">Kecepatan</label>
                    <input
                      type="text"
                      value={form.speed}
                      onChange={e => setForm({ ...form, speed: e.target.value })}
                      placeholder="e.g. 10 Mbps"
                      className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">Durasi</label>
                    <input
                      type="text"
                      value={form.duration}
                      onChange={e => setForm({ ...form, duration: e.target.value })}
                      placeholder="e.g. 1 Hari"
                      className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">Kuota</label>
                    <input
                      type="text"
                      value={form.quota}
                      onChange={e => setForm({ ...form, quota: e.target.value })}
                      placeholder="e.g. Unlimited"
                      className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-white/60 mb-1.5">Harga (Rp)</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={e => setForm({ ...form, price: e.target.value })}
                      placeholder="e.g. 5000"
                      min="0"
                      className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-white/60 mb-2">Warna Badge</label>
                  <div className="flex gap-2">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm({ ...form, badge_color: c.value })}
                        className={`w-8 h-8 rounded-full ${c.cls} transition-all ${form.badge_color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1C1C1E]' : 'opacity-60'}`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#0A84FF] hover:bg-[#0070e0] disabled:opacity-50 active:scale-[0.98] transition-transform text-white font-semibold py-4 rounded-[16px] mt-4 text-[15px]"
                >
                  {saving ? 'Menyimpan...' : (editPkg ? 'Simpan Perubahan' : 'Tambah Paket')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
