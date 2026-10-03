import type { Express, Request, RequestHandler } from 'express';
import type { Pool } from 'pg';
import { entryToken, matchesEntryToken, hotspotFiles, zipHotspot, type PortalConfig } from './hotspot-package';

type Context = { routerId: number; mac: string; ip: string; browserIp: string; loginUrl: string; portalUrl: string; createdAt: number; error: string | null };
declare module 'express-session' { interface SessionData { hotspot?: Context } }
export type ClientState = { present: boolean; active: boolean; idleSeconds: number | null };
type Reader = (router: any, mac: string, ip: string, code?: string) => Promise<ClientState>;
export function portalUrl(value: unknown, gateway = false): string {
  if (typeof value !== 'string' || value.length > 512) throw new Error('Alamat tidak valid.');
  const url = new URL(value.trim());
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
      (gateway ? url.pathname !== '/login' : !['', '/'].includes(url.pathname))) {
    throw new Error(gateway ? 'Gunakan alamat login hotspot lengkap yang berakhiran /login.' : 'Gunakan alamat utama server http/https tanpa path, query atau token.');
  }
  return gateway ? url.href : url.origin;
}
export function contextUsable(ctx: Context | undefined, req: Pick<Request, 'ip'>, config: PortalConfig | undefined, now = Date.now()): ctx is Context {
  return !!ctx && !!config?.enabled && ctx.routerId === config.routerId && ctx.loginUrl === config.loginUrl &&
    ctx.portalUrl === config.portalUrl && ctx.browserIp === (req.ip || '') &&
    now >= ctx.createdAt && now - ctx.createdAt < 30 * 60_000;
}

