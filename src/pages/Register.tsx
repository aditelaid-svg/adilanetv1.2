import React, { useState } from 'react';
import { ArrowRight, UserPlus, Phone } from 'lucide-react';
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
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#0A84FF]/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-20%] w-[60%] h-[60%] bg-[#5E5CE6]/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-[#1C1C1E]/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#5E5CE6] to-[#0A84FF] flex items-center justify-center shadow-lg shadow-[#5E5CE6]/20 mb-5">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[26px] font-bold text-white tracking-tight">Daftar Akun</h1>
          <p className="text-white/50 text-[13px] font-medium mt-1">Buat akun untuk akses AdilaNet</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold tracking-wide uppercase text-white/50 mb-2">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Ahmad Fulan"
              className="w-full bg-white/[0.03] border border-white/10 rounded-[16px] px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0A84FF]/50 transition-all text-[15px]"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold tracking-wide uppercase text-white/50 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="email@example.com"
              className="w-full bg-white/[0.03] border border-white/10 rounded-[16px] px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0A84FF]/50 transition-all text-[15px]"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold tracking-wide uppercase text-white/50 mb-2">Nomor HP (opsional)</label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(''); }}
                placeholder="08xxxxxxxxxx"
                className="w-full bg-white/[0.03] border border-white/10 rounded-[16px] pl-11 pr-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0A84FF]/50 transition-all text-[15px]"
              />
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30" />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-semibold tracking-wide uppercase text-white/50 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              className="w-full bg-white/[0.03] border border-white/10 rounded-[16px] px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0A84FF]/50 transition-all text-[15px]"
              required
            />
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
              <p className="text-[13px] font-medium text-[#FF453A] bg-[#FF453A]/10 px-4 py-3 rounded-[12px] border border-[#FF453A]/20">
                {error}
              </p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0A84FF] hover:bg-[#0A84FF]/90 disabled:opacity-60 active:scale-[0.98] text-white font-semibold rounded-[16px] px-4 py-4 flex items-center justify-center gap-2 transition-transform mt-2 text-[15px]"
          >
            {loading ? 'Mendaftarkan...' : (
              <>Daftar Sekarang <ArrowRight className="w-[18px] h-[18px]" /></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[13px] font-medium text-white/40">Sudah punya akun?</p>
          <Link to="/login" className="text-[#0A84FF] font-semibold text-[13px] mt-1 inline-block">Masuk di sini</Link>
        </div>
      </motion.div>
    </div>
  );
}
