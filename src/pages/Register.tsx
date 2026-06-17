import React, { useState } from 'react';
import { Router, ArrowRight, UserPlus } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Register() {
  const { registerUser } = useAppContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Semua kolom harus diisi.');
      return;
    }
    const success = registerUser(name, email);
    if (!success) {
      setError('Email sudah digunakan.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden relative font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-20%] w-[60%] h-[60%] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-slate-900/60 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Daftar Akun</h1>
          <p className="text-slate-400 text-sm mt-1">Buat akun untuk akses AdilaNet</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Ahmad Fulan"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="email@example.com"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all text-sm"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 mt-2"
          >
            Daftar Sekarang
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">Sudah punya akun?</p>
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-bold text-sm mt-1 inline-block">Masuk di sini</Link>
        </div>
      </motion.div>
    </div>
  );
}
