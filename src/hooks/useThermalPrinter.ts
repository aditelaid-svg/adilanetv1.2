import { useState, useCallback, useRef } from 'react';

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'printing' | 'error';

// Known BLE thermal printer service + characteristic pairs
// (Covers: Goojprt, RPP, MTP-II, PeriPage, GB03, InnPocket, XPrinter BLE, etc.)
const PRINTER_PROFILES = [
  { service: '000018f0-0000-1000-8000-00805f9b34fb', characteristic: '00002af1-0000-1000-8000-00805f9b34fb' },
  { service: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', characteristic: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' },
  { service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', characteristic: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
];

function mergeArrays(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

const enc = new TextEncoder();

// ESC/POS command helpers
export const ESC_POS = {
  init:        () => new Uint8Array([0x1B, 0x40]),
  alignLeft:   () => new Uint8Array([0x1B, 0x61, 0x00]),
  alignCenter: () => new Uint8Array([0x1B, 0x61, 0x01]),
  boldOn:      () => new Uint8Array([0x1B, 0x45, 0x01]),
  boldOff:     () => new Uint8Array([0x1B, 0x45, 0x00]),
  normalSize:  () => new Uint8Array([0x1D, 0x21, 0x00]),
  doubleWidth: () => new Uint8Array([0x1D, 0x21, 0x10]),
  bigSize:     () => new Uint8Array([0x1D, 0x21, 0x11]),
  feed:        (n = 3) => new Uint8Array([0x1B, 0x64, n]),
  cut:         () => new Uint8Array([0x1D, 0x56, 0x41, 0x05]),
  text:        (s: string) => enc.encode(s + '\n'),
  line:        (char = '-', len = 32) => enc.encode(char.repeat(len) + '\n'),
};

export function buildVoucherESC(
  codes: { user: string; pass: string }[],
  profile: string,
  duration: string,
  price: string,
  loginMode: string
): Uint8Array {
  const parts: Uint8Array[] = [];
  const push = (u: Uint8Array) => parts.push(u);

  push(ESC_POS.init());

  // Header
  push(ESC_POS.alignCenter());
  push(ESC_POS.bigSize());
  push(ESC_POS.boldOn());
  push(ESC_POS.text('AdilaNet'));
  push(ESC_POS.normalSize());
  push(ESC_POS.text('Voucher WiFi'));
  push(ESC_POS.boldOff());
  push(ESC_POS.line('='));

  // Info
  push(ESC_POS.alignLeft());
  push(ESC_POS.text(`Profil : ${profile}`));
  push(ESC_POS.text(`Durasi : ${duration || 'N/A'}`));
  push(ESC_POS.text(`Harga  : Rp ${parseInt(price || '0').toLocaleString('id-ID')}`));
  push(ESC_POS.text(`Jumlah : ${codes.length} voucher`));
  push(ESC_POS.line('='));

  // Each voucher code
  for (const code of codes) {
    push(ESC_POS.alignCenter());
    push(ESC_POS.boldOn());
    push(ESC_POS.doubleWidth());
    push(ESC_POS.text(code.user));
    push(ESC_POS.normalSize());
    push(ESC_POS.boldOff());
    if (loginMode === 'separate') {
      push(ESC_POS.text(`Pass: ${code.pass}`));
    }
    push(ESC_POS.line('-'));
  }

  push(ESC_POS.feed(4));
  push(ESC_POS.cut());

  return mergeArrays(...parts);
}

export function useThermalPrinter() {
  const [status, setStatus] = useState<PrinterStatus>('disconnected');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const charRef = useRef<any>(null);
  const deviceRef = useRef<any>(null);

  const isSupported = typeof navigator !== 'undefined' && 'bluetooth' in (navigator as any);

  const connect = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Browser tidak mendukung Web Bluetooth. Gunakan Chrome di Android atau Chrome/Edge di PC.');
      setStatus('error');
      return false;
    }
    setStatus('connecting');
    setError(null);
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
          { services: ['e7810a71-73ae-499d-8c15-faa9aef0c3f2'] },
          { services: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] },
        ],
        optionalServices: PRINTER_PROFILES.map(p => p.service),
      });

      deviceRef.current = device;
      device.addEventListener('gattserverdisconnected', () => {
        charRef.current = null;
        setStatus('disconnected');
        setDeviceName(null);
      });

      const server = await device.gatt.connect();

      let found = false;
      for (const { service, characteristic } of PRINTER_PROFILES) {
        try {
          const svc = await server.getPrimaryService(service);
          const chr = await svc.getCharacteristic(characteristic);
          charRef.current = chr;
          found = true;
          break;
        } catch {
          // try next profile
        }
      }

      if (!found) {
        throw new Error('Printer tidak dikenali. Pastikan printer thermal BLE dalam kondisi menyala dan paired.');
      }

      setDeviceName(device.name || 'Printer');
      setStatus('connected');
      return true;
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.name === 'SecurityError') {
        // User closed the browser device picker — not an error
        setStatus('disconnected');
        return false;
      }
      setError(err?.message || 'Gagal terhubung ke printer.');
      setStatus('error');
      return false;
    }
  }, [isSupported]);

  const disconnect = useCallback(() => {
    try { deviceRef.current?.gatt?.disconnect(); } catch {}
    charRef.current = null;
    deviceRef.current = null;
    setStatus('disconnected');
    setDeviceName(null);
    setError(null);
  }, []);

  const print = useCallback(async (data: Uint8Array): Promise<void> => {
    const chr = charRef.current;
    if (!chr) throw new Error('Printer belum terhubung.');
    setStatus('printing');
    setError(null);
    try {
      const CHUNK = 100;
      for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        try {
          await chr.writeValueWithoutResponse(chunk);
        } catch {
          await chr.writeValue(chunk);
        }
        await new Promise(r => setTimeout(r, 30));
      }
      setStatus('connected');
    } catch (err: any) {
      setError(err?.message || 'Gagal mencetak ke printer.');
      setStatus('error');
      throw err;
    }
  }, []);

  return { status, deviceName, error, isSupported, connect, disconnect, print };
}
