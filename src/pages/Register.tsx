import React, { useState } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Register() {
  const { registerUser } = useAppContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Semua kolom wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await registerUser(name, email, phone, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Pendaftaran gagal.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative text-slate-800">
      <div className="coastal-bg fixed inset-0">
        <div className="coastal-glow coastal-glow-1" />
        <div className="coastal-glow coastal-glow-2" />
        <div className="coastal-glow coastal-glow-3" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm glass-strong rounded-[32px] p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[20px] bg-white flex items-center justify-center shadow-[0_10px_30px_rgba(14,165,233,0.25)] ring-1 ring-sky-100 mb-5 p-2.5">
            <img src="/logo.png" alt="AdilaNet" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-[26px] font-bold text-slate-800 tracking-tight">Daftar Akun</h1>
          <p className="text-slate-500 text-[13px] font-medium mt-1">Buat akun untuk akses AdilaNet</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-[13px] font-semibold tracking-wide uppercase text-slate-500 mb-2">Nama Lengkap</label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Ahmad Fulan"
              className="w-full bg-white border border-slate-200 rounded-[16px] px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all text-[15px]"
              required
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-[13px] font-semibold tracking-wide uppercase text-slate-500 mb-2">Email</label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="email@example.com"
              className="w-full bg-white border border-slate-200 rounded-[16px] px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all text-[15px]"
              required
            />
          </div>
          <div>
            <label htmlFor="reg-phone" className="block text-[13px] font-semibold tracking-wide uppercase text-slate-500 mb-2">Nomor HP (opsional)</label>
            <div className="relative">
              <input
                id="reg-phone"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(''); }}
                placeholder="08xxxxxxxxxx"
                className="w-full bg-white border border-slate-200 rounded-[16px] pl-11 pr-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all text-[15px]"
              />
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
            </div>
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-[13px] font-semibold tracking-wide uppercase text-slate-500 mb-2">Password</label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              className="w-full bg-white border border-slate-200 rounded-[16px] px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all text-[15px]"
              required
            />
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
            {loading ? 'Mendaftarkan...' : (
              <>Daftar Sekarang <ArrowRight className="w-[18px] h-[18px]" /></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[13px] font-medium text-slate-500">Sudah punya akun?</p>
          <Link to="/login" className="text-sky-600 font-semibold text-[13px] mt-1 inline-block">Masuk di sini</Link>
        </div>
      </motion.div>
    </div>
  );
}
