import crypto from 'node:crypto';
import type { Express, Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { Pool } from 'pg';
import { PpobError } from './digiflazz-client';
import { PpobService } from './ppob-service';

export function ppobCsrf(secret: string, sessionId: string, userId: number): string {
  return crypto.createHmac('sha256', secret).update(`ppob-csrf:${sessionId}:${userId}`).digest('hex');
}
export function validPpobCsrf(expected: string, received: unknown): boolean {
  if (typeof received !== 'string' || !/^[a-f0-9]{64}$/.test(received)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}
export function sameOrigin(origin: unknown, host: string | undefined, protocol?: string): boolean {
  if (typeof origin !== 'string' || !host) return false;
  try {
    const url = new URL(origin);
    return ['https:', 'http:'].includes(url.protocol) && url.host === host &&
      (!protocol || url.protocol === `${protocol}:`) && !url.username && !url.password && url.pathname === '/';
  } catch { return false; }
}
export function registerPpobRoutes(app: Express, pool: Pool, service: PpobService,
  requireAuth: RequestHandler, requireAdmin: RequestHandler, secret: string) {
  const csrf = (req: Request) => ppobCsrf(secret, req.sessionID, req.session.userId!);
  const liveRole = (admin: boolean): RequestHandler => async (req, res, next) => {
    try {
      const result = await pool.query('SELECT role,status FROM users WHERE id=$1', [req.session.userId]);
      const u = result.rows[0];
      if (!u || u.status !== 'active' || (admin ? !['admin', 'superadmin'].includes(u.role) : u.role !== 'user'))
        return void res.status(403).json({ success: false, error: 'Akun atau hak akses PPOB tidak aktif.' });
      next();
    } catch { res.status(503).json({ success: false, error: 'Hak akses belum dapat diverifikasi.' }); }
  };
  const protect: RequestHandler = (req, res, next) => {
    if (!sameOrigin(req.get('origin'), req.get('host'), req.protocol) ||
        !validPpobCsrf(csrf(req), req.get('x-ppob-csrf'))) {
      res.status(403).json({ success: false, error: 'Konfirmasi keamanan tidak valid. Muat ulang halaman PPOB.' }); return;
    }
    if (process.env.NODE_ENV === 'production' && !req.secure) {
      res.status(403).json({ success: false, error: 'Operasi PPOB harus melalui HTTPS.' }); return;
    }
    if (!req.body || Array.isArray(req.body) || typeof req.body !== 'object' || JSON.stringify(req.body).length > 4096) {
      res.status(400).json({ success: false, error: 'Payload PPOB tidak valid.' }); return;
    }
    next();
  };
  const limiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false,
    keyGenerator: req => `ppob-user:${req.session.userId}`, message: { success: false, error: 'Terlalu banyak operasi PPOB. Tunggu satu menit.' } });
  const handle = (fn: (req: Request) => Promise<unknown>): RequestHandler => async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try { res.json({ success: true, data: await fn(req) }); }
    catch (error) {
      const status = error instanceof PpobError ? error.status : 503;
      // Never send SQL, upstream raw errors or account credentials to the client.
      res.status(status).json({ success: false, error: error instanceof PpobError ? error.message : 'Operasi PPOB belum selesai. Periksa riwayat sebelum mencoba kembali.' });
      if (!(error instanceof PpobError)) console.warn('[PPOB] Operasi tertunda; detail sensitif tidak dicatat.');
    }
  };
  const customer = [requireAuth, liveRole(false)];
  const admin = [requireAdmin, liveRole(true)];
  app.get('/api/ppob/customer', ...customer, handle(async req => ({ ...(await service.customer(req.session.userId!)), csrf_token: csrf(req) })));
  app.get('/api/ppob/admin', ...admin, handle(async req => ({ ...(await service.admin()), csrf_token: csrf(req) })));
  app.put('/api/ppob/admin/config', ...admin, protect, limiter, handle(req => service.configure(req.session.userId!, req.body)));
  app.post('/api/ppob/admin/sync', ...admin, protect, limiter, handle(req => service.sync(req.session.userId!)));
  app.post('/api/ppob/admin/connection', ...admin, protect, limiter, handle(req => service.checkConnection(req.session.userId!)));
  app.patch('/api/ppob/admin/products/:sku', ...admin, protect, limiter, handle(req => service.editProduct(req.session.userId!, String(req.params.sku), req.body)));
  app.post('/api/ppob/quotes', ...customer, protect, limiter, handle(req => service.quote(req.session.userId!, req.body.sku, req.body.customer_no)));
  app.post('/api/ppob/orders', ...customer, protect, limiter, handle(req => service.purchase(req.session.userId!, req.body)));
  app.get('/api/ppob/orders/recover/:key', ...customer, handle(req => service.recover(req.session.userId!, String(req.params.key), req.query.quote_id)));
  app.get('/api/ppob/orders/:id', ...customer, handle(req => service.order(req.session.userId!, String(req.params.id))));
  app.post('/api/ppob/admin/orders/:id/recheck', ...admin, protect, limiter, handle(req => service.recheck(req.session.userId!, String(req.params.id))));
  app.post('/api/ppob/webhook', handle(async req => {
    if (!Buffer.isBuffer(req.body) || req.body.length > 65536) throw new PpobError(400, 'Callback harus berupa JSON mentah.');
    await service.webhook(req.body, req.get('x-hub-signature'));
    return { accepted: true };
  }));
}