import { readApiResponse } from './apiResponse';

const PENDING_KEY = 'adilanet_hotspot_pending';
type Pending = { code: string; routerId: number | null; createdAt: number };
export function clearPendingHotspotVoucher(): void {
  try { sessionStorage.removeItem(PENDING_KEY); } catch { /* Storage may be unavailable in captive browsers. */ }
}
export function getPendingHotspotVoucher(): Pending | null {
  try {
    const data = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
    return data && typeof data.code === 'string' && /^[\x21-\x7e]{1,128}$/.test(data.code) &&
      typeof data.createdAt === 'number' && Date.now() >= data.createdAt && Date.now() - data.createdAt < 30 * 60_000 &&
      (data.routerId === null || Number.isInteger(data.routerId)) ? data : null;
  } catch { return null; }
}
export async function connectHotspot(code: string, routerId?: number | null, automatic = false): Promise<{ redirect_url?: string; error?: string; on_network: boolean }> {
  const response = await fetch('/api/hotspot/connect', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, routerId: routerId ?? null, automatic }) });
  const json = await readApiResponse<{success:boolean;error?:string;data?:{redirect_url?:string;on_network:boolean;error?:string}}>(response);
  if (!response.ok || !json.success || !json.data) return { on_network: false, error: json.error || 'Login WiFi belum dapat disiapkan.' };
  if (json.data.redirect_url) {
    const target = new URL(json.data.redirect_url);
    if (!['http:', 'https:'].includes(target.protocol) || target.pathname !== '/login' || target.username || target.password) {
      return { on_network: false, error: 'Alamat hotspot tidak valid. Hubungi admin.' };
    }
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ code, routerId: routerId ?? null, createdAt: Date.now() })); } catch { /* QR receipt/server history still retains the purchased voucher. */ }
  }
  return json.data;
}
export function navigateToHotspot(url: string): void {
  window.location.assign(url);
}
export type HotspotConnectionStatus = {
  active: boolean;
  on_network: boolean;
  uptime?: string | null;
  session_time_left?: string | null;
  error?: string;
};
export async function hotspotConnection(code: string, signal?: AbortSignal): Promise<HotspotConnectionStatus> {
  const response = await fetch('/api/hotspot/connection', { method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }), signal });
  const json = await readApiResponse<{success:boolean;error?:string;data:{
    active:boolean;on_network:boolean;uptime?:string|null;session_time_left?:string|null;error?:string
  }}>(response);
  if (!response.ok || !json.success) throw new Error(json.error || 'Status WiFi belum dapat diperiksa.');
  return json.data;
}

function pauseVerification(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(new DOMException('Pemeriksaan dibatalkan.', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
}

// RouterOS may expose the active session shortly after its login redirect.
// Only a server-verified active session counts as success, never the URL flag.
export async function verifyHotspotConnection(code: string, options: {
  signal?: AbortSignal;
  read?: typeof hotspotConnection;
  pause?: typeof pauseVerification;
} = {}): Promise<HotspotConnectionStatus> {
  const read = options.read || hotspotConnection;
  const pause = options.pause || pauseVerification;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (options.signal?.aborted) throw new DOMException('Pemeriksaan dibatalkan.', 'AbortError');
    try {
      const result = await read(code, options.signal);
      if (options.signal?.aborted) throw new DOMException('Pemeriksaan dibatalkan.', 'AbortError');
      if (result.active || !result.on_network || result.error?.startsWith('Login ditolak MikroTik') || attempt === 4) return result;
    } catch (error) {
      if (options.signal?.aborted || attempt === 4) throw error;
    }
    await pause(1200, options.signal);
  }
  throw new Error('Status login belum dapat diperiksa.');
}