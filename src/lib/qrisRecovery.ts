export type QrisRecoveryPayment = {
  provider: string;
  purpose?: 'voucher' | 'topup';
  reference_id: string;
  qr_url: string;
  amount: number;
  base_amount: number;
  unique_code: number;
  expires_at: string;
};

const RECOVERY_PREFIX = 'adilanet:qris:';

export function qrisTopupRecoveryKey(userId: string) {
  return `${RECOVERY_PREFIX}user-${userId}:topup`;
}

export function qrisRecoveryKey(identityScope: string, packageId: string | number) {
  return `${RECOVERY_PREFIX}${identityScope}:package:${packageId}`;
}

export function readQrisRecovery(key: string | null): QrisRecoveryPayment | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.payment || typeof parsed.payment !== 'object') {
      window.sessionStorage.removeItem(key);
      return null;
    }
    const value = parsed.payment;
    const validQr = typeof value.qr_url === 'string' && value.qr_url.startsWith('data:image/png;base64,');
    const valid = value.provider === 'qiospay'
      && typeof value.reference_id === 'string' && value.reference_id.length > 0 && value.reference_id.length <= 100
      && validQr
      && Number.isFinite(value.amount) && value.amount > 0
      && Number.isFinite(value.base_amount) && value.base_amount >= 0
      && Number.isInteger(value.unique_code) && value.unique_code >= 0 && value.unique_code <= 999
      && value.amount === value.base_amount + value.unique_code
      && typeof value.expires_at === 'string' && Number.isFinite(Date.parse(value.expires_at));
    if (!valid) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    // Copy only the checkout metadata; never hydrate persisted voucher/status fields.
    return {
      provider: value.provider,
      ...(value.purpose === 'topup' || value.purpose === 'voucher' ? { purpose: value.purpose } : {}),
      reference_id: value.reference_id,
      qr_url: value.qr_url,
      amount: value.amount,
      base_amount: value.base_amount,
      unique_code: value.unique_code,
      expires_at: value.expires_at,
    };
  } catch {
    try { window.sessionStorage.removeItem(key); } catch { /* session storage may be blocked */ }
    return null;
  }
}

export function findLatestQrisRecovery(identityScope: string): { packageId: string; payment: QrisRecoveryPayment } | null {
  if (typeof window === 'undefined') return null;
  const prefix = `${RECOVERY_PREFIX}${identityScope}:package:`;
  let latest: { packageId: string; payment: QrisRecoveryPayment } | null = null;
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const packageId = key.slice(prefix.length);
      const payment = readQrisRecovery(key);
      if (!payment) continue;
      if (!latest || Date.parse(payment.expires_at) > Date.parse(latest.payment.expires_at)) {
        latest = { packageId, payment };
      }
    }
  } catch {
    return null;
  }
  return latest;
}

export function storeQrisRecovery(key: string | null, payment: QrisRecoveryPayment | null) {
  if (!key || typeof window === 'undefined') return;
  try {
    if (!payment) {
      window.sessionStorage.removeItem(key);
      return;
    }
    const { provider, purpose, reference_id, qr_url, amount, base_amount, unique_code, expires_at } = payment;
    window.sessionStorage.setItem(key, JSON.stringify({
      version: 1,
      payment: { provider, purpose, reference_id, qr_url, amount, base_amount, unique_code, expires_at },
    }));
  } catch {
    // A successful invoice remains usable in memory when browser storage is unavailable.
  }
}

export function clearQrisRecoveryForIdentity(identityScope: string | null) {
  if (!identityScope || typeof window === 'undefined') return;
  const prefix = `${RECOVERY_PREFIX}${identityScope}:`;
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(prefix)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}