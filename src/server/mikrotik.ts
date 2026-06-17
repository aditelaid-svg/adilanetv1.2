import { RouterOSAPI } from 'routeros-api';

interface MikrotikConfig {
  host: string;
  user: string;
  pass: string;
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
    // Assuming Hotspot UserAdd command
    const result = await api.write('/ip/hotspot/user/add', {
      name,
      password,
      profile,
    });
    return result;
  } catch (error) {
    console.error('Mikrotik Error:', error);
    throw error;
  } finally {
    api.close();
  }
}
