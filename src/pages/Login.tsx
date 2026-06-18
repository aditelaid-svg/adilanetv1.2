import React, { useState } from 'react';
import { ArrowRight, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useAppContext();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(identifier, password);
    setLoading(false);
    if (result.success) {
      // navigate happens via App.tsx redirect
    } else {
      setError(result.error || 'Login gagal.');
    }
  };

  const fillDemo = (id: string, pw: string) => {
    setIdentifier(id);
    setPassword(pw);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative text-slate-800">
      <div className="coastal-bg fixed inset-0">
        <div className="coastal-glow coastal-glow-1" />
        <div className="coastal-glow coastal-glow-2" />
        <div className="coastal-glow coastal-glow-3" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm glass-strong rounded-[32px] p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[20px] bg-white flex items-center justify-center shadow-[0_10px_30px_rgba(14,165,233,0.25)] ring-1 ring-sky-100 mb-5 p-2.5 relative">
            <img src="/logo.png" alt="AdilaNet" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-[26px] font-bold text-slate-800 tracking-tight">AdilaNet Login</h1>
          <p className="text-slate-500 text-[13px] font-medium mt-1 text-center">Keamanan Tinggi Diaktifkan</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-identifier" className="block text-[13px] font-semibold tracking-wide uppercase text-slate-500 mb-2">Username / No. HP / Email</label>
            <div className="relative">
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                placeholder="Masukkan kredensial"
                className="w-full bg-white border border-slate-200 rounded-[16px] pl-11 pr-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all text-[15px]"
                required
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-[13px] font-semibold tracking-wide uppercase text-slate-500 mb-2">Password</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Masukkan password rahasia"
                className="w-full bg-white border border-slate-200 rounded-[16px] pl-11 pr-12 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all text-[15px]"
                required
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
              <p className="text-[13px] font-medium text-rose-600 bg-rose-50 px-4 py-3 rounded-[12px] border border-rose-100">
                {error}
              </p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 active:scale-[0.98] text-white font-semibold rounded-[16px] px-4 py-4 flex items-center justify-center gap-2 transition-transform mt-2 text-[15px] shadow-[0_8px_20px_rgba(14,165,233,0.3)]"
          >
            {loading ? 'Memverifikasi...' : (
              <>Otorisasi Masuk <ArrowRight className="w-[18px] h-[18px]" /></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center flex items-center justify-center gap-1.5">
          <span className="text-[13px] font-medium text-slate-500">Belum punya akun?</span>
          <Link to="/register" className="text-[13px] font-semibold text-sky-600">Daftar</Link>
          <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.7)] ml-2" />
        </div>
      </motion.div>
    </div>
  );
}
