import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import { ShieldCheck, ArrowRight, Phone, Wallet, Copy, Check, Info, Wifi, Clock, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatRupiah } from '../lib/format';

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

  if (!pkg) return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="coastal-bg fixed inset-0">
        <div className="coastal-glow coastal-glow-1" />
        <div className="coastal-glow coastal-glow-2" />
        <div className="coastal-glow coastal-glow-3" />
      </div>
      <div className="relative z-10 w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
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
        body: JSON.stringify({ packageId: pkg.id, phone }),
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

  const copyCode = () => {
    if (successCode) {
      navigator.clipboard.writeText(successCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <div className="coastal-bg fixed inset-0">
        <div className="coastal-glow coastal-glow-1" />
        <div className="coastal-glow coastal-glow-2" />
        <div className="coastal-glow coastal-glow-3" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-[18px] bg-white flex items-center justify-center shadow-[0_8px_20px_rgba(14,165,233,0.25)] ring-1 ring-sky-100 mb-4 p-2">
            <img src="/logo.png" alt="AdilaNet" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-[20px] font-bold text-slate-800 tracking-tight">AdilaNet</h1>
          <p className="text-slate-500 text-[12px] font-medium mt-0.5">Portal Voucher WiFi</p>
        </div>

        <div className="glass-strong rounded-[28px] p-5 mb-4">
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3">Paket Dipilih</p>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-slate-800 font-bold text-[16px] mb-2">{pkg.name}</h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-white text-slate-500 px-2 py-1 rounded-[8px] border border-slate-100">
                  <Clock className="w-3 h-3" strokeWidth={1.8} /> {pkg.duration}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-white text-slate-500 px-2 py-1 rounded-[8px] border border-slate-100">
                  <Zap className="w-3 h-3" strokeWidth={1.8} /> {pkg.speed}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-white text-slate-500 px-2 py-1 rounded-[8px] border border-slate-100">
                  <Wifi className="w-3 h-3" strokeWidth={1.8} /> {pkg.quota}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[22px] font-bold text-slate-800 tracking-tight">
                {formatRupiah(pkg.price)}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-strong rounded-[28px] p-5">
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
                  <label className="block text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">No. WhatsApp / HP</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="08xxxxxxxxxx"
                      className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all text-[15px]"
                      required
                    />
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                  </div>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 mt-2 text-[12px] text-rose-500 bg-rose-50 rounded-[10px] px-3 py-2 border border-rose-100"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                      {error}
                    </motion.div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-2 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.8} />
                    Kode voucher ditampilkan setelah bayar. Simpan untuk login WiFi.
                  </p>
                </div>

                {qrisEnabled ? (
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-[18px] px-4 py-4 flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(14,165,233,0.3)] active:scale-95 transition-transform text-[15px]"
                  >
                    {isProcessing ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses...</>
                    ) : (
                      <><ArrowRight className="w-4 h-4" strokeWidth={1.8} /> Bayar dengan QRIS</>
                    )}
                  </button>
                ) : (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-[16px] text-center">
                    <p className="font-semibold text-[13px] text-rose-500">Pembayaran Sedang Maintenance</p>
                    <p className="text-[11px] text-slate-400 mt-1">Hubungi admin untuk pembelian.</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full bg-white border border-slate-100 shadow-sm active:scale-95 text-slate-700 font-medium rounded-[18px] px-4 py-3.5 flex items-center justify-center gap-2 transition-transform text-[13px]"
                >
                  <Wallet className="w-4 h-4 text-slate-400" strokeWidth={1.8} /> Punya akun? Login & bayar pakai saldo
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
                <p className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-4">Scan QRIS untuk Bayar</p>

                <div className="bg-white p-4 rounded-[20px] inline-block mb-4 shadow-[0_8px_20px_rgba(14,165,233,0.15)] border border-slate-100">
                  <div className="w-[180px] h-[180px] rounded-lg overflow-hidden relative bg-slate-50">
                    {qrisUrl && <img src={qrisUrl} alt="QRIS" className="w-full h-full object-contain" />}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 bg-white rounded-xl shadow border-2 border-slate-200 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-sky-500" strokeWidth={1.8} />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[12px] text-slate-400 font-mono mb-1">{refId}</p>
                <p className="text-[12px] text-slate-500 mb-5">DANA · OVO · GoPay · ShopeePay · M-Banking</p>

                {error && (
                  <div className="flex items-center gap-2 text-[12px] text-rose-500 bg-rose-50 rounded-[12px] px-3 py-2.5 mb-4 border border-rose-100">
                    <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.8} /> {error}
                  </div>
                )}

                <div className="w-full flex items-center justify-center gap-2 bg-sky-50 border border-sky-100 text-sky-600 font-semibold py-4 rounded-[16px] text-[14px] mb-2.5">
                  <div className="w-4 h-4 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" />
                  Menunggu pembayaran...
                </div>
                <p className="text-[11px] text-slate-400 mb-2.5">
                  Voucher muncul otomatis setelah pembayaran terverifikasi. Jangan tutup halaman ini.
                </p>
                <button
                  onClick={() => { setStep('input_phone'); setError(null); setRefId(null); setQrisUrl(null); }}
                  className="w-full text-slate-400 font-medium py-2.5 rounded-[14px] transition-all text-[13px] hover:text-slate-600"
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
                <div className="w-16 h-16 bg-teal-50 border border-teal-100 rounded-full flex items-center justify-center mx-auto mb-5 relative">
                  <div className="absolute inset-0 bg-teal-200/40 rounded-full animate-ping" />
                  <Check className="w-8 h-8 text-teal-600 relative z-10" strokeWidth={2} />
                </div>
                <h3 className="text-[20px] font-bold text-slate-800 mb-1 tracking-tight">Pembayaran Berhasil!</h3>
                <p className="text-slate-500 text-[13px] mb-6">Ini kode voucher WiFi Anda</p>

                <div className="bg-sky-50 border border-sky-100 rounded-[20px] p-5 mb-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-28 h-28 bg-sky-200/40 blur-[40px] rounded-full -mr-10 -mt-10" />
                  <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2">KODE VOUCHER</p>
                  <div className="flex items-center gap-3">
                    <code className="text-[22px] font-mono font-bold tracking-[0.15em] text-sky-600 flex-1">
                      {successCode}
                    </code>
                    <button
                      onClick={copyCode}
                      aria-label="Salin kode voucher"
                      className="w-10 h-10 bg-sky-100 hover:bg-sky-200 active:scale-95 rounded-[12px] flex items-center justify-center text-sky-600 transition-all"
                    >
                      {copied ? <Check className="w-5 h-5" strokeWidth={1.8} /> : <Copy className="w-5 h-5" strokeWidth={1.8} />}
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[16px] p-4 text-left mb-5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cara Pakai:</p>
                  <ol className="space-y-1.5 text-[12px] text-slate-500">
                    <li className="flex items-start gap-2"><span className="text-sky-600 font-bold shrink-0">1.</span>Buka halaman login WiFi di browser</li>
                    <li className="flex items-start gap-2"><span className="text-sky-600 font-bold shrink-0">2.</span>Masukkan kode di atas sebagai Username &amp; Password</li>
                    <li className="flex items-start gap-2"><span className="text-sky-600 font-bold shrink-0">3.</span>Klik Login — Internet siap digunakan! 🎉</li>
                  </ol>
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-white border border-slate-100 shadow-sm active:scale-95 text-slate-700 font-medium py-3.5 rounded-[16px] transition-transform text-[13px]"
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
