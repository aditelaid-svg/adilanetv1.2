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

export interface ProfileInput {
  name: string;
  rateLimit?: string;
  sharedUsers?: string;
  sessionTimeout?: string;
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
  if (p.sessionTimeout) params.push(`=session-timeout=${p.sessionTimeout}`);
  return params;
}

export async function createProfile(config: MikrotikConfig, p: ProfileInput) {
  const api = connect(config);
  try {
    await api.connect();
    return await api.write('/ip/hotspot/user/profile/add', profileParams(p));
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
    return await api.write('/ip/hotspot/user/profile/set', [`=.id=${id}`, ...profileParams(p)]);
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
