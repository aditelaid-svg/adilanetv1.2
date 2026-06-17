import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import { ShieldCheck, ArrowRight, Phone, Wallet, Copy, Check, Info } from 'lucide-react';
import { motion } from 'motion/react';

export default function PublicBuy() {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { packages, users, registerUser } = useAppContext();
  
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'input_phone' | 'qris' | 'success'>('input_phone');
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const pkg = packages.find(p => p.id === Number(packageId));

  useEffect(() => {
    if (!pkg) {
      navigate('/login');
    }
  }, [pkg, navigate]);

  if (!pkg) return null;

  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrisEnabled, setQrisEnabled] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${baseUrl}/api/config/public`);
        const json = await res.json();
        if (json.success && json.data) {
          setQrisEnabled(json.data.qrisEnabled ?? true);
        }
      } catch (err) {
        console.error("Gagal memuat setting publik:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      alert("Masukkan nomor HP yang valid");
      return;
    }
    
    setIsProcessing(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/payment/create-qris`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: pkg?.price, packageId: pkg?.id, phone })
      });
      const data = await response.json();
      
      if (data.success) {
        setQrisUrl(data.data.qr_url);
        setRefId(data.data.reference_id);
        setStep('qris');
      } else {
        alert("Gagal membuat transaksi: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulatePaymentWebhook = async () => {
    setIsProcessing(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      // Simulate webhook hit from Sanpay
      await fetch(`${baseUrl}/api/webhook/sanpay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_id: refId, status: "Success" })
      });
      
      // In a real app we'd open a WebSocket or poll to detect webhook success, 
      // here we just simulate it continuing.
      const code = `WFI-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
      setSuccessCode(code);
      setStep('success');
    } catch (err) {
      console.error(err);
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
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[500px] bg-[#0A84FF]/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen opacity-50" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm bg-[#1C1C1E]/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 sm:p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#0A84FF] to-[#005bb5] flex items-center justify-center shadow-lg shadow-[#0A84FF]/20 mb-5 relative">
            <ShieldCheck className="w-8 h-8 text-white relative z-10" />
            <div className="absolute inset-0 border border-white/20 rounded-[20px]" />
          </div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Checkout Cepat</h1>
          <p className="text-white/50 text-[13px] font-medium mt-1 text-center">Beli Voucher Langsung</p>
        </div>

        {/* Selected Package Info */}
        <div className="bg-white/[0.03] border border-white/5 rounded-[20px] p-4 mb-6">
            <h3 className="text-white font-semibold text-[15px] mb-1">{pkg.name}</h3>
            <div className="text-[24px] font-bold text-white tracking-tight">
                Rp {pkg.price.toLocaleString('id-ID')}
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
                <span className="text-[11px] font-medium bg-white/5 text-white/70 px-2 py-1 rounded-md">{pkg.duration}</span>
                <span className="text-[11px] font-medium bg-white/5 text-white/70 px-2 py-1 rounded-md">{pkg.speed}</span>
                <span className="text-[11px] font-medium bg-white/5 text-white/70 px-2 py-1 rounded-md">{pkg.quota}</span>
            </div>
        </div>

        <AnimatePresence mode="wait">
            {step === 'input_phone' && (
                <motion.form 
                    key="input_phone"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleContinue} 
                    className="space-y-4"
                >
                    <div>
                        <label className="block text-[13px] font-semibold tracking-wide uppercase text-white/50 mb-2">No. WhatsApp / HP</label>
                        <div className="relative">
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Mulai dengan 08..."
                            className="w-full bg-white/[0.03] border border-white/10 rounded-[16px] pl-11 pr-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0A84FF]/50 focus:bg-white/[0.05] transition-all text-[15px]"
                            required
                        />
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30" />
                        </div>
                        <p className="text-[11px] text-white/40 mt-2 flex items-start gap-1">
                            <Info className="w-3.5 h-3.5 flex-shrink-0" />
                            Voucher akan ditampilkan setelah pembayaran dan juga dikirim ke nomor ini (opsional jika ada API WA).
                        </p>
                    </div>

                    {qrisEnabled ? (
                      <button
                          type="submit"
                          disabled={isProcessing}
                          className="w-full bg-[#0A84FF] disabled:opacity-50 hover:bg-[#0A84FF]/90 active:scale-[0.98] text-white font-semibold rounded-[16px] px-4 py-4 flex items-center justify-center gap-2 transition-transform mt-6 text-[15px]"
                      >
                          {isProcessing ? "Memproses..." : "Lanjutkan Pembayaran (QRIS)"}
                          <ArrowRight className="w-[18px] h-[18px]" />
                      </button>
                    ) : (
                      <div className="mt-6 p-4 bg-[#FF453A]/10 border border-[#FF453A]/20 rounded-[16px] text-center text-[#FF453A]">
                        <p className="font-semibold text-[14px]">Pembayaran Sedang Maintenance</p>
                        <p className="text-[12px] opacity-80 mt-1">Silakan gunakan saldo Anda.</p>
                      </div>
                    )}
                    
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="w-full bg-transparent hover:bg-white/5 border border-white/10 active:scale-[0.98] text-white/70 font-semibold rounded-[16px] px-4 py-3.5 flex items-center justify-center gap-2 transition-all mt-3 text-[14px]"
                    >
                        <Wallet className="w-4 h-4" /> Bayar pakai Saldo
                    </button>
                </motion.form>
            )}

            {step === 'qris' && (
                <motion.div 
                    key="qris"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="text-center"
                >
                    <div className="bg-white p-4 rounded-[20px] inline-block mb-4 shadow-xl">
                        {/* QR Code from Sanpay API */}
                        <div className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] bg-black rounded-lg flex items-center justify-center m-auto relative">
                           {qrisUrl ? (
                               <img src={qrisUrl} alt="QRIS Code" className="absolute inset-0 w-full h-full object-contain rounded-lg" />
                           ) : null}
                           {/* Decorative logo center */}
                           <div className="absolute w-12 h-12 bg-white rounded-xl shadow-lg border-[3px] border-black flex items-center justify-center z-10">
                               <ShieldCheck className="w-6 h-6 text-black" />
                           </div>
                        </div>
                    </div>
                    
                    <p className="text-[13px] font-medium text-white/70 mb-6 px-4">
                        Scan QRIS di atas dengan aplikasi DANA, OVO, GoPay, ShopeePay atau Mobile Banking Anda.
                    </p>

                    <button 
                        onClick={handleSimulatePaymentWebhook}
                        disabled={isProcessing}
                        className="w-full bg-[#34C759] disabled:opacity-50 hover:bg-[#34C759]/90 active:scale-[0.98] text-white font-semibold py-4 rounded-[16px] transition-transform text-[15px]"
                    >
                        {isProcessing ? "Menunggu..." : "Simulasi Payment (Webhook)"}
                    </button>
                    <button 
                        onClick={() => setStep('input_phone')}
                        disabled={isProcessing}
                        className="w-full bg-transparent hover:bg-white/5 mt-3 active:scale-[0.98] text-white/50 font-medium py-3 rounded-[16px] transition-all text-[14px]"
                    >
                        Batal
                    </button>
                </motion.div>
            )}

            {step === 'success' && successCode && (
                <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4"
                >
                    <div className="w-16 h-16 bg-[#34C759]/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <Check className="w-8 h-8 text-[#34C759]" />
                        <div className="absolute inset-0 border-2 border-[#34C759]/40 rounded-full animate-ping" />
                    </div>
                  
                    <h3 className="text-[20px] font-bold text-white mb-2">Pembayaran Berhasil!</h3>
                    <p className="text-white/50 text-[13px] font-medium mb-6">Ini adalah kode voucher Anda.</p>
                    
                    <div className="bg-[#0A84FF]/10 border border-[#0A84FF]/20 rounded-[20px] p-5 mb-6 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0A84FF]/10 blur-[40px] rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150" />
                        <p className="text-white/40 text-[11px] font-semibold tracking-wider uppercase mb-2">Kode Voucher</p>
                        <div className="flex items-center gap-3">
                            <code className="text-[24px] font-mono font-bold tracking-[0.2em] text-[#0A84FF] bg-transparent outline-none flex-1">
                                {successCode}
                            </code>
                            <button 
                                onClick={copyCode}
                                className="w-10 h-10 bg-[#0A84FF]/20 hover:bg-[#0A84FF]/30 active:bg-[#0A84FF]/40 rounded-[12px] flex items-center justify-center text-[#0A84FF] transition-colors"
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
