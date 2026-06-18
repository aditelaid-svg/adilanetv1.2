import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, MessageCircle, HelpCircle, Clock, ShieldCheck, Wifi } from 'lucide-react';

const FAQ: { q: string; a: string }[] = [
  { q: 'Bagaimana cara membeli voucher?', a: 'Pilih paket di menu Paket, lalu bayar dengan saldo atau QRIS. Kode voucher akan langsung muncul dan tersimpan di Riwayat.' },
  { q: 'Voucher saya tidak bisa dipakai login', a: 'Pastikan kode diketik benar (huruf besar/kecil sama). Jika tetap gagal, hubungi admin via WhatsApp di bawah.' },
  { q: 'Berapa lama masa aktif voucher?', a: 'Masa aktif mengikuti paket yang dibeli dan mulai dihitung sejak login pertama ke WiFi.' },
  { q: 'Pembayaran berhasil tapi voucher belum muncul', a: 'Tunggu beberapa saat lalu cek menu Riwayat. Jika lebih dari 5 menit belum masuk, hubungi admin via WhatsApp.' },
];

export default function UserHelp() {
  const navigate = useNavigate();
  const [waNumber, setWaNumber] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config/public')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setWaNumber(json.data.whatsappNumber || '');
          setWaMessage(json.data.whatsappMessage || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openWhatsApp = () => {
    if (!waNumber) return;
    const text = waMessage ? `?text=${encodeURIComponent(waMessage)}` : '';
    window.open(`https://wa.me/${waNumber}${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-6 pb-24 pt-14 h-full overflow-y-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-[14px] font-medium mb-4 -ml-1"
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={2} />
        Kembali
      </button>

      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-slate-800 mb-1">Pusat Bantuan</h1>
        <p className="text-slate-500 text-[14px]">Butuh bantuan? Tim kami siap membantu Anda.</p>
      </div>

      <div className="space-y-5">
        {/* WhatsApp contact card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-[28px] overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-[0_12px_30px_rgba(16,185,129,0.3)]"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-[14px] bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <MessageCircle className="w-6 h-6" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="font-bold text-[17px]">Chat via WhatsApp</h2>
              <p className="text-white/80 text-[12px]">Respon cepat di jam operasional</p>
            </div>
          </div>
          <p className="text-white/90 text-[13px] leading-relaxed mb-5">
            Tekan tombol di bawah untuk langsung terhubung dengan admin AdilaNet melalui WhatsApp.
          </p>
          {loading ? (
            <div className="w-full h-[52px] rounded-[18px] bg-white/20 animate-pulse" />
          ) : waNumber ? (
            <button
              onClick={openWhatsApp}
              className="w-full bg-white text-emerald-600 font-bold py-3.5 rounded-[18px] flex items-center justify-center gap-2 text-[15px] active:scale-95 transition-transform shadow-sm"
            >
              <MessageCircle className="w-5 h-5" strokeWidth={2} />
              Hubungi Admin Sekarang
            </button>
          ) : (
            <div className="w-full bg-white/15 text-white/90 font-medium py-3.5 rounded-[18px] text-center text-[13px]">
              Nomor bantuan belum tersedia
            </div>
          )}
        </motion.div>

        {/* Quick info chips */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Clock, label: 'Respon Cepat' },
            { icon: ShieldCheck, label: 'Transaksi Aman' },
            { icon: Wifi, label: 'Internet Stabil' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="glass rounded-[20px] p-3.5 flex flex-col items-center gap-2 text-center">
              <Icon className="w-5 h-5 text-teal-500" strokeWidth={1.8} />
              <span className="text-[11px] font-medium text-slate-600 leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="glass-strong rounded-[28px] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/60 flex items-center gap-2">
            <HelpCircle className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.8} />
            <h2 className="font-semibold text-[12px] tracking-wide uppercase text-slate-400">Pertanyaan Umum</h2>
          </div>
          <div className="divide-y divide-slate-200/60">
            {FAQ.map((item, i) => (
              <div key={i} className="p-5">
                <p className="text-[14px] font-semibold text-slate-800 mb-1.5">{item.q}</p>
                <p className="text-[13px] text-slate-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
