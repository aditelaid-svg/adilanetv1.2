import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext, Promo, PromoInput } from '../../AppContext';
import { useToast } from '../../components/Toast';
import { Plus, Edit, Trash2, X, RefreshCw, Image as ImageIcon, Megaphone, Eye, EyeOff, Calendar, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PROMO_BG, PROMO_COLOR_OPTIONS, PROMO_ICON_OPTIONS, PromoIcon } from '../../lib/promoStyles';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

type PromoForm = {
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  badge: string;
  image_url: string;
  link_type: 'packages' | 'package' | 'external' | 'none';
  link_value: string;
  button_text: string;
  active: boolean;
  start_date: string;
  end_date: string;
  sort_order: string;
  show_on: 'home' | 'landing' | 'both';
};

const emptyForm: PromoForm = {
  title: '', subtitle: '', color: 'iris', icon: 'star', badge: '', image_url: '',
  link_type: 'packages', link_value: '', button_text: '', active: true,
  start_date: '', end_date: '', sort_order: '0', show_on: 'both',
};

const LINK_LABEL: Record<string, string> = {
  packages: 'Halaman Paket',
  package: 'Paket Tertentu',
  external: 'Link Eksternal',
  none: 'Tanpa Aksi',
};

const SHOW_LABEL: Record<string, string> = {
  both: 'Beranda + Landing',
  home: 'Beranda saja',
  landing: 'Landing saja',
};

async function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1000;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas tidak didukung'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('gambar tidak valid'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

