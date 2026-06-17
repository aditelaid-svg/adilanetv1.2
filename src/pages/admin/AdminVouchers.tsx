import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { Ticket, Plus, Printer, Settings2, RefreshCw, Wifi, Clock, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MikrotikProfile {
  id: string;
  name: string;
  sessionTimeout: string;
  sharedUsers: string;
  rateLimit: string;
}

export default function AdminVouchers() {
  const { routers } = useAppContext();
  const [showGenerate, setShowGenerate] = useState(false);

  const [selectedRouter, setSelectedRouter] = useState('');
  const [mikrotikProfile, setMikrotikProfile] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [codeFormat, setCodeFormat] = useState('alphanumeric');
  const [loginMode, setLoginMode] = useState('user_is_pass');
  const [quantity, setQuantity] = useState('10');

  const [profiles, setProfiles] = useState<MikrotikProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profileSource, setProfileSource] = useState<'mikrotik' | 'demo' | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [generatedCodes, setGeneratedCodes] = useState<{ user: string; pass: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch profiles from Mikrotik when router changes
  useEffect(() => {
    setMikrotikProfile('');
    setDuration('');
    setProfileError(null);
    setProfiles([]);
    setProfileSource(null);

    if (!selectedRouter) return;

    setLoadingProfiles(true);
    fetch(`/api/routers/${selectedRouter}/profiles`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setProfiles(data.data);
          setProfileSource(data.source);
        } else {
          setProfileError(data.error || 'Gagal memuat profil');
        }
      })
      .catch(() => setProfileError('Jaringan error saat memuat profil'))
      .finally(() => setLoadingProfiles(false));
  }, [selectedRouter]);

  // When profile changes, auto-fill duration from Mikrotik data
  const handleProfileChange = (profileName: string) => {
    setMikrotikProfile(profileName);
    const found = profiles.find(p => p.name === profileName);
    if (found && found.sessionTimeout && found.sessionTimeout !== 'Unlimited') {
      setDuration(found.sessionTimeout);
    } else if (found?.sessionTimeout === 'Unlimited') {
      setDuration('Unlimited');
    }
  };

  const generateRandomCode = (format: string) => {
    const chars = format === 'numbers' ? '0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouter || !mikrotikProfile || !price || !quantity) return;
    setIsGenerating(true);
    setTimeout(() => {
      const qty = parseInt(quantity);
      const codes = [];
      for (let i = 0; i < qty; i++) {
        const user = generateRandomCode(codeFormat);
        const pass = loginMode === 'user_is_pass' ? user : generateRandomCode(codeFormat);
        codes.push({ user, pass });
      }
      setGeneratedCodes(codes);
      setIsGenerating(false);
      setShowGenerate(false);
    }, 600);
  };

  const handlePrint = () => {
    const selectedProfileInfo = profiles.find(p => p.name === mikrotikProfile);
    const printContent = `
      <html><head><style>
        body { font-family: monospace; }
        h2 { text-align: center; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .card { border: 1px solid #ccc; padding: 8px; text-align: center; border-radius: 6px; }
        .code { font-size: 18px; font-weight: bold; }
        .info { font-size: 11px; color: #555; }
      </style></head><body>
        <h2>Voucher AdilaNet WiFi</h2>
        <p style="text-align:center;font-size:12px;">Profil: ${mikrotikProfile} | Durasi: ${duration || 'N/A'} | Harga: Rp ${parseInt(price).toLocaleString('id-ID')}</p>
        <div class="grid">
          ${generatedCodes.map(c => `<div class="card"><div class="code">${c.user}</div>${loginMode === 'separate' ? `<div class="info">Pass: ${c.pass}</div>` : ''}</div>`).join('')}
        </div>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(printContent); win.document.close(); win.print(); }
  };

  const selectedProfileInfo = profiles.find(p => p.name === mikrotikProfile);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Voucher Mikrotik</h1>
          <p className="text-sm text-white/50">Generate & cetak voucher hotspot</p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="bg-[#0A84FF] hover:bg-[#0070e0] active:scale-95 text-white px-4 py-2 rounded-[14px] text-sm font-bold flex items-center gap-2 shadow-lg shadow-[#0A84FF]/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Bikin
        </button>
      </div>

      {generatedCodes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-emerald-500/30 rounded-[24px] p-5 shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-emerald-400" />
                {generatedCodes.length} Voucher Dibuat
              </h3>
              <p className="text-[11px] text-white/40 mt-0.5">
                Profil: {mikrotikProfile} • {duration} • Rp {parseInt(price || '0').toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-[10px] text-white transition-colors" title="Cetak"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGeneratedCodes([])}
                className="bg-white/5 hover:bg-white/10 p-2 rounded-[10px] text-white/50 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {generatedCodes.map((code, idx) => (
              <div key={idx} className="bg-black/40 border border-white/10 rounded-[14px] px-3 py-2.5 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-sm text-[#0A84FF] font-bold tracking-wider">{code.user}</span>
                {loginMode === 'separate' && (
                  <span className="font-mono text-[10px] text-white/40 tracking-wider mt-0.5">Pass: {code.pass}</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="bg-white/[0.02] border border-white/5 rounded-[24px] p-5 shadow-sm">
        <h3 className="font-bold text-white mb-4">Cara Kerja Profil Mikrotik</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-[#0A84FF]/5 border border-[#0A84FF]/20 rounded-[16px] p-4">
            <Wifi className="w-5 h-5 text-[#0A84FF] shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-white mb-1">Profil Otomatis dari Router</p>
              <p className="text-[12px] text-white/50 leading-relaxed">
                Saat memilih router, sistem akan <span className="text-[#0A84FF]">otomatis mengambil profil</span> dari Mikrotik via API. 
                Durasi voucher diambil dari field <code className="bg-white/10 px-1 rounded">session-timeout</code> profil.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-[#FF9F0A]/5 border border-[#FF9F0A]/20 rounded-[16px] p-4">
            <Clock className="w-5 h-5 text-[#FF9F0A] shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-white mb-1">Demo Mode (Router Offline)</p>
              <p className="text-[12px] text-white/50 leading-relaxed">
                Jika router tidak terjangkau, sistem tampilkan profil demo agar tetap bisa generate voucher untuk persiapan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Modal */}
      <AnimatePresence>
        {showGenerate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md bg-[#1C1C1E] border-t border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative my-auto"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
              <button
                onClick={() => setShowGenerate(false)}
                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#0A84FF]/20 text-[#0A84FF] rounded-[12px] flex items-center justify-center">
                  <Settings2 className="w-5 h-5" />
                </div>
                <h3 className="text-[22px] font-bold text-white tracking-tight">Generate Voucher</h3>
              </div>

              <form onSubmit={handleGenerate} className="space-y-4">
                {/* Router Selection */}
                <div>
                  <label className="block text-[12px] font-semibold text-white/50 mb-1.5 uppercase tracking-wide">Pilih Router</label>
                  <select
                    value={selectedRouter}
                    onChange={e => setSelectedRouter(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-[14px] px-4 py-3 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50 appearance-none"
                    required
                  >
                    <option value="" disabled className="bg-[#1C1C1E] text-white/40">Pilih Router...</option>
                    {routers.map(r => (
                      <option value={r.id} key={r.id} className="bg-[#1C1C1E]">
                        {r.name} ({r.ip_address}) — {r.status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Profile Selection */}
                {selectedRouter && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wide">
                        Profil Hotspot
                      </label>
                      {loadingProfiles && <RefreshCw className="w-3.5 h-3.5 text-white/40 animate-spin" />}
                      {profileSource === 'mikrotik' && (
                        <span className="text-[10px] bg-[#34C759]/10 text-[#34C759] px-2 py-0.5 rounded font-semibold border border-[#34C759]/20">LIVE Mikrotik</span>
                      )}
                      {profileSource === 'demo' && (
                        <span className="text-[10px] bg-[#FF9F0A]/10 text-[#FF9F0A] px-2 py-0.5 rounded font-semibold border border-[#FF9F0A]/20">Demo Mode</span>
                      )}
                    </div>
                    {profileError && (
                      <div className="flex items-center gap-2 text-[12px] text-[#FF453A] bg-[#FF453A]/10 rounded-[12px] p-3 mb-2 border border-[#FF453A]/20">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {profileError}
                      </div>
                    )}
                    <select
                      value={mikrotikProfile}
                      onChange={e => handleProfileChange(e.target.value)}
                      className={`w-full rounded-[14px] px-4 py-3 text-white text-[15px] focus:outline-none appearance-none ${profileSource === 'mikrotik' ? 'bg-[#0A84FF]/5 border border-[#0A84FF]/30 focus:border-[#0A84FF]' : 'bg-white/[0.03] border border-white/5 focus:border-[#0A84FF]/50'}`}
                      required
                      disabled={loadingProfiles || profiles.length === 0}
                    >
                      <option value="" disabled className="bg-[#1C1C1E] text-white/40">
                        {loadingProfiles ? 'Memuat profil dari router...' : 'Pilih Profil...'}
                      </option>
                      {profiles.map(p => (
                        <option value={p.name} key={p.id} className="bg-[#1C1C1E]">
                          {p.name} — {p.sessionTimeout} — {p.rateLimit}
                        </option>
                      ))}
                    </select>
                    {selectedProfileInfo && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="text-[11px] bg-[#0A84FF]/10 text-[#0A84FF] px-2 py-1 rounded-[8px] border border-[#0A84FF]/20 font-semibold">
                          ⏱ {selectedProfileInfo.sessionTimeout}
                        </span>
                        <span className="text-[11px] bg-white/5 text-white/60 px-2 py-1 rounded-[8px] border border-white/10 font-semibold">
                          ⚡ {selectedProfileInfo.rateLimit}
                        </span>
                        <span className="text-[11px] bg-white/5 text-white/60 px-2 py-1 rounded-[8px] border border-white/10 font-semibold">
                          👤 ×{selectedProfileInfo.sharedUsers}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Price & Duration */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[12px] font-semibold text-white/50 mb-1.5 uppercase tracking-wide">Harga Jual (Rp)</label>
                    <input
                      type="number"
                      placeholder="5000"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-[14px] px-4 py-3 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[12px] font-semibold text-white/50 mb-1.5 uppercase tracking-wide">Durasi</label>
                    <input
                      type="text"
                      placeholder="Auto dari profil"
                      value={duration}
                      onChange={e => setDuration(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-[14px] px-4 py-3 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                    />
                  </div>
                </div>

                {/* Format & Login Mode */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[12px] font-semibold text-white/50 mb-1.5 uppercase tracking-wide">Format Kode</label>
                    <select
                      value={codeFormat}
                      onChange={e => setCodeFormat(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-[14px] px-4 py-3 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                    >
                      <option value="alphanumeric" className="bg-[#1C1C1E]">A-Z + 0-9</option>
                      <option value="numbers" className="bg-[#1C1C1E]">Angka Saja</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[12px] font-semibold text-white/50 mb-1.5 uppercase tracking-wide">Mode Login</label>
                    <select
                      value={loginMode}
                      onChange={e => setLoginMode(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-[14px] px-4 py-3 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                    >
                      <option value="user_is_pass" className="bg-[#1C1C1E]">User = Pass</option>
                      <option value="separate" className="bg-[#1C1C1E]">User ≠ Pass</option>
                    </select>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-[12px] font-semibold text-white/50 mb-1.5 uppercase tracking-wide">Jumlah Voucher</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-[14px] px-4 py-3 text-white text-[15px] focus:outline-none focus:border-[#0A84FF]/50"
                    required
                  />
                  <div className="flex gap-2 mt-2">
                    {[10, 25, 50, 100].map(n => (
                      <button
                        key={n} type="button" onClick={() => setQuantity(String(n))}
                        className={`flex-1 py-1.5 rounded-[10px] text-[11px] font-semibold transition-colors ${quantity === String(n) ? 'bg-[#0A84FF] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                      >{n}</button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating || !mikrotikProfile}
                  className="w-full bg-[#0A84FF] disabled:opacity-50 hover:bg-[#0070e0] active:scale-[0.98] text-white font-bold py-4 rounded-[16px] mt-2 flex items-center justify-center gap-2 transition-transform text-[15px]"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> Membuat...
                    </>
                  ) : (
                    <>
                      <Ticket className="w-5 h-5" /> Buat {quantity} Voucher
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
