import React, { useState, useRef, useEffect } from 'react';
import { useAppContext, Package } from '../../AppContext';
import { Wifi, Zap, Clock, ShieldCheck, X, Check, Copy, Wallet, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';

export default function UserBuy() {
  const { packages, currentUser, buyPackage } = useAppContext();
  const location = useLocation();
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(packages.find(p => p.id === location.state?.packageId) || null);
  const [paymentMethod, setPaymentMethod] = useState<'saldo' | 'qris'>('saldo');
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const pinInputRef = useRef<HTMLInputElement>(null);

  const [showQrisCode, setShowQrisCode] = useState(false);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [qrisEnabled, setQrisEnabled] = useState(true);

  useEffect(() => {
    if (showPinInput && pinInputRef.current) {
        pinInputRef.current.focus();
    }
  }, [showPinInput]);

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

  const initiateBuy = async () => {
      setError(null);
      if (paymentMethod === 'saldo') {
          setShowPinInput(true);
      } else {
          // QRIS flow via API
          setIsProcessing(true);
          try {
            const baseUrl = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${baseUrl}/api/payment/create-qris`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: selectedPkg?.price, packageId: selectedPkg?.id, phone: currentUser?.phone_number })
            });
            const data = await response.json();
            
            if (data.success) {
                setQrisUrl(data.data.qr_url);
                setRefId(data.data.reference_id);
                setShowQrisCode(true);
            } else {
                setError("Gagal membuat transaksi: " + data.error);
            }
          } catch (err) {
            console.error(err);
            setError("Terjadi kesalahan jaringan.");
          } finally {
            setIsProcessing(false);
          }
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
      
      const code = `WFI-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
      setSuccessCode(code);
      setShowQrisCode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeBuy = () => {
    if (!selectedPkg) return;
    const result = buyPackage(selectedPkg, paymentMethod, pin);
    if (result.success) {
      const code = `WFI-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
      setSuccessCode(code);
      setShowPinInput(false);
      setPin('');
    } else {
      setError(result.error || "Pembelian Gagal");
      setPin('');
      if (pinInputRef.current) pinInputRef.current.focus();
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      setPin(val);
      if (val.length === 6) {
          // auto submit when 6 digits
          setTimeout(() => {
              buyPackageWithPin(val);
          }, 100);
      }
  };

  const buyPackageWithPin = (currentPin: string) => {
    if (!selectedPkg) return;
    const result = buyPackage(selectedPkg, paymentMethod, currentPin);
    if (result.success) {
      const code = `WFI-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
      setSuccessCode(code);
      setShowPinInput(false);
      setPin('');
    } else {
      setError(result.error || "Pin salah atau saldo tidak mencukupi");
      setPin('');
    }
  };

  const closeModals = () => {
      setSelectedPkg(null);
      setSuccessCode(null);
      setShowPinInput(false);
      setShowQrisCode(false);
      setPin('');
      setError(null);
  };

  const copyCode = () => {
    if (successCode) {
      navigator.clipboard.writeText(successCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-5 pb-24 mt-2">
      <div className="mb-6 pt-2">
        <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Beli Voucher</h1>
        <p className="text-white/50 text-[13px] font-medium">Pilih paket yang sesuai</p>
      </div>

      <div className="grid gap-3">
        {packages.map((pkg, idx) => (
          <motion.div 
            key={pkg.id} 
            onClick={() => { setSelectedPkg(pkg); setSuccessCode(null); setShowPinInput(false); }}
            className="bg-[#1C1C1E] border border-white/5 rounded-[20px] p-4 cursor-pointer active:bg-white/5 transition-colors shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center bg-[#0A84FF]/10 border border-[#0A84FF]/20`}>
                <Wifi className="w-5 h-5 text-[#0A84FF]" />
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[15px] font-semibold text-white leading-none">{pkg.name}</h3>
                  <span className="bg-[#0A84FF]/10 text-[#0A84FF] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#0A84FF]/20">
                    {idx === 0 ? 'Murah' : idx === 1 ? 'Populer' : 'Best Value'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 text-white/50 text-[11px] font-medium">
                        <span className="opacity-70 text-[10px]">🕒</span> {pkg.duration}
                    </div>
                    <div className="flex items-center gap-1 text-white/50 text-[11px] font-medium">
                        <span className="opacity-70 text-[10px]">⚡</span> {pkg.speed}
                    </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-white">
                Rp {pkg.price.toLocaleString('id-ID')}
              </span>
              <ChevronRight className="w-4 h-4 text-white/20" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Purchase Modal */}
      <AnimatePresence>
        {selectedPkg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md bg-[#1C1C1E] sm:rounded-[32px] rounded-t-[32px] p-6 shadow-2xl relative border-t border-white/10"
            >
              {!showPinInput && !showQrisCode && !successCode ? (
                <>
                  <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
                  
                  <button 
                    onClick={closeModals} 
                    className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  <h3 className="text-[22px] font-bold mb-6 text-white tracking-tight">Konfirmasi</h3>
                  
                  <div className="bg-white/[0.02] rounded-[20px] p-4 mb-6 border border-white/5">
                    <p className="text-[13px] text-white/50 font-medium tracking-wide uppercase mb-1">Paket yang dipilih</p>
                    <p className="font-semibold text-[17px] text-white">{selectedPkg.name}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                      <span className="text-white/50 text-[13px] font-medium">Total Pembayaran</span>
                      <span className="font-bold text-white text-[17px]">Rp {selectedPkg.price.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <p className="text-[13px] font-medium tracking-wide uppercase text-white/50">Metode Pembayaran</p>
                    
                    <button 
                      onClick={() => setPaymentMethod('saldo')}
                      className={`w-full flex items-center justify-between p-4 rounded-[16px] border transition-all ${paymentMethod === 'saldo' ? 'border-[#0A84FF] bg-[#0A84FF]/10' : 'border-white/5 bg-white/[0.02] active:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[12px] bg-[#0A84FF]/20 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-[#0A84FF]" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-[15px] text-white">Saldo AdilaNet</p>
                          <p className="text-[13px] text-white/50 font-medium">Rp {currentUser?.balance.toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                      {paymentMethod === 'saldo' && <div className="w-5 h-5 rounded-full bg-[#0A84FF] flex items-center justify-center font-bold text-white"><Check className="w-3 h-3"/></div>}
                    </button>
                    
                    <button 
                      onClick={() => { if (qrisEnabled) setPaymentMethod('qris'); }}
                      disabled={!qrisEnabled}
                      className={`w-full flex items-center justify-between p-4 rounded-[16px] border transition-all ${!qrisEnabled ? 'opacity-50 cursor-not-allowed border-white/5 bg-white/[0.02]' : paymentMethod === 'qris' ? 'border-[#5E5CE6] bg-[#5E5CE6]/10' : 'border-white/5 bg-white/[0.02] active:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[12px] bg-[#5E5CE6]/20 flex items-center justify-center text-[#5E5CE6] font-bold text-[11px] italic">
                            QRIS
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-[15px] text-white">QRIS</p>
                          <p className="text-[13px] text-white/50 font-medium">{qrisEnabled ? "Gopay, OVO, Dana" : "Sedang Maintenance"}</p>
                        </div>
                      </div>
                      {paymentMethod === 'qris' && qrisEnabled && <div className="w-5 h-5 rounded-full bg-[#5E5CE6] flex items-center justify-center font-bold text-white"><Check className="w-3 h-3"/></div>}
                    </button>
                  </div>

                  {error && (
                      <div className="mb-4 text-center text-[#FF453A] text-[13px] font-medium bg-[#FF453A]/10 py-2 rounded-[12px]">
                          {error}
                      </div>
                  )}

                  <button 
                    onClick={initiateBuy}
                    disabled={isProcessing || (paymentMethod === 'saldo' && (currentUser?.balance || 0) < selectedPkg.price)}
                    className="w-full bg-[#0A84FF] disabled:opacity-50 hover:bg-[#0070e0] text-white font-semibold py-4 rounded-[16px] transition-transform active:scale-[0.98] text-[15px]"
                  >
                    {isProcessing ? "Memproses..." : (paymentMethod === 'saldo' && (currentUser?.balance || 0) < selectedPkg.price) ? "Saldo Tidak Cukup" : "Bayar Sekarang"}
                  </button>
                </>
              ) : showPinInput && !successCode ? (
                <>
                  <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
                  
                  <button 
                    onClick={() => { setShowPinInput(false); setError(null); }} 
                    className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="text-center mb-8 pt-4">
                      <div className="w-16 h-16 rounded-full bg-[#0A84FF]/10 flex items-center justify-center mx-auto mb-4 border border-[#0A84FF]/20">
                          <Lock className="w-7 h-7 text-[#0A84FF]" />
                      </div>
                      <h3 className="text-[22px] font-bold text-white mb-2">Masukkan PIN</h3>
                      <p className="text-white/50 text-[13px] font-medium max-w-[200px] mx-auto">Verifikasi PIN keamanan transaksi Anda.</p>
                  </div>

                  {error && (
                      <div className="mb-6 text-center text-[#FF453A] text-[13px] font-medium bg-[#FF453A]/10 py-2 rounded-[12px]">
                          {error}
                      </div>
                  )}

                  <div className="mb-10 text-center">
                    <input
                      ref={pinInputRef}
                      type="password"
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={pin}
                      onChange={handlePinChange}
                      className="w-full max-w-[240px] mx-auto bg-transparent border-b-2 border-white/20 text-center font-mono tracking-[1em] text-[28px] text-white pb-2 focus:outline-none focus:border-[#0A84FF] transition-colors"
                    />
                  </div>

                </>
              ) : showQrisCode && !successCode ? (
                <div className="text-center">
                    <button 
                      onClick={() => { setShowQrisCode(false); setError(null); }} 
                      className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <h3 className="text-[22px] font-bold mb-2 text-white tracking-tight mt-4">Bayar dengan QRIS</h3>
                    <p className="text-white/50 text-[13px] font-medium mb-6">Scan QR Code di bawah menggunakan E-Wallet pilihan Anda.</p>

                    <div className="bg-white p-4 rounded-[20px] inline-block mb-4 shadow-xl">
                        <div className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] bg-black rounded-lg flex items-center justify-center m-auto relative">
                           {qrisUrl ? (
                               <img src={qrisUrl} alt="QRIS Code" className="absolute inset-0 w-full h-full object-contain rounded-lg" />
                           ) : null}
                           <div className="absolute w-12 h-12 bg-white rounded-xl shadow-lg border-[3px] border-black flex items-center justify-center z-10">
                               <ShieldCheck className="w-6 h-6 text-black" />
                           </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleSimulatePaymentWebhook}
                        disabled={isProcessing}
                        className="w-full bg-[#34C759] disabled:opacity-50 hover:bg-[#34C759]/90 active:scale-[0.98] text-white font-semibold py-4 rounded-[16px] transition-transform text-[15px]"
                    >
                        {isProcessing ? "Menunggu Verifikasi..." : "Simulasi Payment (Webhook)"}
                    </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-[#34C759]/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-[#34C759]/20 rounded-full animate-ping" />
                    <CheckCircle2 className="w-10 h-10 text-[#34C759] relative z-10" />
                  </div>
                  
                  <h3 className="text-[24px] font-bold text-white mb-2 tracking-tight">Berhasil!</h3>
                  <p className="text-white/50 mb-8 font-medium text-[15px]">Voucher AdilaNet siap digunakan</p>
                  
                  <div className="bg-white/[0.02] border border-white/5 rounded-[20px] p-6 mb-8 relative group">
                    <p className="text-[11px] font-bold text-white/40 mb-2 uppercase tracking-widest">KODE VOUCHER</p>
                    <p className="text-[28px] font-mono font-bold tracking-widest text-[#0A84FF]">{successCode}</p>
                    
                    <button 
                      onClick={copyCode}
                      className="absolute top-4 right-4 p-2 bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-[#34C759]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <button 
                    onClick={closeModals}
                    className="w-full bg-white/10 active:bg-white/20 text-white font-semibold py-4 rounded-[16px] transition-all text-[15px]"
                  >
                    Selesai
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
