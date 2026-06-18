import React, { useState, useRef, useEffect } from 'react';
import { useAppContext, Package } from '../../AppContext';
import { Wifi, Zap, ShieldCheck, X, Check, Copy, Wallet, CheckCircle2, ChevronRight, Lock, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { formatRupiah } from '../../lib/format';

export default function UserBuy() {
  const { packages, currentUser, buyPackage, refreshData } = useAppContext();
  const location = useLocation();
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(
    packages.find(p => p.id === location.state?.packageId) || null
  );
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
  const [hotspotLoginUrl, setHotspotLoginUrl] = useState('');

  useEffect(() => {
    if (showPinInput && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [showPinInput]);

  useEffect(() => {
    fetch('/api/config/public')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setQrisEnabled(json.data.qrisEnabled ?? true);
          setHotspotLoginUrl(json.data.hotspotLoginUrl || '');
        }
      })
      .catch(() => {});
  }, []);

  // One-tap WiFi login: submit the voucher (username = password = code) to the
  // Mikrotik hotspot login page. Works when the buyer is already on the WiFi.
  const loginToWifi = () => {
    if (!hotspotLoginUrl || !successCode) return;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = hotspotLoginUrl;
    const add = (name: string, value: string) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };
    add('username', successCode);
    add('password', successCode);
    add('dst', 'http://www.google.com');
    document.body.appendChild(form);
    form.submit();
  };

  const initiateBuy = async () => {
    setError(null);
    if (!selectedPkg) return;

    if (paymentMethod === 'saldo') {
      setShowPinInput(true);
    } else {
      setIsProcessing(true);
      try {
        const response = await fetch('/api/payment/create-qris', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: selectedPkg.price,
            packageId: selectedPkg.id,
            phone: currentUser?.phone_number
          }),
        });
        const data = await response.json();
        if (data.success) {
          setQrisUrl(data.data.qr_url);
          setRefId(data.data.reference_id);
          setShowQrisCode(true);
        } else {
          setError('Gagal membuat transaksi: ' + data.error);
        }
      } catch {
        setError('Terjadi kesalahan jaringan.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Poll payment status while the QRIS is shown. The voucher is only issued
  // server-side after SanPay confirms the payment via its signed webhook.
  useEffect(() => {
    if (!showQrisCode || !refId) return;
    let active = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/payment/status/${refId}`);
        const d = await r.json();
        if (active && d.success && d.data.status === 'success' && d.data.voucher_code) {
          setSuccessCode(d.data.voucher_code);
          setShowQrisCode(false);
          await refreshData();
        }
      } catch { /* ignore transient network errors while polling */ }
    };
    const id = setInterval(poll, 4000);
    poll();
    return () => { active = false; clearInterval(id); };
  }, [showQrisCode, refId]);

  const buyPackageWithPin = async (currentPin: string) => {
    if (!selectedPkg) return;
    const result = await buyPackage(selectedPkg, 'saldo', currentPin);
    if (result.success) {
      setSuccessCode(result.voucher_code || `WFI-${Math.random().toString(36).substring(2,8).toUpperCase()}`);
      setShowPinInput(false);
      setPin('');
    } else {
      setError(result.error || 'PIN salah atau saldo tidak mencukupi');
      setPin('');
      if (pinInputRef.current) pinInputRef.current.focus();
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setPin(val);
    if (val.length === 6) {
      setTimeout(() => buyPackageWithPin(val), 100);
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

  const badges = ['Murah', 'Populer', 'Best Value', 'Premium'];

  return (
    <div className="p-5 pb-24 pt-14">
      <div className="mb-6 px-1">
        <h1 className="text-[28px] font-bold tracking-tight text-slate-800 mb-1">Beli Voucher</h1>
        <p className="text-slate-500 text-[13px] font-medium">Pilih paket yang sesuai</p>
      </div>

      <div className="grid gap-3">
        {packages.map((pkg, idx) => (
          <motion.div
            key={pkg.id}
            onClick={() => { setSelectedPkg(pkg); setSuccessCode(null); setShowPinInput(false); setError(null); }}
            className="glass rounded-[24px] p-4 cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[16px] flex items-center justify-center bg-sky-50 border border-sky-100">
                <Wifi className="w-5 h-5 text-sky-500" strokeWidth={1.8} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[15px] font-bold text-slate-800 leading-none">{pkg.name}</h3>
                  <span className="bg-sky-50 text-sky-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-sky-100">
                    {badges[idx] || 'Standar'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} /> {pkg.duration}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <Zap className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} /> {pkg.speed}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-slate-800">{formatRupiah(pkg.price)}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
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
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md glass-strong sm:rounded-[32px] rounded-t-[32px] p-6 shadow-2xl relative"
            >
              {!showPinInput && !showQrisCode && !successCode ? (
                <>
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                  <button onClick={closeModals} aria-label="Tutup" className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white border border-slate-100 rounded-full text-slate-400 hover:text-slate-600 shadow-sm">
                    <X className="w-4 h-4" />
                  </button>
                  <h3 className="text-[22px] font-bold mb-6 text-slate-800 tracking-tight">Konfirmasi</h3>

                  <div className="bg-white border border-slate-100 rounded-[20px] p-4 mb-6 shadow-sm">
                    <p className="text-[13px] text-slate-400 font-medium tracking-wide uppercase mb-1">Paket yang dipilih</p>
                    <p className="font-bold text-[17px] text-slate-800">{selectedPkg.name}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                      <span className="text-slate-500 text-[13px] font-medium">Total Pembayaran</span>
                      <span className="font-bold text-slate-800 text-[17px]">{formatRupiah(selectedPkg.price)}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <p className="text-[13px] font-medium tracking-wide uppercase text-slate-400">Metode Pembayaran</p>

                    <button
                      onClick={() => setPaymentMethod('saldo')}
                      className={`w-full flex items-center justify-between p-4 rounded-[16px] border transition-all ${paymentMethod === 'saldo' ? 'border-sky-300 bg-sky-50' : 'border-slate-100 bg-white active:scale-[0.98]'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[12px] bg-sky-100 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-sky-600" strokeWidth={1.8} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-[15px] text-slate-800">Saldo AdilaNet</p>
                          <p className="text-[13px] text-slate-500 font-medium">{formatRupiah(currentUser?.balance || 0)}</p>
                        </div>
                      </div>
                      {paymentMethod === 'saldo' && <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                    </button>

                    <button
                      onClick={() => { if (qrisEnabled) setPaymentMethod('qris'); }}
                      disabled={!qrisEnabled}
                      className={`w-full flex items-center justify-between p-4 rounded-[16px] border transition-all ${!qrisEnabled ? 'opacity-50 cursor-not-allowed border-slate-100 bg-white' : paymentMethod === 'qris' ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-white active:scale-[0.98]'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[12px] bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[11px] italic">
                          QRIS
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-[15px] text-slate-800">QRIS</p>
                          <p className="text-[13px] text-slate-500 font-medium">{qrisEnabled ? 'Gopay, OVO, Dana' : 'Sedang Maintenance'}</p>
                        </div>
                      </div>
                      {paymentMethod === 'qris' && qrisEnabled && <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                    </button>
                  </div>

                  {error && (
                    <div className="mb-4 text-center text-rose-500 text-[13px] font-medium bg-rose-50 py-2 rounded-[12px]">{error}</div>
                  )}

                  <button
                    onClick={initiateBuy}
                    disabled={isProcessing || (paymentMethod === 'saldo' && (currentUser?.balance || 0) < selectedPkg.price)}
                    className="w-full bg-sky-500 disabled:opacity-50 text-white font-semibold py-4 rounded-[18px] shadow-[0_8px_20px_rgba(14,165,233,0.3)] transition-transform active:scale-95 text-[15px]"
                  >
                    {isProcessing ? 'Memproses...' : (paymentMethod === 'saldo' && (currentUser?.balance || 0) < selectedPkg.price) ? 'Saldo Tidak Cukup' : 'Bayar Sekarang'}
                  </button>
                </>
              ) : showPinInput && !successCode ? (
                <>
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                  <button onClick={() => { setShowPinInput(false); setError(null); setPin(''); }} aria-label="Tutup" className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white border border-slate-100 rounded-full text-slate-400 hover:text-slate-600 shadow-sm">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="text-center mb-8 pt-4">
                    <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center mx-auto mb-4 border border-sky-100">
                      <Lock className="w-7 h-7 text-sky-500" strokeWidth={1.8} />
                    </div>
                    <h3 className="text-[22px] font-bold text-slate-800 mb-2 tracking-tight">Masukkan PIN</h3>
                    <p className="text-slate-500 text-[13px] font-medium max-w-[200px] mx-auto">Verifikasi PIN keamanan transaksi Anda.</p>
                  </div>
                  {error && (
                    <div className="mb-6 text-center text-rose-500 text-[13px] font-medium bg-rose-50 py-2 rounded-[12px]">{error}</div>
                  )}
                  <div className="mb-10 text-center">
                    <input
                      ref={pinInputRef}
                      type="password"
                      maxLength={6}
                      inputMode="numeric"
                      value={pin}
                      onChange={handlePinChange}
                      className="w-full max-w-[240px] mx-auto bg-transparent border-b-2 border-slate-200 text-center font-mono tracking-[1em] text-[28px] text-slate-800 pb-2 focus:outline-none focus:border-sky-400 transition-colors"
                    />
                  </div>
                  <p className="text-center text-slate-400 text-[12px]">
                    {!currentUser?.has_pin ? 'Anda belum mengatur PIN. Masukkan sembarang untuk lanjut.' : ''}
                  </p>
                </>
              ) : showQrisCode && !successCode ? (
                <div className="text-center">
                  <button onClick={() => { setShowQrisCode(false); setError(null); }} aria-label="Tutup" className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white border border-slate-100 rounded-full text-slate-400 hover:text-slate-600 shadow-sm">
                    <X className="w-4 h-4" />
                  </button>
                  <h3 className="text-[22px] font-bold mb-2 text-slate-800 tracking-tight mt-4">Bayar dengan QRIS</h3>
                  <p className="text-slate-500 text-[13px] font-medium mb-6">Scan QR Code dengan E-Wallet pilihan Anda.</p>

                  <div className="bg-white p-4 rounded-[20px] inline-block mb-6 shadow-sm border border-slate-100">
                    <div className="w-[180px] h-[180px] bg-white rounded-lg flex items-center justify-center m-auto relative">
                      {qrisUrl && <img src={qrisUrl} alt="QRIS" className="absolute inset-0 w-full h-full object-contain rounded-lg" />}
                      <div className="absolute w-10 h-10 bg-white rounded-xl shadow-lg border-[3px] border-sky-500 flex items-center justify-center z-10">
                        <ShieldCheck className="w-5 h-5 text-sky-500" strokeWidth={1.8} />
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-400 text-[12px] mb-4 font-mono">{refId}</p>

                  {error && (
                    <div className="mb-4 text-center text-rose-500 text-[13px] font-medium bg-rose-50 py-2 rounded-[12px]">{error}</div>
                  )}

                  <div className="w-full flex items-center justify-center gap-2 bg-sky-50 border border-sky-100 text-sky-600 font-semibold py-4 rounded-[16px] text-[14px]">
                    <div className="w-4 h-4 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
                    Menunggu pembayaran...
                  </div>
                  <p className="text-slate-400 text-[11px] mt-3">
                    Voucher muncul otomatis setelah pembayaran terverifikasi. Jangan tutup halaman ini.
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping" />
                    <CheckCircle2 className="w-10 h-10 text-teal-500 relative z-10" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[24px] font-bold text-slate-800 mb-2 tracking-tight">Berhasil!</h3>
                  <p className="text-slate-500 mb-8 font-medium text-[15px]">Voucher AdilaNet siap digunakan</p>

                  <div className="bg-white border border-slate-100 rounded-[20px] p-6 mb-8 relative group shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">KODE VOUCHER</p>
                    <p className="text-[28px] font-mono font-bold tracking-widest text-sky-600">{successCode}</p>
                    <button
                      onClick={copyCode}
                      aria-label="Salin kode voucher"
                      className="absolute top-4 right-4 p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-slate-600 shadow-sm transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-teal-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {hotspotLoginUrl ? (
                    <>
                      <button
                        onClick={loginToWifi}
                        className="w-full bg-sky-500 active:scale-95 text-white font-semibold py-4 rounded-[18px] shadow-[0_8px_20px_rgba(14,165,233,0.3)] transition-transform text-[15px] flex items-center justify-center gap-2 mb-3"
                      >
                        <Wifi className="w-5 h-5" strokeWidth={1.8} /> Login WiFi Sekarang
                      </button>
                      <p className="text-slate-400 text-[11px] mb-4 px-2">
                        Pastikan HP Anda terhubung ke jaringan WiFi AdilaNet. Internet langsung aktif setelah klik.
                      </p>
                      <button
                        onClick={closeModals}
                        className="w-full bg-white border border-slate-100 active:scale-95 text-slate-700 font-semibold py-3.5 rounded-[18px] shadow-sm transition-transform text-[14px]"
                      >
                        Nanti Saja
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={closeModals}
                      className="w-full bg-white border border-slate-100 active:scale-95 text-slate-700 font-semibold py-4 rounded-[18px] shadow-sm transition-transform text-[15px]"
                    >
                      Selesai
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
