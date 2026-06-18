import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import { ShieldCheck, ArrowRight, Phone, Wallet, Copy, Check, Info, Wifi, Clock, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PublicBuy() {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { packages } = useAppContext();

  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'input_phone' | 'qris' | 'success'>('input_phone');
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrisEnabled, setQrisEnabled] = useState(true);

  const pkg = packages.find(p => p.id === Number(packageId));

  useEffect(() => {
    if (packages.length > 0 && !pkg) navigate('/login');
  }, [pkg, packages, navigate]);

  useEffect(() => {
    fetch('/api/config/public')
      .then(r => r.json())
      .then(d => { if (d.success) setQrisEnabled(d.data.qrisEnabled ?? true); })
      .catch(() => {});
  }, []);

  if (!pkg) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone || phone.length < 10) {
      setError('Masukkan nomor HP yang valid (min 10 digit)');
      return;
    }
    setIsProcessing(true);
    try {
      const response = await fetch('/api/payment/create-qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: pkg.price, packageId: pkg.id, phone }),
      });
      const data = await response.json();
      if (data.success) {
        setQrisUrl(data.data.qr_url);
        setRefId(data.data.reference_id);
        setStep('qris');
      } else {
        setError(data.error || 'Gagal membuat transaksi. Coba lagi.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Poll payment status while the QRIS is shown. The voucher is only issued
  // server-side after SanPay confirms the payment via its signed webhook.
  useEffect(() => {
    if (step !== 'qris' || !refId) return;
    let active = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/payment/status/${refId}`);
        const d = await r.json();
        if (active && d.success && d.data.status === 'success' && d.data.voucher_code) {
          setSuccessCode(d.data.voucher_code);
          setStep('success');
        }
      } catch { /* ignore transient network errors while polling */ }
    };
    const id = setInterval(poll, 4000);
    poll();
    return () => { active = false; clearInterval(id); };
  }, [step, refId]);

  const copyCode = () => {
    if (successCode) {
      navigator.clipboard.writeText(successCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[500px] bg-[#0A84FF]/15 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-[#0A84FF] to-[#005bb5] flex items-center justify-center shadow-lg shadow-[#0A84FF]/30 mb-4">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-[20px] font-bold text-white tracking-tight">AdilaNet</h1>
          <p className="text-white/40 text-[12px] font-medium mt-0.5">Portal Voucher WiFi</p>
        </div>

        <div className="bg-[#1C1C1E]/90 backdrop-blur-2xl border border-white/8 rounded-[28px] p-5 shadow-2xl mb-4">
          <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-3">Paket Dipilih</p>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-white font-bold text-[16px] mb-2">{pkg.name}</h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-white/5 text-white/60 px-2 py-1 rounded-[8px] border border-white/5">
                  <Clock className="w-3 h-3" /> {pkg.duration}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-white/5 text-white/60 px-2 py-1 rounded-[8px] border border-white/5">
                  <Zap className="w-3 h-3" /> {pkg.speed}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-white/5 text-white/60 px-2 py-1 rounded-[8px] border border-white/5">
                  <Wifi className="w-3 h-3" /> {pkg.quota}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[22px] font-bold text-white tracking-tight">
                Rp {pkg.price.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1C1C1E]/90 backdrop-blur-2xl border border-white/8 rounded-[28px] p-5 shadow-2xl">
          <AnimatePresence mode="wait">
            {step === 'input_phone' && (
              <motion.form
                key="phone"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22 }}
                onSubmit={handleContinue}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[11px] font-bold tracking-widest uppercase text-white/40 mb-2">No. WhatsApp / HP</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="08xxxxxxxxxx"
                      className="w-full bg-white/[0.04] border border-white/8 rounded-[16px] pl-10 pr-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0A84FF]/50 transition-all text-[15px]"
                      required
                    />
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                  </div>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 mt-2 text-[12px] text-[#FF453A] bg-[#FF453A]/10 rounded-[10px] px-3 py-2 border border-[#FF453A]/15"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                  <p className="text-[11px] text-white/35 mt-2 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Kode voucher ditampilkan setelah bayar. Simpan untuk login WiFi.
                  </p>
                </div>

                {qrisEnabled ? (
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-[#0A84FF] disabled:opacity-50 hover:bg-[#0070e0] active:scale-[0.98] text-white font-semibold rounded-[16px] px-4 py-4 flex items-center justify-center gap-2 transition-transform text-[15px]"
                  >
                    {isProcessing ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses...</>
                    ) : (
                      <><ArrowRight className="w-4 h-4" /> Bayar dengan QRIS</>
                    )}
                  </button>
                ) : (
                  <div className="p-4 bg-[#FF453A]/10 border border-[#FF453A]/20 rounded-[16px] text-center">
                    <p className="font-semibold text-[13px] text-[#FF453A]">Pembayaran Sedang Maintenance</p>
                    <p className="text-[11px] text-white/40 mt-1">Hubungi admin untuk pembelian.</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full bg-transparent border border-white/8 active:bg-white/5 text-white/50 font-medium rounded-[16px] px-4 py-3.5 flex items-center justify-center gap-2 transition-all text-[13px]"
                >
                  <Wallet className="w-4 h-4" /> Punya akun? Login & bayar pakai saldo
                </button>
              </motion.form>
            )}

            {step === 'qris' && (
              <motion.div
                key="qris"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22 }}
                className="text-center"
              >
                <p className="text-[11px] font-bold tracking-widest uppercase text-white/40 mb-4">Scan QRIS untuk Bayar</p>

                <div className="bg-white p-4 rounded-[20px] inline-block mb-4 shadow-xl">
                  <div className="w-[180px] h-[180px] rounded-lg overflow-hidden relative bg-gray-100">
                    {qrisUrl && <img src={qrisUrl} alt="QRIS" className="w-full h-full object-contain" />}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 bg-white rounded-xl shadow border-2 border-gray-200 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-gray-700" />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[12px] text-white/40 font-mono mb-1">{refId}</p>
                <p className="text-[12px] text-white/50 mb-5">DANA · OVO · GoPay · ShopeePay · M-Banking</p>

                {error && (
                  <div className="flex items-center gap-2 text-[12px] text-[#FF453A] bg-[#FF453A]/10 rounded-[12px] px-3 py-2.5 mb-4 border border-[#FF453A]/15">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <div className="w-full flex items-center justify-center gap-2 bg-[#0A84FF]/10 border border-[#0A84FF]/20 text-[#0A84FF] font-semibold py-4 rounded-[16px] text-[14px] mb-2.5">
                  <div className="w-4 h-4 border-2 border-[#0A84FF]/30 border-t-[#0A84FF] rounded-full animate-spin" />
                  Menunggu pembayaran...
                </div>
                <p className="text-[11px] text-white/35 mb-2.5">
                  Voucher muncul otomatis setelah pembayaran terverifikasi. Jangan tutup halaman ini.
                </p>
                <button
                  onClick={() => { setStep('input_phone'); setError(null); setRefId(null); setQrisUrl(null); }}
                  className="w-full text-white/40 font-medium py-2.5 rounded-[14px] transition-all text-[13px] hover:text-white/60"
                >
                  Batal
                </button>
              </motion.div>
            )}

            {step === 'success' && successCode && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                className="text-center py-2"
              >
                <div className="w-16 h-16 bg-[#34C759]/15 rounded-full flex items-center justify-center mx-auto mb-5 relative">
                  <div className="absolute inset-0 bg-[#34C759]/20 rounded-full animate-ping" />
                  <Check className="w-8 h-8 text-[#34C759] relative z-10" />
                </div>
                <h3 className="text-[20px] font-bold text-white mb-1 tracking-tight">Pembayaran Berhasil!</h3>
                <p className="text-white/40 text-[13px] mb-6">Ini kode voucher WiFi Anda</p>

                <div className="bg-[#0A84FF]/8 border border-[#0A84FF]/20 rounded-[20px] p-5 mb-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-28 h-28 bg-[#0A84FF]/10 blur-[40px] rounded-full -mr-10 -mt-10" />
                  <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase mb-2">KODE VOUCHER</p>
                  <div className="flex items-center gap-3">
                    <code className="text-[22px] font-mono font-bold tracking-[0.15em] text-[#0A84FF] flex-1">
                      {successCode}
                    </code>
                    <button
                      onClick={copyCode}
                      className="w-10 h-10 bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 active:scale-95 rounded-[12px] flex items-center justify-center text-[#0A84FF] transition-all"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-[16px] p-4 text-left mb-5">
                  <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">Cara Pakai:</p>
                  <ol className="space-y-1.5 text-[12px] text-white/60">
                    <li className="flex items-start gap-2"><span className="text-[#0A84FF] font-bold shrink-0">1.</span>Buka halaman login WiFi di browser</li>
                    <li className="flex items-start gap-2"><span className="text-[#0A84FF] font-bold shrink-0">2.</span>Masukkan kode di atas sebagai Username &amp; Password</li>
                    <li className="flex items-start gap-2"><span className="text-[#0A84FF] font-bold shrink-0">3.</span>Klik Login — Internet siap digunakan! 🎉</li>
                  </ol>
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-white/[0.06] hover:bg-white/10 active:scale-[0.98] text-white/70 font-medium py-3.5 rounded-[16px] transition-all text-[13px]"
                >
                  Ke Halaman Utama
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
