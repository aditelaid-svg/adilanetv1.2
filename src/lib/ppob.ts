import { readApiResponse } from './apiResponse';

export type PpobProduct = {
  sku: string; name: string; category: string; brand: string; description: string;
  sell_price: number; available: boolean;
};
export type PpobAdminProduct = PpobProduct & {
  cost_price: number; enabled: boolean; provider_active: boolean;
  fixed_price: number | null; markup: number | null; margin: number; synced_at: string;
};
export type PpobOrder = {
  id: string; reference: string; product_name: string; sku: string; customer_no: string;
  amount: number; status: 'pending' | 'success' | 'failed' | 'review';
  message: string; serial: string | null; created_at: string; updated_at: string;
  refunded_at: string | null; response_code?: string | null; cost_price?: number; user_name?: string;
};
export type PpobConfig = {
  enabled: boolean; mode: 'test' | 'live'; configured: boolean;
  api_configured: boolean; webhook_configured: boolean;
  default_markup: number; max_order: number; daily_limit: number;
  last_sync_at: string | null; provider_balance: number | null; connection_checked_at: string | null;
};
export type PpobCustomer = {
  csrf_token: string; enabled: boolean; reason: string | null; mode: 'test' | 'live';
  balance: number; has_pin: boolean; products: PpobProduct[]; orders: PpobOrder[];
};
export type PpobAdmin = {
  csrf_token: string; config: PpobConfig; products: PpobAdminProduct[]; orders: PpobOrder[];
  summary: { total: number; pending: number; success: number; failed: number; review: number; revenue: number; margin: number };
};
export type PpobQuote = {
  id: string; sku: string; product_name: string; customer_no: string; price: number; expires_at: string;
};
export class PpobApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request<T>(path: string, method = 'GET', body?: unknown, token?: string): Promise<T> {
  const response = await fetch(`/api/ppob${path}`, {
    method, credentials: 'include', cache: 'no-store',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { 'X-PPOB-CSRF': token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await readApiResponse<{ success: boolean; data: T; error?: string }>(response);
  if (!response.ok || !json.success) throw new PpobApiError(json.error || 'Layanan PPOB belum tersedia.', response.status);
  return json.data;
}
export const getPpobCustomer = () => request<PpobCustomer>('/customer');
export const getPpobAdmin = () => request<PpobAdmin>('/admin');
export const configurePpob = (token: string, data: Pick<PpobConfig, 'enabled' | 'mode' | 'default_markup' | 'max_order' | 'daily_limit'>) =>
  request<PpobConfig>('/admin/config', 'PUT', data, token);
export const syncPpobProducts = (token: string) => request<{ count: number }>('/admin/sync', 'POST', {}, token);
export const testPpobConnection = (token: string) => request<{ balance: number }>('/admin/connection', 'POST', {}, token);
export const updatePpobProduct = (token: string, sku: string, data: {
  name: string; description: string; enabled: boolean; fixed_price: number | null; markup: number | null;
}) => request<PpobAdminProduct>(`/admin/products/${encodeURIComponent(sku)}`, 'PATCH', data, token);
export const createPpobQuote = (token: string, sku: string, customer_no: string) =>
  request<PpobQuote>('/quotes', 'POST', { sku, customer_no }, token);
export const purchasePpob = (token: string, quote_id: string, pin: string, idempotency_key: string) =>
  request<PpobOrder>('/orders', 'POST', { quote_id, pin, idempotency_key }, token);
export const getPpobOrder = (id: string) => request<PpobOrder>(`/orders/${encodeURIComponent(id)}`);
export const recoverPpobOrder = (key: string, quoteId: string) =>
  request<{ order: PpobOrder | null; quote_expired: boolean }>(`/orders/recover/${encodeURIComponent(key)}?quote_id=${encodeURIComponent(quoteId)}`);
export const recheckPpobOrder = (token: string, id: string) =>
  request<{ queued: boolean }>(`/admin/orders/${encodeURIComponent(id)}/recheck`, 'POST', {}, token);