export function registerHotspotRoutes(app: Express, pool: Pool, getSettings: () => Promise<Record<string, string>>, requireAdmin: RequestHandler, secret: string, readClient: Reader) {
  const configs = async (): Promise<PortalConfig[]> => {
    const s = await getSettings();
    try {
      const list: unknown = JSON.parse(s.hotspotPortals || '[]');
      return Array.isArray(list) ? list.filter(c => Number.isInteger(c?.routerId) && c.routerId > 0 &&
        typeof c.loginUrl === 'string' && typeof c.portalUrl === 'string' && typeof c.enabled === 'boolean')
        .map(c => ({ ...c, loginUrl: portalUrl(c.loginUrl, true), portalUrl: portalUrl(c.portalUrl) })) : [];
    } catch { return []; }
  };
  const state = async (req: Request, code?: string) => {
    const ctx = req.session.hotspot;
    const list = await configs();
    const config = list.find(c => c.routerId === ctx?.routerId);
    if (!contextUsable(ctx, req, config)) return { ctx: null, config: null, client: null, reason: 'Hubungkan perangkat ke hotspot AdilaNet dan buka portal dari halaman WiFi.' };
    const { rows } = await pool.query('SELECT * FROM routers WHERE id=$1', [ctx.routerId]);
    if (!rows[0]) return { ctx: null, config: null, client: null, reason: 'Router hotspot tidak tersedia.' };
    try {
      const client = await readClient(rows[0], ctx.mac, ctx.ip, code);
      const recent = client.idleSeconds === null || client.idleSeconds <= 60;
      return { ctx, config: config!, client: { ...client, present: client.present && recent }, reason: client.present && recent ? null : 'Perangkat belum terdeteksi pada hotspot ini. Voucher tetap dapat digunakan nanti.' };
    } catch {
      return { ctx, config: config!, client: null, reason: 'Jaringan hotspot belum dapat diverifikasi. Kode voucher tetap aman; coba login manual dari WiFi AdilaNet.' };
    }
  };
  app.get('/api/hotspot/admin/config', requireAdmin, async (_req, res) => {
    try { res.json({ success: true, data: await configs() }); }
    catch { res.status(503).json({ success: false, error: 'Pengaturan portal belum dapat dimuat.' }); }
  });
  app.post('/api/hotspot/admin/config', requireAdmin, async (req, res) => {
    const db = await pool.connect();
    try {
      const routerId = Number(req.body.routerId);
      if (!Number.isInteger(routerId) || routerId <= 0 || typeof req.body.enabled !== 'boolean') throw new Error('Pilih router dan status portal yang valid.');
      const config: PortalConfig = { routerId, enabled: req.body.enabled, loginUrl: portalUrl(req.body.loginUrl, true), portalUrl: portalUrl(req.body.portalUrl) };
      await db.query('BEGIN');
      await db.query("SELECT pg_advisory_xact_lock(hashtext('adilanet-hotspot-config'))");
      if (!(await db.query('SELECT id FROM routers WHERE id=$1', [routerId])).rowCount) throw new Error('Router tidak ditemukan.');
      const { rows } = await db.query("SELECT config_value FROM settings WHERE config_key='hotspotPortals' FOR UPDATE");
      const existing: PortalConfig[] = rows[0] ? JSON.parse(rows[0].config_value) : [];
      const updated = existing.filter(c => c.routerId !== routerId).concat(config);
      await db.query("INSERT INTO settings(config_key,config_value) VALUES('hotspotPortals',$1) ON CONFLICT(config_key) DO UPDATE SET config_value=EXCLUDED.config_value", [JSON.stringify(updated)]);
      await db.query('COMMIT');
      res.json({ success: true, data: config });
    } catch (e) {
      await db.query('ROLLBACK').catch(() => {});
      res.status(400).json({ success: false, error: e instanceof Error ? e.message : 'Gagal menyimpan portal.' });
    } finally { db.release(); }
  });
  app.get('/api/hotspot/admin/package/:routerId', requireAdmin, async (req, res) => {
    try {
      const config = (await configs()).find(c => c.routerId === Number(req.params.routerId));
      if (!config) return res.status(404).json({ success: false, error: 'Simpan pengaturan portal router ini dahulu.' });
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Disposition', 'attachment; filename="adilanet-hotspot.zip"');
      res.type('application/zip').send(zipHotspot(hotspotFiles(config, secret)));
    } catch { res.status(503).json({ success: false, error: 'Paket hotspot belum dapat diunduh.' }); }
  });
  app.get('/api/hotspot/entry', async (req, res) => {
    try {
      const config = (await configs()).find(c => c.routerId === Number(req.query.router) && c.enabled);
      if (!config || !matchesEntryToken(req.query.entry, entryToken(config, secret))) return res.status(403).send('Portal tidak valid. Simpan pengaturan dan unduh ulang paket hotspot AdilaNet.');
      const mac = String(req.query.mac || '').toUpperCase(), ip = String(req.query.ip || '');
      if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac) || !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) || ip.split('.').some(p => Number(p) > 255)) return res.status(400).send('Data hotspot tidak lengkap. Buka melalui jaringan WiFi AdilaNet.');
      req.session.hotspot = { routerId: config.routerId, mac, ip, browserIp: req.ip || '', loginUrl: config.loginUrl, portalUrl: config.portalUrl, createdAt: Date.now(),
        error: req.query.error ? 'Login WiFi belum berhasil. Periksa kode voucher atau hubungi admin.' : null };
      req.session.save(err => {
        if (err) return res.status(503).send('Sesi hotspot belum dapat disimpan. Coba kembali.');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.redirect(303, '/hotspot');
      });
    } catch { res.status(503).send('Portal hotspot belum siap. Hubungi admin.'); }
  });
  app.get('/api/hotspot/context', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const s = await state(req);
      res.json({ success: true, data: { has_context: !!s.ctx, on_network: !!s.client?.present,
        router_id: s.ctx?.routerId || null, router_name: s.ctx ? (await pool.query('SELECT name FROM routers WHERE id=$1', [s.ctx.routerId])).rows[0]?.name || null : null,
        login_url: s.config?.loginUrl || null, error: s.ctx?.error || null, reason: s.reason } });
    } catch { res.status(503).json({ success: false, error: 'Konteks hotspot belum dapat dimuat.' }); }
  });
  app.get('/api/hotspot/packages', async (req, res) => {
    try {
      const ctx = req.session.hotspot, config = (await configs()).find(c => c.routerId === ctx?.routerId);
      const routerId = contextUsable(ctx, req, config) ? ctx.routerId : null;
      const { rows } = await pool.query(`SELECT p.* FROM packages p JOIN routers r ON r.id=p.router_id
        WHERE p.price>0 AND p.mikrotik_profile IS NOT NULL AND p.mikrotik_profile<>''
        AND ($1::int IS NULL OR p.router_id=$1) ORDER BY p.price`, [routerId]);
      res.json({ success: true, data: rows.map(p => ({ ...p, price: Number(p.price) })) });
    } catch { res.status(503).json({ success: false, error: 'Daftar paket belum dapat dimuat.' }); }
  });
  app.post('/api/hotspot/connect', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const code = req.body.code, automatic = req.body.automatic === true;
      if (typeof code !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(code)) return res.status(400).json({ success: false, error: 'Masukkan kode voucher yang valid.' });
      if (automatic && (!Number.isInteger(req.body.routerId) || req.body.routerId <= 0)) return res.json({ success: true, data: { on_network: false, error: 'Simpan kode voucher dan gunakan pada hotspot yang sesuai paket.' } });
      const s = await state(req, code);
      if (!s.ctx || !s.config) return res.status(409).json({ success: false, error: s.reason });
      if (req.body.routerId != null && Number(req.body.routerId) !== s.ctx.routerId) return res.status(409).json({ success: false, error: 'Voucher ini untuk router lain. Hubungkan ke hotspot tempat paket tersebut berlaku.' });
      if (automatic && (!s.client?.present || s.ctx.error)) return res.json({ success: true, data: { on_network: false, error: s.ctx.error || s.reason } });
      // Fresh CHAP challenge is generated by the local bridge, never reused from checkout.
      const target = new URL(s.config.loginUrl); target.hash = new URLSearchParams({ 'an-voucher': code }).toString();
      res.json({ success: true, data: { on_network: !!s.client?.present, redirect_url: target.href } });
    } catch { res.status(503).json({ success: false, error: 'Login WiFi belum dapat disiapkan. Voucher tetap dapat digunakan manual.' }); }
  });
  app.post('/api/hotspot/connection', async (req, res) => {
    try {
      const code = req.body.code;
      if (typeof code !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(code)) return res.status(400).json({ success: false, error: 'Kode voucher tidak valid.' });
      res.setHeader('Cache-Control', 'no-store');
      const s = await state(req, code);
      res.json({ success: true, data: { active: !!s.client?.active, on_network: !!s.client?.present, error: s.ctx?.error || s.reason } });
    } catch { res.status(503).json({ success: false, error: 'Status login belum dapat diperiksa.' }); }
  });
}