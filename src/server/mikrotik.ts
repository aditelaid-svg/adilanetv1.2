import { RouterOSAPI } from 'routeros-api';

interface MikrotikConfig {
  host: string;
  user: string;
  pass: string;
  port?: string | number;
}

export interface MikrotikProfile {
  id: string;
  name: string;
  sessionTimeout: string;
  validity: string;
  validityRaw: string;
  sharedUsers: string;
  rateLimit: string;
}

function parseTimeout(timeout: string): string {
  if (!timeout || timeout === '0s' || timeout === '' || timeout === '0') return 'Unlimited';
  const dayMatch = timeout.match(/^(\d+)d/);
  const timeMatch = timeout.match(/(\d{2}):(\d{2}):(\d{2})$/);
  const days = dayMatch ? parseInt(dayMatch[1]) : 0;
  const hours = timeMatch ? parseInt(timeMatch[1]) : 0;
  const minutes = timeMatch ? parseInt(timeMatch[2]) : 0;

  if (days > 0 && hours === 0 && minutes === 0) return `${days} Hari`;
  if (days > 0 && hours > 0) return `${days}h ${hours}j`;
  if (hours > 0 && minutes === 0) return `${hours} Jam`;
  if (hours > 0 && minutes > 0) return `${hours}j ${minutes}m`;
  if (minutes > 0) return `${minutes} Menit`;
  return timeout;
}

// Name of the single global scheduler that enforces fixed-validity expiry.
const REAPER_NAME = 'an-voucher-reaper';

// Convert a raw RouterOS-style duration ("30m" / "10h" / "7d") to total minutes.
function validityToMinutes(raw: string): number {
  const m = String(raw).match(/^(\d+)([mhd])$/);
  if (!m) return 0;
  const v = parseInt(m[1], 10);
  return m[2] === 'm' ? v : m[2] === 'h' ? v * 60 : v * 1440;
}

// Convert total minutes back to the shortest single-unit raw string.
function minutesToRaw(min: number): string {
  if (!min || min <= 0) return '';
  if (min % 1440 === 0) return `${min / 1440}d`;
  if (min % 60 === 0) return `${min / 60}h`;
  return `${min}m`;
}

// Turn a raw RouterOS duration like "10h" / "30m" / "7d" into a human label.
function humanizeValidity(raw: string): string {
  if (!raw) return '';
  const d = raw.match(/(\d+)d/);
  const h = raw.match(/(\d+)h/);
  const m = raw.match(/(\d+)m/);
  const parts: string[] = [];
  if (d) parts.push(`${parseInt(d[1])} Hari`);
  if (h) parts.push(`${parseInt(h[1])} Jam`);
  if (m) parts.push(`${parseInt(m[1])} Menit`);
  return parts.join(' ') || raw;
}

