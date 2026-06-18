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
      .map((p: any) => ({
        id: p['.id'] || p.id || p.name,
        name: p.name,
        sessionTimeout: parseTimeout(p['session-timeout'] || p.sessionTimeout || ''),
        sharedUsers: p['shared-users'] || p.sharedUsers || '1',
        rateLimit: p['rate-limit'] || p.rateLimit || 'N/A',
      }));
  } catch (error: any) {
    console.error('[Mikrotik] getProfiles error:', error?.message || error);
    throw error;
  } finally {
    try { api.close(); } catch {}
  }
}

export async function createVoucher(
  config: MikrotikConfig,
  profile: string,
  name: string,
  password: string
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
    const result = await api.write('/ip/hotspot/user/add', [
      `=name=${name}`,
      `=password=${password}`,
      `=profile=${profile}`,
    ]);
    return result;
  } catch (error: any) {
    console.error('[Mikrotik] createVoucher error:', error?.message || error);
    throw error;
  } finally {
    try { api.close(); } catch {}
  }
}
