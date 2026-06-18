import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ConfirmDialog {
  id: string;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
  resolve: (result: boolean) => void;
}

interface ToastContextType {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  confirm: (title: string, message: string, options?: {
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
  }) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirms, setConfirms] = useState<ConfirmDialog[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `t${++counter.current}`;
    setToasts(prev => [...prev.slice(-4), { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3800);
  }, []);

  const confirm = useCallback((
    title: string,
    message: string,
    options?: { confirmText?: string; cancelText?: string; danger?: boolean }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = `c${++counter.current}`;
      const resolveDialog = (result: boolean) => {
        setConfirms(prev => prev.filter(c => c.id !== id));
        resolve(result);
      };
      setConfirms(prev => [...prev, {
        id, title, message,
        confirmText: options?.confirmText ?? 'Ya, Lanjutkan',
        cancelText: options?.cancelText ?? 'Batal',
        danger: options?.danger ?? true,
        resolve: resolveDialog,
      }]);
    });
  }, []);

  const value: ToastContextType = {
    success: (t, m) => addToast('success', t, m),
    error: (t, m) => addToast('error', t, m),
    warning: (t, m) => addToast('warning', t, m),
    info: (t, m) => addToast('info', t, m),
    confirm,
  };

  const ICONS = {
    success: <CheckCircle2 className="w-[18px] h-[18px] text-teal-600" />,
    error: <XCircle className="w-[18px] h-[18px] text-rose-600" />,
    warning: <AlertTriangle className="w-[18px] h-[18px] text-amber-500" />,
    info: <Info className="w-[18px] h-[18px] text-sky-600" />,
  };

  const BORDER = {
    success: 'border-teal-200',
    error: 'border-rose-200',
    warning: 'border-amber-200',
    info: 'border-sky-200',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed top-safe-top top-4 left-1/2 -translate-x-1/2 z-[500] flex flex-col gap-2 w-full max-w-[360px] px-4 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', bounce: 0.28, duration: 0.38 }}
              className={`flex items-start gap-3 px-4 py-3.5 rounded-[18px] border ${BORDER[t.type]} glass-strong shadow-[0_8px_32px_rgba(14,165,233,0.18)] pointer-events-auto`}
            >
              <div className="shrink-0 mt-0.5">{ICONS[t.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13.5px] text-slate-800 leading-snug">{t.title}</p>
                {t.message && <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{t.message}</p>}
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirms.map(dialog => (
          <motion.div
            key={dialog.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center p-5 bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.22, duration: 0.32 }}
              className="w-full max-w-[320px] glass-strong rounded-[28px] p-6"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${dialog.danger ? 'bg-rose-50 border border-rose-100' : 'bg-sky-50 border border-sky-100'}`}>
                {dialog.danger
                  ? <AlertTriangle className="w-7 h-7 text-rose-600" />
                  : <Info className="w-7 h-7 text-sky-600" />}
              </div>
              <h3 className="text-[17px] font-bold text-slate-800 text-center mb-2 tracking-tight">{dialog.title}</h3>
              <p className="text-slate-500 text-[13px] text-center mb-6 leading-relaxed">{dialog.message}</p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => dialog.resolve(true)}
                  className={`w-full py-3.5 rounded-[16px] font-semibold text-[15px] transition-all active:scale-[0.97] text-white ${dialog.danger ? 'bg-rose-500 hover:bg-rose-600 shadow-[0_8px_20px_rgba(244,63,94,0.3)]' : 'bg-sky-500 hover:bg-sky-600 shadow-[0_8px_20px_rgba(14,165,233,0.3)]'}`}
                >
                  {dialog.confirmText}
                </button>
                <button
                  onClick={() => dialog.resolve(false)}
                  className="w-full py-3.5 rounded-[16px] font-semibold text-[15px] bg-white border border-slate-100 hover:bg-slate-50 text-slate-700 transition-all active:scale-[0.97]"
                >
                  {dialog.cancelText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}