// Read the configured validity back out of the profile's on-login arming script.
// The arming script stamps the remaining minutes into the user comment, e.g.
// `... set comment=600 ...`, so we recover the duration from that number.
function parseOnLoginValidity(script: string): string {
  if (!script) return '';
  // Matches both the legacy `comment=600` and the current `comment=("600 " . $c)`.
  const m = String(script).match(/comment=\(?"?(\d+)/);
  return m ? minutesToRaw(parseInt(m[1], 10)) : '';
}

// Hotspot comment is shared with the validity countdown below, which detects an
// already-armed user by a LEADING DIGIT. So any identifier comment must never
// start with a digit, and must stay free of quotes/control chars that could
// disturb the on-login/reaper scripts. Keep it short for the RouterOS UI.
export function sanitizeComment(raw: string): string {
  let s = String(raw ?? '').replace(/[\x00-\x1f"]/g, '').replace(/\s+/g, ' ').trim();
  if (/^[0-9]/.test(s)) s = `#${s}`;
  return s.slice(0, 60);
}

// on-login arming script: on the FIRST login only (comment still empty), stamp
// the remaining validity in MINUTES into the hotspot user's comment. The global
// reaper scheduler then counts that number down once per minute. Counting starts
// at first login and runs on wall-clock time regardless of usage/reconnects.
function buildExpiryScript(validityRaw: string): string {
  const minutes = validityToMinutes(validityRaw);
  // Arm only if the comment isn't already counting down (a leading digit means
  // armed). We PREPEND the minutes to whatever identifier comment is there, so
  // the "dibuat oleh" tag set at creation survives alongside the countdown.
  return `:local id [/ip hotspot user find name=$user]; :if ([:len $id]>0) do={:local c [/ip hotspot user get $id comment]; :if (!($c~"^[0-9]")) do={/ip hotspot user set comment=("${minutes} " . $c) $id}}`;
}

// on-event for the single global reaper scheduler. Every minute it decrements the
// minute-counter stored in each armed user's comment and removes the user when it
// reaches zero. No per-user schedulers, no date math, no immediate-fire risk.
function reaperScript(): string {
  // Decrement the LEADING minute-counter of every armed user (comment starts
  // with a digit). The counter may be followed by a space + identifier text,
  // e.g. "599 User#5 Ahmad" — that trailing text is preserved on each tick.
  // Legacy pure-number comments ("599") have no space and still work.
  return `:foreach u in=[/ip hotspot user find where comment~"^[0-9]"] do={:local c [/ip hotspot user get $u comment]; :local sp [:find $c " "]; :local n $c; :local rest ""; :if ([:typeof $sp]="num") do={:set n [:pick $c 0 $sp]; :set rest [:pick $c $sp [:len $c]]}; :local r [:tonum $n]; :if ($r<=1) do={/ip hotspot user remove $u} else={/ip hotspot user set comment=(($r-1) . $rest) $u}}`;
}

// If a reaper scheduler already exists on this router, make sure it runs the
// LATEST script. Does NOT create one — routers without fixed-validity profiles
// don't need a reaper. Called on the voucher-provisioning path so the script
// format upgrade reaches already-deployed routers without waiting for an admin
// to edit a validity profile. Best-effort: never fails voucher creation.
async function syncReaperIfPresent(api: RouterOSAPI) {
  try {
    const existing = await api.write('/system/scheduler/print', [`?name=${REAPER_NAME}`]) as any[];
    if (Array.isArray(existing) && existing.length > 0) {
      const id = existing[0]['.id'] || existing[0].id;
      if (id) await api.write('/system/scheduler/set', [`=.id=${id}`, `=on-event=${reaperScript()}`]);
    }
  } catch (e: any) {
    console.warn('[Mikrotik] syncReaperIfPresent gagal:', e?.message || e);
  }
}

// Make sure the global reaper scheduler exists on the router (idempotent).
async function ensureReaper(api: RouterOSAPI) {
  const existing = await api.write('/system/scheduler/print', [`?name=${REAPER_NAME}`]) as any[];
  if (Array.isArray(existing) && existing.length > 0) {
    // Keep an already-installed reaper in sync with the latest script so format
    // changes (e.g. identifier-aware counting) propagate to existing routers.
    const id = existing[0]['.id'] || existing[0].id;
    if (id) {
      try {
        await api.write('/system/scheduler/set', [`=.id=${id}`, `=on-event=${reaperScript()}`]);
      } catch (e: any) {
        console.warn('[Mikrotik] ensureReaper gagal memperbarui scheduler:', e?.message || e);
      }
    }
    return;
  }
  await api.write('/system/scheduler/add', [
    `=name=${REAPER_NAME}`,
    `=interval=60s`,
    `=policy=read,write,test`,
    `=on-event=${reaperScript()}`,
  ]);
}

export async function getProfiles(config: MikrotikConfig): Promise<MikrotikProfile[]> {
  const port = config.port ? parseInt(String(config.port)) : 8728;
  const api = new RouterOSAPI({
    host: config.host,
    user: config.user,
    password: config.pass,
    port,
    timeout: 5000,
  });

  try {
    await api.connect();
    const result = await api.write('/ip/hotspot/user/profile/print') as any[];
    const profiles = Array.isArray(result) ? result : [];
    return profiles
      .filter((p: any) => p && p.name)
      .map((p: any) => {
        const rawSession = p['session-timeout'] || p.sessionTimeout || '';
        const validityRaw = parseOnLoginValidity(p['on-login'] || p.onLogin || '');
        return {
          id: p['.id'] || p.id || p.name,
          name: p.name,
          sessionTimeout: parseTimeout(rawSession),
          validityRaw,
          validity: validityRaw ? humanizeValidity(validityRaw) : parseTimeout(rawSession),
          sharedUsers: p['shared-users'] || p.sharedUsers || '1',
          rateLimit: p['rate-limit'] || p.rateLimit || 'N/A',
        };
      });
  } catch (error: any) {
    console.error('[Mikrotik] getProfiles error:', error?.message || error);
    throw error;
  } finally {
    try { api.close(); } catch {}
  }
}

export interface ProfileInput {
  name: string;
  rateLimit?: string;
  sharedUsers?: string;
  sessionTimeout?: string;
  validity?: string;
}

export interface ActiveUser {
  id: string;
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
  loginBy: string;
}

function toNum(v: any): number {
  const n = parseInt(String(v ?? '0'), 10);
  return Number.isFinite(n) ? n : 0;
}

// Read the live hotspot sessions currently connected to the router
// (RouterOS `/ip/hotspot/active`). Each row is one connected user.
export async function getActiveUsers(config: MikrotikConfig): Promise<ActiveUser[]> {
  const api = connect(config);
  try {
    await api.connect();
    const result = await api.write('/ip/hotspot/active/print') as any[];
    const rows = Array.isArray(result) ? result : [];
    return rows
      .filter((r: any) => r && (r.user || r['.id']))
      .map((r: any) => ({
        id: r['.id'] || r.id || '',
        user: r.user || '-',
        address: r.address || '',
        macAddress: r['mac-address'] || r.macAddress || '',
        uptime: parseUptime(r.uptime || ''),
        bytesIn: toNum(r['bytes-in'] ?? r.bytesIn),
        bytesOut: toNum(r['bytes-out'] ?? r.bytesOut),
        loginBy: r['login-by'] || r.loginBy || '',
      }));
  } catch (error: any) {
    console.error('[Mikrotik] getActiveUsers error:', error?.message || error);
    throw error;
  } finally {
    try { api.close(); } catch {}
  }
}

// RouterOS uptime is like "1d2h3m4s" / "2h15m" / "45s". Normalise to a short label.
function parseUptime(up: string): string {
  if (!up) return '-';
  const d = up.match(/(\d+)d/);
  const h = up.match(/(\d+)h/);
  const m = up.match(/(\d+)m(?!s)/);
  const s = up.match(/(\d+)s/);
  const days = d ? parseInt(d[1]) : 0;
  const hours = h ? parseInt(h[1]) : 0;
  const mins = m ? parseInt(m[1]) : 0;
  const secs = s ? parseInt(s[1]) : 0;
  if (days > 0) return hours > 0 ? `${days}h ${hours}j` : `${days} Hari`;
  if (hours > 0) return mins > 0 ? `${hours}j ${mins}m` : `${hours} Jam`;
  if (mins > 0) return `${mins} Menit`;
  if (secs > 0) return `${secs} Detik`;
  return up;
}

function connect(config: MikrotikConfig): RouterOSAPI {
  const port = config.port ? parseInt(String(config.port)) : 8728;
  return new RouterOSAPI({
    host: config.host,
    user: config.user,
    password: config.pass,
    port,
    timeout: 5000,
  });
}

function profileParams(p: ProfileInput): string[] {
  const params: string[] = [`=name=${p.name}`];
  if (p.rateLimit) params.push(`=rate-limit=${p.rateLimit}`);
  if (p.sharedUsers) params.push(`=shared-users=${p.sharedUsers}`);
  if (p.validity) {
    // Fixed validity from first login: enforce via on-login scheduler, and clear
    // the per-session timeout (0s = none) so usage isn't cut short within the window.
    params.push(`=on-login=${buildExpiryScript(p.validity)}`);
    params.push(`=session-timeout=0s`);
  } else if (p.sessionTimeout) {
    params.push(`=session-timeout=${p.sessionTimeout}`);
  }
  return params;
}

export async function createProfile(config: MikrotikConfig, p: ProfileInput) {
  const api = connect(config);
  try {
    await api.connect();
    const result = await api.write('/ip/hotspot/user/profile/add', profileParams(p));
    if (p.validity) await ensureReaper(api);
    return result;
  } catch (error: any) {
    console.error('[Mikrotik] createProfile error:', error?.message || error);
    throw error;
  } finally {
    try { api.close(); } catch {}
  }
}

export async function updateProfile(config: MikrotikConfig, id: string, p: ProfileInput) {
  const api = connect(config);
  try {
    await api.connect();
    const result = await api.write('/ip/hotspot/user/profile/set', [`=.id=${id}`, ...profileParams(p)]);
    if (p.validity) await ensureReaper(api);
    return result;
  } catch (error: any) {
    console.error('[Mikrotik] updateProfile error:', error?.message || error);
    throw error;
  } finally {
    try { api.close(); } catch {}
  }
}

export async function deleteProfile(config: MikrotikConfig, id: string) {
  const api = connect(config);
  try {
    await api.connect();
    return await api.write('/ip/hotspot/user/profile/remove', [`=.id=${id}`]);
  } catch (error: any) {
    console.error('[Mikrotik] deleteProfile error:', error?.message || error);
    throw error;
  } finally {
    try { api.close(); } catch {}
  }
}

export async function createVoucher(
  config: MikrotikConfig,
  profile: string,
  name: string,
  password: string,
  comment?: string
) {
  const port = config.port ? parseInt(String(config.port)) : 8728;
  const api = new RouterOSAPI({
    host: config.host,
    user: config.user,
    password: config.pass,
    port,
    timeout: 5000,
  });

  try {
    await api.connect();
    const params = [
      `=name=${name}`,
      `=password=${password}`,
      `=profile=${profile}`,
    ];
    // Identifier of who/where this voucher was generated from. Visible in
    // MikroTik/Mikhmon as the user comment. Sanitized so it can never collide
    // with the validity countdown (which keys off a leading digit).
    const c = sanitizeComment(comment ?? '');
    if (c) params.push(`=comment=${c}`);
    const result = await api.write('/ip/hotspot/user/add', params);
    // Push the latest reaper script to routers that already run one, so the new
    // identifier-aware comment format is counted down correctly even before any
    // profile is re-edited. Best-effort; never blocks voucher creation.
    await syncReaperIfPresent(api);
    return result;
  } catch (error: any) {
    console.error('[Mikrotik] createVoucher error:', error?.message || error);
    throw error;
  } finally {
    try { api.close(); } catch {}
  }
}
