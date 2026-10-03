import { readApiResponse } from './apiResponse';

const PENDING_KEY = 'adilanet_hotspot_pending';
type Pending = { code: string; routerId: number | null; createdAt: number };
export function getPendingHotspotVoucher(): Pending | null {
  try {
    const data = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
    return data && typeof data.code === 'string' && /^[\x21-\x7e]{1,128}$/.test(data.code) &&
      typeof data.createdAt === 'number' && Date.now() - data.createdAt < 30 * 60_000 &&
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
export async function hotspotConnection(code: string): Promise<{active:boolean;on_network:boolean;error?:string}> {
  const response = await fetch('/api/hotspot/connection', { method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
  const json = await readApiResponse<{success:boolean;error?:string;data:{active:boolean;on_network:boolean;error?:string}}>(response);
  if (!response.ok || !json.success) throw new Error(json.error || 'Status WiFi belum dapat diperiksa.');
  return json.data;
}