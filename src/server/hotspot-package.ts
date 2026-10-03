import crypto from 'node:crypto';

export type PortalConfig = { routerId: number; loginUrl: string; portalUrl: string; enabled: boolean };
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function entryToken(config: PortalConfig, secret: string): string {
  return crypto.createHmac('sha256', secret).update(JSON.stringify([config.routerId, config.loginUrl, config.portalUrl])).digest('hex');
}
export function matchesEntryToken(value: unknown, expected: string): boolean {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) && crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

// Byte-oriented MD5 is required by RouterOS HTTP-CHAP; it is not used to store passwords.
export function chapMd5(input: number[]): string {
  const size = Math.ceil((input.length + 9) / 64) * 64;
  const bytes = new Uint8Array(size);
  bytes.set(input); bytes[input.length] = 128;
  const view = new DataView(bytes.buffer);
  view.setUint32(size - 8, (input.length * 8) >>> 0, true);
  view.setUint32(size - 4, Math.floor(input.length / 536870912), true);
  const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  const shifts = [7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
  for (let offset = 0; offset < size; offset += 64) {
    let a = state[0], b = state[1], c = state[2], d = state[3];
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const sum = (a + f + Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) + view.getUint32(offset + g * 4, true)) | 0;
      const shift = shifts[Math.floor(i / 16) * 4 + i % 4];
      const next = (b + ((sum << shift) | (sum >>> (32 - shift)))) | 0;
      a = d; d = c; c = b; b = next;
    }
    state[0] = (state[0] + a) | 0; state[1] = (state[1] + b) | 0;
    state[2] = (state[2] + c) | 0; state[3] = (state[3] + d) | 0;
  }
  let result = '';
  for (const word of state) for (let j = 0; j < 4; j++) result += ((word >>> (j * 8)) & 255).toString(16).padStart(2, '0');
  return result;
}

