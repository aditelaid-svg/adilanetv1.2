import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { User as UserIcon, LogOut, ChevronRight, Hash, Phone, Mail, KeyRound, ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function UserProfile() {
  const { currentUser, logout, updateUser } = useAppContext();

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
    <div className="p-5 pb-24 mt-2 h-full overflow-y-auto">
      <div className="mb-6 pt-2">
        <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Profil</h1>
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-4 px-4 py-3 rounded-[16px] text-[13px] font-medium border ${notification.type === 'success' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-5">
        <div className="bg-surface border border-white/5 rounded-[24px] overflow-hidden shadow-sm">
          <div className="px-4 py-3.5 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-white font-semibold text-[13px] tracking-wide uppercase text-white/50">Informasi Akun</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-300">
                <Hash className="w-[18px] h-[18px] text-white/40" />
                <span className="text-[15px] font-medium">ID Pelanggan</span>
              </div>
              <span className="text-white/80 text-[15px] font-medium">{`USR-${currentUser?.id.toString().padStart(4, '0')}`}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-300">
                <UserIcon className="w-[18px] h-[18px] text-white/40" />
                <span className="text-[15px] font-medium">Nama</span>
              </div>
              <span className="text-white/80 text-[15px] font-medium">{currentUser?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-300">
                <Mail className="w-[18px] h-[18px] text-white/40" />
                <span className="text-[15px] font-medium">Email</span>
              </div>
              <span className="text-white/80 text-[14px] font-medium text-right max-w-[180px] truncate">{currentUser?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-300">
                <Phone className="w-[18px] h-[18px] text-white/40" />
                <span className="text-[15px] font-medium">No. HP</span>
              </div>
              <span className="text-white/80 text-[15px] font-medium">{currentUser?.phone_number || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-300">
                <ShieldAlert className="w-[18px] h-[18px] text-white/40" />
                <span className="text-[15px] font-medium">PIN Transaksi</span>
              </div>
              <span className={`text-[13px] font-semibold px-2 py-0.5 rounded ${currentUser?.has_pin ? 'bg-success/10 text-success' : 'bg-gold/10 text-gold'}`}>
                {currentUser?.has_pin ? 'Aktif' : 'Belum Diatur'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-white/5 rounded-[24px] overflow-hidden shadow-sm">
          <div className="px-4 py-3.5 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-white font-semibold text-[13px] tracking-wide uppercase text-white/50">Keamanan</h2>
          </div>
          <div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex justify-between items-center p-4 border-b border-white/5 hover:bg-white/5 transition-colors active:bg-white/10"
            >
              <div className="flex items-center gap-3 text-slate-300">
                <KeyRound className="w-[18px] h-[18px] text-white/40" />
                <span className="text-[15px] font-medium">Ubah Password</span>
              </div>
              <ChevronRight className="w-[18px] h-[18px] text-white/20" />
            </button>
            <button
              onClick={() => setShowPinModal(true)}
              className="w-full flex justify-between items-center p-4 hover:bg-white/5 transition-colors active:bg-white/10"
            >
              <div className="flex items-center gap-3 text-slate-300">
                <ShieldAlert className="w-[18px] h-[18px] text-white/40" />
                <span className="text-[15px] font-medium">PIN Transaksi {currentUser?.has_pin ? '(Ubah)' : '(Buat)'}</span>
              </div>
              <ChevronRight className="w-[18px] h-[18px] text-white/20" />
            </button>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full bg-danger/10 hover:bg-danger/20 active:bg-danger/30 text-danger font-medium py-3.5 rounded-[20px] transition-all flex justify-center items-center gap-2 mt-4 text-[15px]"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Keluar
        </button>

        <div className="text-center pt-4 pb-4">
          <p className="text-white/30 text-[11px] font-medium tracking-wide">AdilaNet v2.0 • Real Database</p>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md bg-surface rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative border-t border-white/10 sm:border-white/10"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
              <button onClick={() => setShowPasswordModal(false)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-[22px] font-bold text-white mb-6">Ubah Password</h3>
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-white/60 mb-1.5 uppercase tracking-wider">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="w-full bg-white/[0.03] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-brand/50"
                    required
                  />
                </div>
                <button type="submit" disabled={saving} className="w-full bg-brand disabled:opacity-50 hover:bg-brand/90 active:scale-[0.98] text-white font-semibold py-4 rounded-[16px] transition-transform text-[15px]">
                  {saving ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showPinModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md bg-surface rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative border-t border-white/10 sm:border-white/10"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
              <button onClick={() => setShowPinModal(false)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-[22px] font-bold text-white mb-2">PIN Transaksi</h3>
              <p className="text-[13px] text-white/50 mb-6">PIN 6 digit untuk verifikasi pembelian dengan saldo.</p>
              <form onSubmit={handleSavePin} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-white/60 mb-1.5 uppercase tracking-wider">PIN Baru (6 digit)</label>
                  <input
                    type="password"
                    maxLength={6}
                    inputMode="numeric"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Masukkan 6 digit angka"
                    className="w-full bg-white/[0.03] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-center font-mono tracking-[0.5em] text-[20px] focus:outline-none focus:border-brand/50"
                    required
                  />
                </div>
                <button type="submit" disabled={newPin.length !== 6 || saving} className="w-full bg-brand disabled:bg-white/5 disabled:text-white/30 hover:bg-brand/90 active:scale-[0.98] text-white font-semibold py-4 rounded-[16px] transition-transform text-[15px]">
                  {saving ? 'Menyimpan...' : 'Simpan PIN'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
