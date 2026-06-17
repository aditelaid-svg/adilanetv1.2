import { RouterOSAPI } from 'routeros-api';

interface MikrotikConfig {
  host: string;
  user: string;
  pass: string;
}

export interface MikrotikProfile {
  id: string;
  name: string;
  sessionTimeout: string;
  sharedUsers: string;
  rateLimit: string;
}

function parseTimeout(timeout: string): string {
  if (!timeout || timeout === '0s' || timeout === '') return 'Unlimited';
  // convert RouterOS duration like "1d00:00:00" or "00:30:00" to readable
  const dayMatch = timeout.match(/^(\d+)d/);
  const timeMatch = timeout.match(/(\d{2}):(\d{2}):(\d{2})$/);
  const days = dayMatch ? parseInt(dayMatch[1]) : 0;
  const hours = timeMatch ? parseInt(timeMatch[1]) : 0;
  const minutes = timeMatch ? parseInt(timeMatch[2]) : 0;

  if (days > 0 && hours === 0 && minutes === 0) return `${days} Hari`;
  if (days > 0 && hours > 0) return `${days}d ${hours}j`;
  if (hours > 0 && minutes === 0) return `${hours} Jam`;
  if (hours > 0 && minutes > 0) return `${hours}j ${minutes}m`;
  if (minutes > 0) return `${minutes} Menit`;
  return timeout;
}

export async function getProfiles(config: MikrotikConfig): Promise<MikrotikProfile[]> {
  const api = new RouterOSAPI({
    host: config.host,
    user: config.user,
    password: config.pass,
    timeout: 5000,
  });

  try {
    await api.connect();
    const result = await api.write('/ip/hotspot/user/profile/print') as any[];
    return result.map((p: any) => ({
      id: p['.id'] || p.id,
      name: p.name,
      sessionTimeout: parseTimeout(p['session-timeout'] || ''),
      sharedUsers: p['shared-users'] || '1',
      rateLimit: p['rate-limit'] || 'N/A',
    }));
  } catch (error) {
    console.error('Mikrotik getProfiles Error:', error);
    throw error;
  } finally {
    api.close();
  }
}

export async function createVoucher(config: MikrotikConfig, profile: string, name: string, password: string) {
  const api = new RouterOSAPI({
    host: config.host,
    user: config.user,
    password: config.pass,
    timeout: 5000,
  });

  try {
    await api.connect();
    const result = await api.write('/ip/hotspot/user/add', {
      name,
      password,
      profile,
    });
    return result;
  } catch (error) {
    console.error('Mikrotik createVoucher Error:', error);
    throw error;
  } finally {
    api.close();
  }
}