export function hotspotFiles(config: PortalConfig, secret: string): Record<string, string> {
  const base = config.portalUrl.replace(/\/$/, '');
  const entry = `${base}/api/hotspot/entry`;
  const portal = `${base}/hotspot`;
  const shell = (title: string, body: string) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${esc(title)} · AdilaNet</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#e0f2fe,#99f6e4);color:#1e293b;font:16px system-ui,sans-serif}main{margin:20px;padding:28px;max-width:420px;background:#ffffffed;border-radius:26px;box-shadow:0 16px 50px #0369a122}h1{font-size:25px}p{line-height:1.6}a,button{display:inline-block;padding:12px 18px;background:#0284c7;border:0;border-radius:12px;color:white;text-decoration:none;font:inherit}small{display:block;margin-top:16px;color:#64748b}</style></head><body><main>${body}</main></body></html>`;
  const login = shell('Hotspot', `<h1>AdilaNet</h1><p id="message">Membuka portal Login Voucher &amp; Beli Voucher…</p>
<form id="entry" method="get" action="${esc(entry)}"><input type="hidden" name="router" value="${config.routerId}"><input type="hidden" name="entry" value="${entryToken(config, secret)}"><input type="hidden" name="mac" value="$(mac)"><input type="hidden" name="ip" value="$(ip)"><input type="hidden" name="error" value="$(error-esc)"><button type="submit">Buka portal AdilaNet</button></form>
<form id="native" method="post" action="$(link-login-only)"><input type="hidden" name="username"><input type="hidden" name="password"><input type="hidden" name="dst" value="${esc(portal)}?connected=1"><input type="hidden" name="popup" value="false"></form>
<small>Sudah punya voucher? Masukkan di portal AdilaNet. Jika portal tidak terbuka, periksa koneksi server dan walled garden.</small>
<script>
var digest=${chapMd5.toString()};
var chapId="$(chap-id)",challenge="$(chap-challenge)";
var params=new URLSearchParams(location.hash.slice(1)),code=params.get("an-voucher");
if(code && /^[\\x21-\\x7e]{1,128}$/.test(code)){
 history.replaceState(null,"",location.pathname+location.search);
 var form=document.getElementById("native");form.elements.username.value=code;
 if(chapId.length && chapId.indexOf("$(")!==0){
  var data=[chapId.charCodeAt(0)];for(var i=0;i<code.length;i++)data.push(code.charCodeAt(i));for(var j=0;j<challenge.length;j++)data.push(challenge.charCodeAt(j));
  form.elements.password.value=digest(data);
 }else{form.elements.password.value=code;}
 document.getElementById("message").textContent="Mencoba login WiFi sesuai voucher…";form.submit();
}else{document.getElementById("entry").submit();}
</script>`);
  const redirect = shell('Mengalihkan', `<h1>AdilaNet</h1><p>Melanjutkan ke portal…</p><a id="continue" href="$(link-redirect)">Lanjutkan</a><script>location.replace(document.getElementById("continue").href);</script>`);
  return {
    'login.html': login,
    'alogin.html': redirect,
    'redirect.html': redirect,
    'rlogin.html': shell('Login', '<h1>AdilaNet</h1><p>Membuka halaman hotspot…</p><a id="login" href="$(link-login-only)">Login WiFi</a><script>location.replace(document.getElementById("login").href);</script>'),
    'status.html': shell('Status WiFi', `<h1>WiFi AdilaNet</h1><p>Pengguna: $(username)<br>Terhubung selama: $(uptime)<br>Sisa sesi: $(session-time-left)</p><a href="${esc(portal)}">Portal AdilaNet</a> <a href="$(link-logout)">Keluar WiFi</a>`),
    'logout.html': shell('Keluar WiFi', '<h1>Sesi WiFi selesai</h1><p>Anda dapat masuk kembali menggunakan voucher yang masih berlaku.</p><a href="$(link-login)">Login Voucher</a>'),
    'error.html': shell('Login belum berhasil', `<h1>Login WiFi belum berhasil</h1><p>Periksa voucher atau hubungi admin AdilaNet.</p><a href="${esc(portal)}">Kembali ke portal</a>`),
    'BACA-DULU.txt': `ADILANET HOTSPOT\n\n1. Cadangkan folder hotspot lama. Jangan reset router atau hapus voucher.\n2. Unggah folder hotspot-adilanet beserta semua isinya ke flash MikroTik.\n3. IP > Hotspot > Server Profiles: pilih profil yang digunakan, HTML Directory = flash/hotspot-adilanet.\n4. Izinkan domain ${new URL(base).hostname} dan resource server pada walled garden (HTTP/HTTPS). Pembayaran melalui aplikasi bank mungkin tetap membutuhkan data seluler.\n5. Login URL yang tersimpan: ${config.loginUrl}\n6. Portal: ${portal}\n7. Pertahankan autentikasi CHAP; HTTPS gateway harus memakai sertifikat valid. Jangan menonaktifkan keamanan untuk mengejar login otomatis.\n8. Uji voucher lama, QRIS, saldo dan login dari ponsel di WiFi. Tanpa konteks hotspot/di luar jaringan, sistem menampilkan kode dan tidak memaksa login.\n9. Login otomatis bersifat upaya terbaik; browser dapat meminta konfirmasi pada form HTTP atau membatasi captive portal. Voucher tetap dapat digunakan manual.\n10. Jika mengubah URL server/gateway, simpan pengaturan lalu unduh ulang paket.\n\nTidak ada password admin router atau kunci pembayaran di paket ini. Paket tidak mengubah konfigurasi router otomatis.\n`,
  };
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
// Small dependency-free ZIP (stored entries); no filesystem or shell execution.
export function zipHotspot(files: Record<string, string>): Buffer {
  const local: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const filename = Buffer.from(`hotspot-adilanet/${name}`), data = Buffer.from(content);
    const crc = crc32(data), header = Buffer.alloc(30), directory = Buffer.alloc(46);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(filename.length, 26);
    directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6);
    directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(data.length, 20); directory.writeUInt32LE(data.length, 24);
    directory.writeUInt16LE(filename.length, 28); directory.writeUInt32LE(offset, 42);
    local.push(header, filename, data); central.push(directory, filename); offset += header.length + filename.length + data.length;
  }
  const c = Buffer.concat(central), end = Buffer.alloc(22), count = Object.keys(files).length;
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10);
  end.writeUInt32LE(c.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, c, end]);
}