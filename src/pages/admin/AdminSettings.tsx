import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Settings2, Shield, Bell, Key, UserCog, Check, Copy } from 'lucide-react';
import { useAppContext } from '../../AppContext';

export default function AdminSettings() {
  const { currentUser, updateUser } = useAppContext();

  const [qrisKey, setQrisKey] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [qrisEnabled, setQrisEnabled] = useState(true);

  const [adminPassword, setAdminPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [callbackCopied, setCallbackCopied] = useState(false);

  const callbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/sanpay`
    : '/api/webhook/sanpay';

  useEffect(() => {
    // Fetch settings from Database via Backend API
    const fetchSettings = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${baseUrl}/api/settings`);
        const json = await res.json();
        if (json.success && json.data) {
          setQrisKey(json.data.sanpayApiKey || '');
          setMerchantId(json.data.merchantId || '');
          setTelegramToken(json.data.telegramToken || '');
          setTelegramChatId(json.data.telegramChatId || '');
          setQrisEnabled(json.data.qrisEnabled ?? true);
        }
      } catch (err) {
        console.error("Gagal memuat setting:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${baseUrl}/api/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sanpayApiKey: qrisKey,
                merchantId: merchantId,
                telegramToken: telegramToken,
                telegramChatId: telegramChatId,
                qrisEnabled: qrisEnabled
            })
        });
        const json = await res.json();
        if (json.success) {
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        }
    } catch (err) {
        console.error(err);
        alert("Gagal menyimpan ke server");
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
          <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Setelan</h1>
          <p className="text-[13px] font-medium text-white/50">Konfigurasi sistem & keamanan</p>
        </div>
        <div className="w-12 h-12 bg-white/5 border border-white/10 text-white/80 rounded-[16px] flex items-center justify-center">
          <Settings2 className="w-6 h-6" />
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[24px] p-5 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[12px] bg-[#FF9500]/20 text-[#FF9500] flex items-center justify-center">
            <UserCog className="w-5 h-5" />
          </div>
          <h2 className="font-semibold text-[15px] text-white">Keamanan Admin</h2>
        </div>
        
        <form onSubmit={handleSavePassword} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold tracking-wide uppercase text-white/50 mb-2">Ubah Password Admin</label>
            <div className="relative">
              <input
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Masukkan password baru"
                className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#FF9500]/50 transition-colors"
                required
              />
              <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 hover:bg-[#FF9500]/20 active:scale-[0.98] font-semibold flex items-center justify-center gap-2 transition-transform text-[15px] py-3.5 rounded-[16px]"
          >
            {passwordSaved ? 'Berhasil Disimpan' : 'Simpan Password'}
          </button>
        </form>
      </motion.div>

      <form onSubmit={handleSave} className="space-y-5">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[24px] p-5 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-[12px] bg-[#5E5CE6]/20 text-[#5E5CE6] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <h2 className="font-semibold text-[15px] text-white">Payment Gateway (QRIS)</h2>
            </div>
            <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={qrisEnabled} onChange={(e) => setQrisEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#34C759]"></div>
                </label>
            </div>
          </div>
          
          <div className={`space-y-4 transition-opacity ${!qrisEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-[13px] font-semibold tracking-wide uppercase text-white/50 mb-2">Merchant Code (SanPay)</label>
              <input
                type="text"
                value={merchantId}
                onChange={e => setMerchantId(e.target.value)}
                placeholder="MC-xxxxxxxx"
                className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold tracking-wide uppercase text-white/50 mb-2">API Key (SanPay)</label>
              <div className="relative">
                <input
                  type="password"
                  value={qrisKey}
                  onChange={e => setQrisKey(e.target.value)}
                  placeholder="API Key dari dashboard SanPay"
                  className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50 transition-colors"
                />
                <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              </div>
            </div>

            <div className="bg-[#0A84FF]/8 border border-[#0A84FF]/20 rounded-[16px] p-4 space-y-2.5">
              <p className="text-[12px] font-semibold text-[#0A84FF]">Cara mengaktifkan QRIS produksi</p>
              <ol className="text-[12px] text-white/55 space-y-1.5 list-decimal list-inside">
                <li>Login ke dashboard SanPay, buka menu <b>Setting API</b>.</li>
                <li>Salin <b>Merchant Code</b> &amp; <b>API Key</b> ke kolom di atas, lalu simpan.</li>
                <li>Isi <b>URL Callback</b> di SanPay dengan alamat di bawah ini, lalu klik <b>Validasi URL</b>.</li>
                <li>Whitelist IP server SanPay: <span className="font-mono text-white/70">103.127.137.140</span>.</li>
                <li>Aktifkan toggle QRIS di atas. Setelah ini pembayaran QRIS langsung berjalan nyata.</li>
              </ol>
              <div className="pt-1">
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-white/40 mb-1.5">URL Callback</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/30 border border-white/10 rounded-[10px] px-3 py-2 text-[11px] text-white/70 font-mono break-all">
                    {callbackUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(callbackUrl); setCallbackCopied(true); setTimeout(() => setCallbackCopied(false), 2000); }}
                    className="shrink-0 w-9 h-9 bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 rounded-[10px] flex items-center justify-center text-[#0A84FF] transition-colors"
                  >
                    {callbackCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[24px] p-5 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-[12px] bg-[#0A84FF]/20 text-[#0A84FF] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-[15px] text-white">Notifikasi Telegram</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold tracking-wide uppercase text-white/50 mb-2">Bot Token</label>
              <input
                type="text"
                value={telegramToken}
                onChange={e => setTelegramToken(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-[#0A84FF] text-[15px] font-mono focus:outline-none focus:border-[#0A84FF]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold tracking-wide uppercase text-white/50 mb-2">Chat ID (Grup / Admin)</label>
              <input
                type="text"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/5 rounded-[16px] px-4 py-3.5 text-[#0A84FF] text-[15px] font-mono focus:outline-none focus:border-[#0A84FF]/50 transition-colors"
              />
            </div>
          </div>
        </motion.div>
        
        <button 
          type="submit"
          disabled={isSaving}
          className={`w-full ${isSaved ? 'bg-[#34C759] hover:bg-[#34C759]' : 'bg-[#0A84FF] hover:bg-[#0A84FF]/90'} active:scale-[0.98] text-white font-semibold flex items-center justify-center gap-2 transition-all text-[15px] py-4 rounded-[16px] disabled:opacity-50`}
        >
          {isSaved ? (
            <>
              <Check className="w-5 h-5" /> Pengaturan Tersimpan
            </>
          ) : isSaving ? (
            'Menyimpan...'
          ) : (
            <>
              <Save className="w-5 h-5" /> Simpan Pengaturan
            </>
          )}
        </button>
      </form>
    </div>
  );
}
