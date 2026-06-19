import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { User as UserIcon, LogOut, ChevronRight, Hash, Phone, Mail, KeyRound, ShieldAlert, X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

export default function UserProfile() {
  const { currentUser, logout, updateUser } = useAppContext();
  const navigate = useNavigate();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    await updateUser(currentUser.id, { password: newPassword });
    setSaving(false);
    setShowPasswordModal(false);
    setNewPassword('');
    showNotification('Password berhasil diubah', 'success');
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    await updateUser(currentUser.id, { pin: newPin });
    setSaving(false);
    setShowPinModal(false);
    setNewPin('');
    showNotification('PIN Transaksi berhasil diubah', 'success');
  };

  return (
    <div className="p-6 pb-24 pt-14 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-slate-800 mb-1">Profil</h1>
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-4 px-4 py-3 rounded-[16px] text-[13px] font-medium border ${notification.type === 'success' ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-5">
        <div className="glass-strong rounded-[28px] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/60">
            <h2 className="font-semibold text-[12px] tracking-wide uppercase text-slate-400">Informasi Akun</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-500">
                <Hash className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.8} />
                <span className="text-[15px] font-medium">ID Pelanggan</span>
              </div>
              <span className="text-slate-800 text-[15px] font-semibold">{`USR-${currentUser?.id.toString().padStart(4, '0')}`}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-500">
                <UserIcon className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.8} />
                <span className="text-[15px] font-medium">Nama</span>
              </div>
              <span className="text-slate-800 text-[15px] font-semibold">{currentUser?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-500">
                <Mail className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.8} />
                <span className="text-[15px] font-medium">Email</span>
              </div>
              <span className="text-slate-800 text-[14px] font-semibold text-right max-w-[180px] truncate">{currentUser?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-500">
                <Phone className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.8} />
                <span className="text-[15px] font-medium">No. HP</span>
              </div>
              <span className="text-slate-800 text-[15px] font-semibold">{currentUser?.phone_number || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-500">
                <ShieldAlert className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.8} />
                <span className="text-[15px] font-medium">PIN Transaksi</span>
              </div>
              <span className={`text-[13px] font-semibold px-2.5 py-1 rounded-full ${currentUser?.has_pin ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'}`}>
                {currentUser?.has_pin ? 'Aktif' : 'Belum Diatur'}
              </span>
            </div>
          </div>
        </div>

        <div className="glass rounded-[28px] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/60">
            <h2 className="font-semibold text-[12px] tracking-wide uppercase text-slate-400">Keamanan</h2>
          </div>
          <div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex justify-between items-center p-5 border-b border-slate-200/60 hover:bg-white/40 transition-colors active:bg-white/60"
            >
              <div className="flex items-center gap-3 text-slate-700">
                <KeyRound className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.8} />
                <span className="text-[15px] font-medium">Ubah Password</span>
              </div>
              <ChevronRight className="w-[18px] h-[18px] text-slate-300" />
            </button>
            <button
              onClick={() => setShowPinModal(true)}
              className="w-full flex justify-between items-center p-5 hover:bg-white/40 transition-colors active:bg-white/60"
            >
              <div className="flex items-center gap-3 text-slate-700">
                <ShieldAlert className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.8} />
                <span className="text-[15px] font-medium">PIN Transaksi {currentUser?.has_pin ? '(Ubah)' : '(Buat)'}</span>
              </div>
              <ChevronRight className="w-[18px] h-[18px] text-slate-300" />
            </button>
          </div>
        </div>

        <div className="glass rounded-[28px] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/60">
            <h2 className="font-semibold text-[12px] tracking-wide uppercase text-slate-400">Dukungan</h2>
          </div>
          <button
            onClick={() => navigate('/user/help')}
            className="w-full flex justify-between items-center p-5 hover:bg-white/40 transition-colors active:bg-white/60"
          >
            <div className="flex items-center gap-3 text-slate-700">
              <MessageCircle className="w-[18px] h-[18px] text-emerald-500" strokeWidth={1.8} />
              <span className="text-[15px] font-medium">Pusat Bantuan</span>
            </div>
            <ChevronRight className="w-[18px] h-[18px] text-slate-300" />
          </button>
        </div>

        <button
          onClick={logout}
          className="w-full bg-rose-50 hover:bg-rose-100 active:bg-rose-100 text-rose-600 font-semibold py-3.5 rounded-[18px] transition-all flex justify-center items-center gap-2 mt-4 text-[15px] border border-rose-100"
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
          Keluar
        </button>

        <div className="text-center pt-4 pb-4">
          <p className="text-slate-400 text-[11px] font-medium tracking-wide">AdilaNet v2.0 • Real Database</p>
        </div>
      </div>

      {/* Modals */}
      {createPortal(
        <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/30 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
              <button onClick={() => setShowPasswordModal(false)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white border border-slate-100 shadow-sm rounded-full text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-[22px] font-bold tracking-tight text-slate-800 mb-6">Ubah Password</h3>
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
                    required
                  />
                </div>
                <button type="submit" disabled={saving} className="w-full bg-sky-500 text-white shadow-[0_8px_20px_rgba(14,165,233,0.3)] disabled:opacity-50 active:scale-95 transition-transform font-semibold py-4 rounded-[18px] text-[15px]">
                  {saving ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showPinModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/30 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
              <button onClick={() => setShowPinModal(false)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white border border-slate-100 shadow-sm rounded-full text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-[22px] font-bold tracking-tight text-slate-800 mb-2">PIN Transaksi</h3>
              <p className="text-[13px] text-slate-500 mb-6">PIN 6 digit untuk verifikasi pembelian dengan saldo.</p>
              <form onSubmit={handleSavePin} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">PIN Baru (6 digit)</label>
                  <input
                    type="password"
                    maxLength={6}
                    inputMode="numeric"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Masukkan 6 digit angka"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-center font-mono tracking-[0.5em] text-[20px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
                    required
                  />
                </div>
                <button type="submit" disabled={newPin.length !== 6 || saving} className="w-full bg-sky-500 text-white shadow-[0_8px_20px_rgba(14,165,233,0.3)] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none active:scale-95 transition-transform font-semibold py-4 rounded-[18px] text-[15px]">
                  {saving ? 'Menyimpan...' : 'Simpan PIN'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
