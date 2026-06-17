import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
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

  useEffect(() => {
    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const safari = /safari/i.test(ua) && !/crios/i.test(ua) && !/fxios/i.test(ua);
    setIsIos(ios && safari);

    // Show iOS guide after delay
    if (ios && safari && !localStorage.getItem('pwa_dismissed')) {
      setTimeout(() => setShowBanner(true), 3000);
    }

    // Listen for Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!localStorage.getItem('pwa_dismissed')) {
        setTimeout(() => setShowBanner(true), 2000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        setIsInstalled(true);
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
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        className="fixed bottom-20 left-3 right-3 z-[200] max-w-sm mx-auto"
      >
        <div className="bg-[#1C1C1E] border border-[#0A84FF]/30 rounded-[20px] p-4 shadow-2xl shadow-black/50 backdrop-blur-xl flex items-center gap-3">
          {/* Icon */}
          <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#0A84FF] to-[#005BB5] flex items-center justify-center shrink-0 shadow-lg">
            <Smartphone className="w-6 h-6 text-white" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white leading-snug">
              {isIos ? 'Tambahkan ke Home Screen' : 'Install AdilaNet'}
            </p>
            <p className="text-[11px] text-white/50 leading-snug mt-0.5">
              {isIos
                ? 'Ketuk ⎙ lalu "Tambahkan ke Layar Utama"'
                : 'Akses lebih cepat tanpa browser'}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {!isIos && deferredPrompt && (
              <button
                onClick={handleInstall}
                className="bg-[#0A84FF] hover:bg-[#0070e0] text-white text-[11px] font-bold px-3 py-1.5 rounded-[10px] flex items-center gap-1 transition-colors"
              >
                <Download className="w-3 h-3" /> Install
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="bg-white/5 hover:bg-white/10 text-white/50 text-[11px] font-medium px-3 py-1.5 rounded-[10px] flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Nanti
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
