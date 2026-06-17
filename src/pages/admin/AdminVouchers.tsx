import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { Ticket, Plus, Save, Download, Printer, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MOCK_MIKROTIK_PROFILES = [
  { id: 'prof-1', name: '1Mbps - Umum (User)' },
  { id: 'prof-2', name: '2Mbps - Premium (User)' },
  { id: 'prof-3', name: '5Mbps - VVIP (User)' }
];

export default function AdminVouchers() {
  const { routers } = useAppContext();
  const [showGenerate, setShowGenerate] = useState(false);
  
  const [selectedRouter, setSelectedRouter] = useState('');
  const [mikrotikProfile, setMikrotikProfile] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [codeFormat, setCodeFormat] = useState('alphanumeric'); // numbers, alphanumeric
  const [loginMode, setLoginMode] = useState('user_is_pass'); // user_is_pass, separate
  const [quantity, setQuantity] = useState('10');
  
  const [generatedCodes, setGeneratedCodes] = useState<{user: string, pass: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // When router changes, we can "fetch" profiles. Here we just reset.
    setMikrotikProfile('');
  }, [selectedRouter]);

  const generateRandomCode = (format: string) => {
    const chars = format === 'numbers' ? '0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for(let i=0; i<6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouter || !mikrotikProfile || !price || !duration || !quantity) return;
    
    setIsGenerating(true);
    
    // Simulate generation delay
    setTimeout(() => {
        const qty = parseInt(quantity);
        const codes = [];
        for(let i=0; i<qty; i++) {
            const user = generateRandomCode(codeFormat);
            const pass = loginMode === 'user_is_pass' ? user : generateRandomCode(codeFormat);
            codes.push({ user, pass });
        }
        setGeneratedCodes(codes);
        setIsGenerating(false);
        setShowGenerate(false);
    }, 800);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Voucher AdilaNet</h1>
          <p className="text-sm text-slate-400">Generate & kelola voucher</p>
        </div>
        <button 
          onClick={() => setShowGenerate(true)}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" /> Bikin
        </button>
      </div>

      {generatedCodes.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-5 shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emerald-400" />
              {generatedCodes.length} Voucher Berhasil Dibuat
            </h3>
            <button className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white" title="Print">
              <Printer className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {generatedCodes.map((code, idx) => (
              <div key={idx} className="bg-black/40 border border-white/5 rounded-xl px-3 py-2 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-sm text-cyan-400 font-bold tracking-wider">{code.user}</span>
                {loginMode === 'separate' && (
                  <span className="font-mono text-xs text-white/50 tracking-wider">Pass: {code.pass}</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Render existing transaction vouchers here to represent existing ones */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-lg">
        <h3 className="font-bold text-white mb-4">Voucher Aktif Terkini</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
               <Ticket className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">Voucher yang sudah terpakai ada di tab Transaksi.</p>
        </div>
      </div>

      <AnimatePresence>
        {showGenerate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
          >
             <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative my-auto"
            >
               <button 
                  onClick={() => setShowGenerate(false)} 
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-slate-400 hover:text-white"
                >
                  X
                </button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-cyan-500/20 text-cyan-500 rounded-xl flex items-center justify-center">
                        <Settings2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Generate Voucher</h3>
                </div>

                <form onSubmit={handleGenerate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Pilih Router</label>
                    <select
                      value={selectedRouter}
                      onChange={e => setSelectedRouter(e.target.value)}
                      className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 appearance-none"
                      required
                    >
                      <option value="" disabled className="bg-slate-900 text-slate-500">Pilih Router...</option>
                      {routers.map(r => (
                        <option value={r.id} key={r.id} className="bg-slate-900">{r.name} - {r.ip_address}</option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedRouter && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Profil MikroTik (Sync)</label>
                        <select
                          value={mikrotikProfile}
                          onChange={e => setMikrotikProfile(e.target.value)}
                          className="w-full bg-cyan-900/20 border border-cyan-500/30 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 appearance-none"
                          required
                        >
                          <option value="" disabled className="bg-slate-900 text-slate-500">Pilih Profil (Limitasi Kecepatan)...</option>
                          {MOCK_MIKROTIK_PROFILES.map(p => (
                            <option value={p.id} key={p.id} className="bg-slate-900">{p.name}</option>
                          ))}
                        </select>
                      </div>
                  )}

                  <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Harga (Rp)</label>
                        <input
                          type="number"
                          placeholder="Contoh: 5000"
                          value={price}
                          onChange={e => setPrice(e.target.value)}
                          className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Durasi</label>
                        <input
                          type="text"
                          placeholder="Contoh: 12h, 1d, 30d"
                          value={duration}
                          onChange={e => setDuration(e.target.value)}
                          className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                          required
                        />
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Format Kode</label>
                        <select
                          value={codeFormat}
                          onChange={e => setCodeFormat(e.target.value)}
                          className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                        >
                          <option value="alphanumeric" className="bg-slate-900">Campur (A-Z, 0-9)</option>
                          <option value="numbers" className="bg-slate-900">Angka Saja (0-9)</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Login Mode</label>
                        <select
                          value={loginMode}
                          onChange={e => setLoginMode(e.target.value)}
                          className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                        >
                          <option value="user_is_pass" className="bg-slate-900">User = Pass</option>
                          <option value="separate" className="bg-slate-900">User & Pass Beda</option>
                        </select>
                      </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Jumlah Voucher</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={isGenerating}
                    className="w-full bg-cyan-500 disabled:opacity-50 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl mt-6 flex items-center justify-center gap-2"
                  >
                    {isGenerating ? "Membikin..." : (
                        <>
                            <Ticket className="w-5 h-5" /> Buat Voucher
                        </>
                    )}
                  </button>
                </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