export default function AdminPromos() {
  const { packages, refreshPromos } = useAppContext();
  const toast = useToast();

  const [list, setList] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPromo, setEditPromo] = useState<Promo | null>(null);
  const [form, setForm] = useState<PromoForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/promos', { credentials: 'include' }).then(r => r.json());
      if (res.success) setList(res.data);
    } catch {
      toast.error('Gagal memuat promo', 'Periksa koneksi.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openAdd = () => {
    setEditPromo(null);
    setForm({ ...emptyForm, sort_order: String(list.length + 1) });
    setShowModal(true);
  };

  const openEdit = (p: Promo) => {
    setEditPromo(p);
    setForm({
      title: p.title,
      subtitle: p.subtitle,
      color: p.color,
      icon: p.icon,
      badge: p.badge,
      image_url: p.image_url,
      link_type: p.link_type,
      link_value: p.link_value,
      button_text: p.button_text,
      active: p.active,
      start_date: p.start_date || '',
      end_date: p.end_date || '',
      sort_order: String(p.sort_order),
      show_on: p.show_on,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditPromo(null);
    setForm(emptyForm);
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('File bukan gambar', 'Pilih file gambar (JPG/PNG).');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setForm(f => ({ ...f, image_url: dataUrl }));
    } catch {
      toast.error('Gagal memproses gambar', 'Coba gambar lain.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const buildPayload = (): PromoInput => ({
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    color: form.color,
    icon: form.icon,
    badge: form.badge.trim(),
    image_url: form.image_url,
    link_type: form.link_type,
    link_value: form.link_type === 'package' ? form.link_value : (form.link_type === 'external' ? form.link_value.trim() : ''),
    button_text: form.button_text.trim(),
    active: form.active,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    sort_order: parseInt(form.sort_order, 10) || 0,
    show_on: form.show_on,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Judul wajib diisi', 'Beri judul untuk promo ini.');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const url = editPromo ? `/api/promos/${editPromo.id}` : '/api/promos';
      const method = editPromo ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error);
      toast.success(editPromo ? 'Promo diperbarui!' : 'Promo ditambahkan!', payload.title);
      closeModal();
      await fetchList();
      await refreshPromos();
    } catch (err: any) {
      toast.error('Gagal menyimpan', err?.message || 'Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Promo) => {
    try {
      const res = await fetch(`/api/promos/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...p, active: !p.active }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error);
      setList(prev => prev.map(x => x.id === p.id ? res.data : x));
      await refreshPromos();
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  const handleDelete = async (p: Promo) => {
    const ok = await toast.confirm('Hapus Promo?', `Banner "${p.title}" akan dihapus permanen.`, {
      confirmText: 'Ya, Hapus', cancelText: 'Batal', danger: true,
    });
    if (!ok) return;
    try {
      await fetch(`/api/promos/${p.id}`, { method: 'DELETE', credentials: 'include' });
      setList(prev => prev.filter(x => x.id !== p.id));
      await refreshPromos();
      toast.success('Promo dihapus', `"${p.title}" berhasil dihapus.`);
    } catch {
      toast.error('Gagal menghapus');
    }
  };

  const isScheduled = (p: Promo) => p.start_date || p.end_date;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-800 mb-0.5">Promo / Banner</h1>
          <p className="text-slate-500 text-[13px] font-medium">{list.length} banner</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-sky-500 hover:bg-sky-600 active:scale-95 text-white px-4 py-2.5 rounded-[16px] text-[13px] font-semibold flex items-center gap-1.5 transition-all shadow-[0_8px_20px_rgba(14,165,233,0.3)]"
        >
          <Plus className="w-4 h-4" strokeWidth={2} /> Tambah
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map(i => (
            <React.Fragment key={i}>
              <Skeleton className="h-28 rounded-[24px]" />
            </React.Fragment>
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Belum ada promo"
          description="Tambah banner promo pertama Anda."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {list.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`glass-strong rounded-[24px] p-4 relative overflow-hidden ${!p.active ? 'opacity-60' : ''}`}
            >
              <div className="flex gap-3">
                {/* preview */}
                <div className={`w-24 h-24 shrink-0 rounded-[18px] relative overflow-hidden flex flex-col justify-end p-2.5 ${p.image_url ? 'bg-slate-900' : PROMO_BG[p.color] || 'bg-iris'}`}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
                    : <div className="absolute -right-3 -top-4 w-14 h-14 bg-white/20 blur-xl rounded-full" />}
                  {!p.image_url && <PromoIcon name={p.icon} className="w-4 h-4 text-white mb-1 relative z-10" />}
                  {!p.image_url && <span className="text-white text-[11px] font-bold leading-tight relative z-10 line-clamp-2">{p.title}</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <h3 className="text-[15px] font-bold text-slate-800 truncate">{p.title}</h3>
                        {p.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wide">{p.badge}</span>}
                      </div>
                      {p.subtitle && <p className="text-[12px] text-slate-500 line-clamp-2 leading-snug">{p.subtitle}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 flex items-center gap-1">
                      <GripVertical className="w-2.5 h-2.5" />#{p.sort_order}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{LINK_LABEL[p.link_type]}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{SHOW_LABEL[p.show_on]}</span>
                    {isScheduled(p) && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {p.start_date || '…'} → {p.end_date || '…'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => toggleActive(p)}
                  className={`flex-1 py-2 rounded-[12px] text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${p.active ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                >
                  {p.active ? <><Eye className="w-3.5 h-3.5" strokeWidth={2} /> Aktif</> : <><EyeOff className="w-3.5 h-3.5" strokeWidth={2} /> Nonaktif</>}
                </button>
                <button
                  onClick={() => openEdit(p)}
                  className="w-9 flex items-center justify-center rounded-[12px] bg-white border border-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="w-9 flex items-center justify-center rounded-[12px] bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

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
              <h3 className="text-[20px] font-bold text-slate-800 mb-5">{editPromo ? 'Edit Promo' : 'Tambah Promo Baru'}</h3>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Live preview */}
                <div className={`rounded-[20px] h-28 relative overflow-hidden flex flex-col justify-end p-4 ${form.image_url ? 'bg-slate-900' : PROMO_BG[form.color] || 'bg-iris'}`}>
                  {form.image_url
                    ? <img src={form.image_url} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
                    : <div className="absolute -right-4 -top-8 w-24 h-24 bg-white/20 blur-xl rounded-full" />}
                  <div className="relative z-10">
                    {form.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/30 text-white uppercase tracking-wide inline-block mb-1">{form.badge}</span>}
                    {!form.image_url && <PromoIcon name={form.icon} className="w-4 h-4 text-white mb-1" />}
                    <h4 className="text-white font-bold text-[14px] leading-tight">{form.title || 'Judul Promo'}</h4>
                    {form.subtitle && <p className="text-white/85 text-[11px] font-medium leading-snug mt-0.5 line-clamp-1">{form.subtitle}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Judul</label>
                  <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Anti Buffering" maxLength={120}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Deskripsi (opsional)</label>
                  <input type="text" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="e.g. Streaming lancar tanpa putus" maxLength={200}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Badge (opsional)</label>
                    <input type="text" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="e.g. Promo" maxLength={40}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Urutan</label>
                    <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} min="0"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors" />
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Warna {form.image_url && <span className="font-normal text-slate-400">(dipakai bila tanpa gambar)</span>}</label>
                  <div className="flex gap-2.5 flex-wrap">
                    {PROMO_COLOR_OPTIONS.map(c => (
                      <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                        className={`w-8 h-8 rounded-full ${PROMO_BG[c]} transition-all ${form.color === c ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-white scale-110' : 'opacity-50 hover:opacity-75'}`} />
                    ))}
                  </div>
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Ikon</label>
                  <div className="flex gap-2 flex-wrap">
                    {PROMO_ICON_OPTIONS.map(ic => (
                      <button key={ic} type="button" onClick={() => setForm({ ...form, icon: ic })}
                        className={`w-9 h-9 rounded-[12px] flex items-center justify-center transition-all ${form.icon === ic ? 'bg-sky-500 text-white' : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
                        <PromoIcon name={ic} className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Gambar (opsional)</label>
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer bg-white border border-dashed border-slate-300 rounded-2xl px-4 py-3 text-slate-500 text-[13px] flex items-center justify-center gap-2 hover:border-sky-300 transition-colors">
                      {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" strokeWidth={2} />}
                      {uploading ? 'Memproses...' : form.image_url ? 'Ganti gambar' : 'Unggah gambar'}
                      <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                    </label>
                    {form.image_url && (
                      <button type="button" onClick={() => setForm({ ...form, image_url: '' })}
                        className="px-3 rounded-2xl bg-rose-50 text-rose-600 text-[13px] font-semibold hover:bg-rose-100 transition-colors">
                        Hapus
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">Gambar otomatis dikompres. Rasio lebar disarankan (mis. 16:9).</p>
                </div>

                {/* Link target */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Saat diklik</label>
                  <select value={form.link_type} onChange={e => setForm({ ...form, link_type: e.target.value as PromoForm['link_type'], link_value: '' })}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 appearance-none">
                    <option value="packages">Buka halaman Paket</option>
                    <option value="package">Buka paket tertentu</option>
                    <option value="external">Buka link eksternal (WhatsApp, dll)</option>
                    <option value="none">Tanpa aksi</option>
                  </select>
                </div>

                {form.link_type === 'package' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Pilih Paket</label>
                    <select value={form.link_value} onChange={e => setForm({ ...form, link_value: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 appearance-none">
                      <option value="">— Pilih paket —</option>
                      {packages.map(pk => <option key={pk.id} value={String(pk.id)}>{pk.name}</option>)}
                    </select>
                  </div>
                )}

                {form.link_type === 'external' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">URL</label>
                    <input type="text" value={form.link_value} onChange={e => setForm({ ...form, link_value: e.target.value })} placeholder="https://wa.me/628..."
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors" />
                  </div>
                )}

                {form.link_type !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Teks tombol (opsional)</label>
                    <input type="text" value={form.button_text} onChange={e => setForm({ ...form, button_text: e.target.value })} placeholder="e.g. Beli Sekarang" maxLength={40}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors" />
                  </div>
                )}

                {/* Schedule */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Mulai (opsional)</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-3 py-3 text-slate-800 text-[14px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Berakhir (opsional)</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-3 py-3 text-slate-800 text-[14px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors" />
                  </div>
                </div>

                {/* Show on */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Tampil di</label>
                  <select value={form.show_on} onChange={e => setForm({ ...form, show_on: e.target.value as PromoForm['show_on'] })}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 appearance-none">
                    <option value="both">Beranda + Landing page</option>
                    <option value="home">Beranda saja</option>
                    <option value="landing">Landing page saja</option>
                  </select>
                </div>

                {/* Active toggle */}
                <label className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 cursor-pointer">
                  <span className="text-[14px] font-medium text-slate-700">Aktifkan promo</span>
                  <button type="button" onClick={() => setForm({ ...form, active: !form.active })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${form.active ? 'bg-teal-500' : 'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${form.active ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </label>

                <button type="submit" disabled={saving}
                  className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 active:scale-95 transition-all text-white font-semibold py-4 rounded-[16px] mt-2 text-[15px] shadow-[0_8px_20px_rgba(14,165,233,0.3)]">
                  {saving
                    ? <span className="flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...</span>
                    : editPromo ? 'Simpan Perubahan' : 'Tambah Promo'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
