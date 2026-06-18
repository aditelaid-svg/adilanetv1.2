import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, User, Eye, EyeOff } from 'lucide-react';
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
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[500px] bg-brand/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen opacity-50" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm bg-surface/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-brand to-brand-deep flex items-center justify-center shadow-lg shadow-brand/20 mb-5 relative">
            <ShieldCheck className="w-8 h-8 text-white relative z-10" />
            <div className="absolute inset-0 border border-white/20 rounded-[20px]" />
          </div>
          <h1 className="text-[26px] font-bold text-white tracking-tight">AdilaNet Login</h1>
          <p className="text-white/50 text-[13px] font-medium mt-1 text-center">Keamanan Tinggi Diaktifkan</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-identifier" className="block text-[13px] font-semibold tracking-wide uppercase text-white/50 mb-2">Username / No. HP / Email</label>
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
                className="w-full bg-white/[0.03] border border-white/10 rounded-[16px] pl-11 pr-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 focus:bg-white/[0.05] transition-all text-[15px]"
                required
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30" />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-[13px] font-semibold tracking-wide uppercase text-white/50 mb-2">Password</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Masukkan password rahasia"
                className="w-full bg-white/[0.03] border border-white/10 rounded-[16px] pl-11 pr-12 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 focus:bg-white/[0.05] transition-all text-[15px]"
                required
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
              <p className="text-[13px] font-medium text-danger bg-danger/10 px-4 py-3 rounded-[12px] border border-danger/20">
                {error}
              </p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand/90 disabled:opacity-60 active:scale-[0.98] text-white font-semibold rounded-[16px] px-4 py-4 flex items-center justify-center gap-2 transition-transform mt-2 text-[15px]"
          >
            {loading ? 'Memverifikasi...' : (
              <>Otorisasi Masuk <ArrowRight className="w-[18px] h-[18px]" /></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center flex items-center justify-center gap-1.5">
          <span className="text-[13px] font-medium text-white/40">Belum punya akun?</span>
          <Link to="/register" className="text-[13px] font-semibold text-brand">Daftar</Link>
          <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(52,199,89,0.8)] ml-2" />
        </div>
      </motion.div>
    </div>
  );
}
