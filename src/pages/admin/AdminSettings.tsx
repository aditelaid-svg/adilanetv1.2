import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Settings2, Shield, Bell, Key, UserCog, Check, Copy, Ticket, Wifi, MessageCircle } from 'lucide-react';
import { useAppContext } from '../../AppContext';
import { useToast } from '../../components/Toast';
import QiospayReconciliation from './QiospayReconciliation';

export default function AdminSettings() {
  const { currentUser, updateUser } = useAppContext();
  const toast = useToast();

  const [qiospayMerchantCode, setQiospayMerchantCode] = useState('');
  const [qiospayQrString, setQiospayQrString] = useState('');
  const [qiospayApiKey, setQiospayApiKey] = useState('');
  const [qiospayApiKeyConfigured, setQiospayApiKeyConfigured] = useState(false);
  const [qiospayCallbackToken, setQiospayCallbackToken] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [qrisEnabled, setQrisEnabled] = useState(true);

  const [voucherCharset, setVoucherCharset] = useState('alphanumeric');
  const [voucherLength, setVoucherLength] = useState(8);
  const [voucherPrefix, setVoucherPrefix] = useState('WFI-');

  const [hotspotLoginUrl, setHotspotLoginUrl] = useState('');

  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  const [adminPassword, setAdminPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [callbackCopied, setCallbackCopied] = useState(false);

  const qiospayCallbackUrl = typeof window !== 'undefined' && qiospayCallbackToken
    ? `${window.location.origin}/api/webhook/qiospay/${qiospayCallbackToken}`
    : '';

  const fetchSettings = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${baseUrl}/api/settings`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) throw new Error(json.error || 'Gagal memuat pengaturan.');
      const settings = json.data;
      setQiospayMerchantCode(settings.qiospayMerchantCode || '');
      setQiospayQrString(settings.qiospayQrString || '');
      // Never populate the password field with a saved Qiospay API key.
      setQiospayApiKeyConfigured(Boolean(settings.qiospayApiKeyConfigured));
      setQiospayCallbackToken(settings.qiospayCallbackToken || '');
      setTelegramToken(settings.telegramToken || '');
      setTelegramChatId(settings.telegramChatId || '');
      setQrisEnabled(settings.qrisEnabled ?? true);
      setVoucherCharset(settings.voucherCharset || 'alphanumeric');
      setVoucherLength(settings.voucherLength || 8);
      setVoucherPrefix(settings.voucherPrefix ?? 'WFI-');
      setHotspotLoginUrl(settings.hotspotLoginUrl || '');
      setWhatsappNumber(settings.whatsappNumber || '');
      setWhatsappMessage(settings.whatsappMessage ?? '');
    } catch (err) {
      toast.error('Gagal memuat pengaturan', err instanceof Error ? err.message : 'Periksa koneksi server.');
    }
  };

  useEffect(() => { void fetchSettings(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${baseUrl}/api/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                qiospayMerchantCode,
                qiospayQrString,
                qiospayApiKey,
                telegramToken: telegramToken,
                telegramChatId: telegramChatId,
                qrisEnabled: qrisEnabled,
                voucherCharset: voucherCharset,
                voucherLength: voucherLength,
                voucherPrefix: voucherPrefix,
                hotspotLoginUrl: hotspotLoginUrl,
                whatsappNumber: whatsappNumber,
                whatsappMessage: whatsappMessage
            })
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menyimpan pengaturan.');
        if (json.success) {
            setQiospayApiKey('');
            await fetchSettings();
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        }
    } catch (err) {
        toast.error('Gagal menyimpan pengaturan', err instanceof Error ? err.message : 'Periksa koneksi server.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !adminPassword) return;
    updateUser(currentUser.id, { password: adminPassword });
    setPasswordSaved(true);
    setAdminPassword('');
    setTimeout(() => setPasswordSaved(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-800 mb-1">Setelan</h1>
          <p className="text-[13px] font-medium text-slate-500">Konfigurasi sistem & keamanan</p>
        </div>
        <div className="w-12 h-12 glass-pill text-sky-600 rounded-[16px] flex items-center justify-center">
          <Settings2 className="w-6 h-6" strokeWidth={1.8} />
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-[24px] p-5"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[12px] bg-amber-100 text-amber-600 flex items-center justify-center">
            <UserCog className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <h2 className="font-semibold text-[15px] text-slate-800">Keamanan Admin</h2>
        </div>
        
        <form onSubmit={handleSavePassword} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-slate-600 mb-2">Ubah Password Admin</label>
            <div className="relative">
              <input
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Masukkan password baru"
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-colors"
                required
              />
              <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 active:scale-95 font-semibold flex items-center justify-center gap-2 transition-all text-[15px] py-3.5 rounded-[16px]"
          >
            {passwordSaved ? 'Berhasil Disimpan' : 'Simpan Password'}
          </button>
        </form>
      </motion.div>

      <form onSubmit={handleSave} className="space-y-5">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-strong rounded-[24px] p-5"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-[12px] bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
                <h2 className="font-semibold text-[15px] text-slate-800">Payment Gateway (QRIS)</h2>
            </div>
            <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={qrisEnabled} onChange={(e) => setQrisEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                </label>
            </div>
          </div>
          
          <div className={`space-y-4 transition-opacity ${!qrisEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">Penyedia QRIS aktif</label>
              <div className="bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3.5 text-sky-700 text-[15px] font-semibold">
                Qiospay · QRIS statis + nominal unik
              </div>
            </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Merchant Code Qiospay</label>
                <input type="text" value={qiospayMerchantCode} onChange={e => setQiospayMerchantCode(e.target.value)} placeholder="Kode merchant Qiospay" className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-200" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">QRIS statis (payload/string QR)</label>
                <textarea value={qiospayQrString} onChange={e => setQiospayQrString(e.target.value)} rows={3} placeholder="Tempel payload QRIS statis" className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-sky-200 resize-y" />
                <p className="text-[11px] text-slate-400 mt-1.5">Gunakan QRIS statis dari akun khusus penerimaan pembayaran. Nominal harus dimasukkan manual oleh pembeli.</p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">API Key Qiospay</label>
                <div className="relative">
                  <input type="password" autoComplete="new-password" value={qiospayApiKey} onChange={e => setQiospayApiKey(e.target.value)} placeholder={qiospayApiKeyConfigured ? 'Tersimpan — kosongkan untuk mempertahankan' : 'Masukkan API Key Qiospay'} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 pr-11 text-slate-800 placeholder-slate-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-200" />
                  <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
                <p className={`text-[11px] mt-1.5 font-medium ${qiospayApiKeyConfigured ? 'text-teal-700' : 'text-amber-700'}`}>
                  {qiospayApiKeyConfigured ? 'API Key sudah dikonfigurasi. Nilai rahasia tidak ditampilkan.' : 'API Key belum dikonfigurasi.'}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-[16px] p-4 space-y-2">
                <p className="text-[12px] font-semibold text-amber-800">Catatan penting QRIS statis</p>
                <ul className="text-[11px] text-amber-900/80 space-y-1 list-disc list-inside">
                  <li>Gunakan akun QRIS khusus agar mutasi mudah direkonsiliasi.</li>
                  <li>Nominal unik Rp1–Rp999 ditambahkan ke total tagihan, bukan otomatis dikembalikan.</li>
                  <li>Reservasi nominal tidak dipakai ulang; jika pool per harga habis, transaksi ditolak.</li>
                  <li>QR statis tidak memiliki kedaluwarsa jarak jauh; batas waktu hanya untuk reservasi pembayaran.</li>
                  <li>Ganti API Key yang pernah terpapar dan jangan membagikannya.</li>
                  <li>Perubahan konfigurasi ditolak selama masih ada transaksi belum terselesaikan.</li>
                </ul>
              </div>
              <div className="bg-sky-50 border border-sky-100 rounded-[16px] p-4">
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">URL Callback resmi Qiospay</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-slate-200 rounded-[10px] px-3 py-2 text-[11px] text-slate-600 font-mono break-all">
                    {qiospayCallbackToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/qiospay/••••••••` : 'Tersedia setelah konfigurasi berhasil disimpan'}
                  </code>
                  <button type="button" disabled={!qiospayCallbackUrl} onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(qiospayCallbackUrl);
                      setCallbackCopied(true);
                      window.setTimeout(() => setCallbackCopied(false), 2000);
                    } catch {
                      toast.error('Gagal menyalin URL callback', 'Salin URL dengan aman dari browser.');
                    }
                  }} aria-label="Salin URL callback Qiospay" className="shrink-0 w-9 h-9 bg-sky-100 hover:bg-sky-200 disabled:opacity-40 rounded-[10px] flex items-center justify-center text-sky-600">
                    {callbackCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Token callback disamarkan di layar. Tombol salin menyalin URL lengkap khusus admin.</p>
              </div>
          </div>
        </motion.div>

        <QiospayReconciliation />

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-strong rounded-[24px] p-5"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-[12px] bg-teal-100 text-teal-600 flex items-center justify-center">
              <Ticket className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <h2 className="font-semibold text-[15px] text-slate-800">Format Kode Voucher</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">Tipe Karakter</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'alphanumeric', l: 'Huruf + Angka' },
                  { v: 'numeric', l: 'Angka Saja' },
                  { v: 'alpha', l: 'Huruf Saja' },
                ].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setVoucherCharset(opt.v)}
                    className={`py-3 rounded-[14px] text-[13px] font-semibold border transition-colors ${
                      voucherCharset === opt.v
                        ? 'bg-teal-50 border-teal-200 text-teal-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Panjang Kode</label>
                <input
                  type="number"
                  min={4}
                  max={20}
                  value={voucherLength}
                  onChange={e => setVoucherLength(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 text-[15px] focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">4–20 karakter (di luar prefix)</p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Prefix / Awalan</label>
                <input
                  type="text"
                  value={voucherPrefix}
                  onChange={e => setVoucherPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10))}
                  placeholder="(kosongkan jika tanpa awalan)"
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-[15px] font-mono focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">Mis. WFI- atau kosong</p>
              </div>
            </div>

            <div className="bg-teal-50 border border-teal-100 rounded-[16px] p-4">
              <p className="text-[11px] font-medium text-slate-500 mb-1.5">Contoh Hasil</p>
              <code className="text-[16px] text-teal-700 font-mono font-bold break-all">
                {(() => {
                  const NUM = '0123456789';
                  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                  const rep = voucherCharset === 'numeric' ? NUM : voucherCharset === 'alpha' ? ALPHA : 'A1B2C3D4E5F6G7H8J9K0';
                  const n = Math.min(Math.max(Number(voucherLength) || 8, 4), 20);
                  const body = Array.from({ length: n }, (_, i) => rep[i % rep.length]).join('');
                  return `${voucherPrefix}${body}`;
                })()}
              </code>
              <p className="text-[11px] text-slate-400 mt-2">Username & password Mikrotik memakai kode yang sama.</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="glass-strong rounded-[24px] p-5"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-[12px] bg-teal-100 text-teal-600 flex items-center justify-center">
              <Wifi className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <h2 className="font-semibold text-[15px] text-slate-800">Login WiFi Otomatis</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">URL Login Hotspot</label>
              <input
                type="text"
                value={hotspotLoginUrl}
                onChange={e => setHotspotLoginUrl(e.target.value)}
                placeholder="http://10.5.50.1/login"
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-[15px] font-mono focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">Alamat halaman login hotspot Mikrotik (gateway), bukan IP API.</p>
            </div>

            <div className="bg-teal-50 border border-teal-100 rounded-[16px] p-4 space-y-1.5">
              <p className="text-[12px] font-semibold text-teal-700">Cara kerja</p>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Jika diisi, pelanggan yang membeli voucher dari aplikasi (sambil terhubung ke WiFi) akan melihat tombol <b>“Login WiFi Sekarang”</b> yang langsung menghubungkan mereka ke internet — tanpa ketik kode manual. Kosongkan untuk menyembunyikan tombol.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}
          className="glass-strong rounded-[24px] p-5"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-[12px] bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <h2 className="font-semibold text-[15px] text-slate-800">Pusat Bantuan (WhatsApp)</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">Nomor WhatsApp Admin</label>
              <input
                type="tel"
                inputMode="numeric"
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                placeholder="081234567890"
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-[15px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">Nomor tujuan saat pelanggan menekan tombol bantuan. Awalan 0 otomatis diubah ke 62.</p>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">Pesan Otomatis (opsional)</label>
              <textarea
                value={whatsappMessage}
                onChange={e => setWhatsappMessage(e.target.value)}
                placeholder="Halo Admin AdilaNet, saya butuh bantuan."
                rows={2}
                maxLength={300}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-[14px] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-colors resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">Teks yang sudah terisi otomatis di chat WhatsApp pelanggan.</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-[16px] p-4 space-y-1.5">
              <p className="text-[12px] font-semibold text-emerald-700">Cara kerja</p>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Menu <b>“Pusat Bantuan”</b> di halaman Profil pelanggan menampilkan halaman bantuan (FAQ) dengan tombol chat WhatsApp ke nomor ini. Jika nomor dikosongkan, tombol WhatsApp otomatis disembunyikan dan hanya FAQ yang tampil.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-strong rounded-[24px] p-5"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-[12px] bg-sky-100 text-sky-600 flex items-center justify-center">
              <Bell className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <h2 className="font-semibold text-[15px] text-slate-800">Notifikasi Telegram</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">Bot Token</label>
              <input
                type="text"
                value={telegramToken}
                onChange={e => setTelegramToken(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sky-600 text-[15px] font-mono focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">Chat ID (Grup / Admin)</label>
              <input
                type="text"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sky-600 text-[15px] font-mono focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-colors"
              />
            </div>
          </div>
        </motion.div>
        
        <button 
          type="submit"
          disabled={isSaving}
          className={`w-full ${isSaved ? 'bg-teal-500 hover:bg-teal-500 shadow-[0_8px_20px_rgba(20,184,166,0.3)]' : 'bg-sky-500 hover:bg-sky-600 shadow-[0_8px_20px_rgba(14,165,233,0.3)]'} active:scale-95 text-white font-semibold flex items-center justify-center gap-2 transition-all text-[15px] py-4 rounded-[16px] disabled:opacity-50`}
        >
          {isSaved ? (
            <>
              <Check className="w-5 h-5" strokeWidth={1.8} /> Pengaturan Tersimpan
            </>
          ) : isSaving ? (
            'Menyimpan...'
          ) : (
            <>
              <Save className="w-5 h-5" strokeWidth={1.8} /> Simpan Pengaturan
            </>
          )}
        </button>
      </form>
    </div>
  );
}
