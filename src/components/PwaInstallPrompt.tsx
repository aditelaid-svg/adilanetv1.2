import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    if (localStorage.getItem('pwa_dismissed')) return;

    const ua = navigator.userAgent;
    const iosDevice = /iphone|ipad|ipod/i.test(ua);
    const safariOnly = /safari/i.test(ua) && !/crios/i.test(ua) && !/fxios/i.test(ua);
    const isIosDevice = iosDevice && safariOnly;
    setIsIos(isIosDevice);

    if (isIosDevice) {
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Also show manual guide on Android/Chrome after 5s if no prompt (e.g. HTTP)
    const fallback = setTimeout(() => {
      if (!deferredPrompt) setShowBanner(true);
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(fallback);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        setTimeout(() => setShowBanner(false), 2000);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_dismissed', '1');
  };

  if (isInstalled || !showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="pwa-banner"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
        className="fixed bottom-20 left-3 right-3 z-[200] max-w-sm mx-auto"
      >
        <div className="glass-strong border border-sky-100 rounded-[20px] p-4 shadow-[0_12px_40px_rgba(14,165,233,0.18)]">
          {installed ? (
            <div className="flex items-center justify-center gap-2 py-1">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <p className="text-[14px] font-semibold text-slate-800">Berhasil diinstall!</p>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-[13px] bg-sky-500 flex items-center justify-center shrink-0 shadow-[0_8px_20px_rgba(14,165,233,0.3)] mt-0.5">
                <Smartphone className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-800 mb-0.5">
                  Install AdilaNet
                </p>
                {isIos ? (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Ketuk ikon <Share className="inline w-3 h-3 mx-0.5 text-sky-600" /> di bawah, lalu pilih{' '}
                    <span className="text-slate-700 font-semibold">"Tambahkan ke Layar Utama"</span>
                  </p>
                ) : deferredPrompt ? (
                  <p className="text-[11px] text-slate-500">Akses lebih cepat tanpa browser</p>
                ) : (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Di browser ketuk menu <span className="text-slate-700 font-semibold">⋮</span> lalu{' '}
                    <span className="text-slate-700 font-semibold">"Tambahkan ke layar utama"</span> / <span className="text-slate-700 font-semibold">"Install App"</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 shrink-0 ml-1">
                {!isIos && deferredPrompt && (
                  <button
                    onClick={handleInstall}
                    className="bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-[11px] font-bold px-3 py-1.5 rounded-[10px] flex items-center gap-1 transition-all"
                  >
                    <Download className="w-3 h-3" /> Install
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 text-[11px] font-medium px-3 py-1.5 rounded-[10px] flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" /> Nanti
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
