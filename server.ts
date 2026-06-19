import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { createVoucher, createVouchersBulk, createProfile, updateProfile, deleteProfile } from "./src/server/mikrotik";
import dotenv from "dotenv";

dotenv.config();

declare module "express-session" {
  interface SessionData {
    userId?: number;
    role?: string;
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BCRYPT_ROUNDS = 10;

function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

// Build the "dibuat oleh" tag stamped into the MikroTik voucher comment so it's
// clear where each voucher came from: a registered user, a public (guest) QRIS
// purchase, or an admin. Must start with a letter so it never collides with the
// validity countdown (which keys off a leading digit).
function buildVoucherIdentity(opts: { userId?: number | null; name?: string | null; phone?: string | null; admin?: boolean }): string {
  if (opts.admin) return "Admin";
  if (opts.userId) {
    const nm = String(opts.name || "").trim().slice(0, 40);
    return nm ? `User#${opts.userId} ${nm}` : `User#${opts.userId}`;
  }
  const ph = String(opts.phone || "").replace(/[^0-9+]/g, "").slice(0, 20);
  return ph ? `Publik ${ph}` : "Publik";
}

function isBcryptHash(value: unknown): boolean {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

async function hashSecret(value: string): Promise<string> {
  return bcrypt.hash(value, BCRYPT_ROUNDS);
}

async function generateUniqueVoucher(): Promise<string> {
  // Format is configurable from the admin Settings page (stored in `settings`):
  // voucherCharset (alphanumeric|numeric|alpha), voucherLength, voucherPrefix.
  // Sensible defaults are used when a setting is missing (e.g. older DBs).
  const s = await getSettings();
  const NUM = "0123456789";
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let chars = ALPHA + NUM;
  if (s.voucherCharset === "numeric") chars = NUM;
  else if (s.voucherCharset === "alpha") chars = ALPHA;
  let length = parseInt(s.voucherLength || "8", 10);
  if (!Number.isFinite(length) || length < 4) length = 8;
  if (length > 20) length = 20;
  const prefix = s.voucherPrefix !== undefined ? s.voucherPrefix : "WFI-";
  // More retries because admins may pick a small keyspace (e.g. numeric+length 4),
  // where collisions become likelier as more vouchers are issued.
  for (let i = 0; i < 50; i++) {
    let body = "";
    for (let j = 0; j < length; j++) body += chars[crypto.randomInt(chars.length)];
    const code = `${prefix}${body}`;
    const { rows } = await pool.query("SELECT 1 FROM transactions WHERE voucher_code = $1", [code]);
    if (rows.length === 0) return code;
  }
  throw new Error("Gagal menghasilkan kode voucher unik, coba lagi.");
}

// Random voucher code for admin bulk generation. Respects the per-batch format
// chosen in the UI (alphanumeric vs digits-only). Uniqueness within a batch and
// across the router is handled by the caller / MikroTik (duplicate usernames are
// rejected), so this just needs decent entropy.
function genBulkCode(format: string): string {
  const NUM = "0123456789";
  const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const chars = format === "numbers" ? NUM : ALNUM;
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[crypto.randomInt(chars.length)];
  return s;
}

// ─── AUTH MIDDLEWARE ────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, error: "Silakan login terlebih dahulu." });
  }
  next();
}

function isAdminRole(role?: string): boolean {
  return role === "admin" || role === "superadmin";
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, error: "Silakan login terlebih dahulu." });
  }
  if (!isAdminRole(req.session.role)) {
    return res.status(403).json({ success: false, error: "Akses ditolak: khusus administrator." });
  }
  next();
}

async function initDb() {
  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone_number VARCHAR(30) UNIQUE,
      password VARCHAR(255) NOT NULL,
      pin VARCHAR(255),
      role VARCHAR(10) DEFAULT 'user',
      balance DECIMAL(10,2) DEFAULT 0.00,
      status VARCHAR(10) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS routers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      ip_address VARCHAR(50) NOT NULL,
      api_port VARCHAR(10) DEFAULT '8728',
      username VARCHAR(50) NOT NULL,
      password TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'offline',
      connected_users INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      speed VARCHAR(50) NOT NULL,
      quota VARCHAR(50) NOT NULL,
      duration VARCHAR(50) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      badge_color VARCHAR(50) DEFAULT 'blue',
      created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS router_id INTEGER REFERENCES routers(id) ON DELETE SET NULL;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS mikrotik_profile VARCHAR(100);

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      package_id INT REFERENCES packages(id) ON DELETE SET NULL,
      voucher_code VARCHAR(100) UNIQUE,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(10) NOT NULL,
      status VARCHAR(10) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100);
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
    ALTER TABLE transactions ALTER COLUMN status TYPE VARCHAR(20);
    DROP INDEX IF EXISTS transactions_reference_id_uniq;
    CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_id_key ON transactions(reference_id);

    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      config_key VARCHAR(100) UNIQUE NOT NULL,
      config_value TEXT DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS promos (
      id SERIAL PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      subtitle VARCHAR(200) DEFAULT '',
      color VARCHAR(20) DEFAULT 'iris',
      icon VARCHAR(30) DEFAULT 'star',
      badge VARCHAR(40) DEFAULT '',
      image_url TEXT DEFAULT '',
      link_type VARCHAR(20) DEFAULT 'packages',
      link_value TEXT DEFAULT '',
      button_text VARCHAR(40) DEFAULT '',
      active BOOLEAN DEFAULT true,
      start_date DATE,
      end_date DATE,
      sort_order INT DEFAULT 0,
      show_on VARCHAR(20) DEFAULT 'both',
      created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE promos ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10) DEFAULT 'none';
    ALTER TABLE promos ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2) DEFAULT 0;

    CREATE TABLE IF NOT EXISTS topups (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      admin_id INT REFERENCES users(id) ON DELETE SET NULL,
      amount DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(120) NOT NULL,
      body TEXT DEFAULT '',
      type VARCHAR(20) DEFAULT 'info',
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, read);
  `);

  // Seed demo data if empty
  const { rows: userRows } = await pool.query("SELECT COUNT(*) as cnt FROM users");
  if (parseInt(userRows[0].cnt) === 0) {
    await pool.query(`
      INSERT INTO users (name, email, phone_number, password, role, balance) VALUES
      ('Super Admin', 'admin@wifivoucher.com', '08999999999', 'admin', 'superadmin', 0),
      ('Ahmad Pelanggan', 'user@demo.com', '081234567890', 'user123', 'user', 50000),
      ('Budi Santoso', 'budi@demo.com', '082211223344', 'user123', 'user', 15000)
      ON CONFLICT DO NOTHING;
    `);
  }

  const { rows: pkgRows } = await pool.query("SELECT COUNT(*) as cnt FROM packages");
  if (parseInt(pkgRows[0].cnt) === 0) {
    await pool.query(`
      INSERT INTO packages (name, speed, quota, duration, price, badge_color) VALUES
      ('Harian Hemat', '10 Mbps', 'Unlimited', '1 Hari', 5000, 'blue'),
      ('Mingguan Ngebut', '20 Mbps', 'Unlimited', '7 Hari', 25000, 'purple'),
      ('Bulanan Pro', '50 Mbps', 'Unlimited', '30 Hari', 95000, 'cyan'),
      ('Gaming VIP', '100 Mbps', 'Unlimited', '30 Hari', 150000, 'emerald')
      ON CONFLICT DO NOTHING;
    `);
  }

  const { rows: rtRows } = await pool.query("SELECT COUNT(*) as cnt FROM routers");
  if (parseInt(rtRows[0].cnt) === 0) {
    await pool.query(`
      INSERT INTO routers (name, ip_address, api_port, username, password, status, connected_users) VALUES
      ('Router Pusat', '192.168.1.1', '8728', 'admin', 'password', 'online', 142),
      ('Cabang Utara', '192.168.2.1', '8728', 'admin', 'password', 'warning', 38)
      ON CONFLICT DO NOTHING;
    `);
  }

  const { rows: setRows } = await pool.query("SELECT COUNT(*) as cnt FROM settings");
  if (parseInt(setRows[0].cnt) === 0) {
    await pool.query(`
      INSERT INTO settings (config_key, config_value) VALUES
      ('sanpayApiKey', ''),
      ('merchantId', ''),
      ('telegramToken', ''),
      ('telegramChatId', ''),
      ('qrisEnabled', 'true'),
      ('voucherCharset', 'alphanumeric'),
      ('voucherLength', '8'),
      ('voucherPrefix', 'WFI-'),
      ('hotspotLoginUrl', ''),
      ('whatsappNumber', ''),
      ('whatsappMessage', 'Halo Admin AdilaNet, saya butuh bantuan.')
      ON CONFLICT DO NOTHING;
    `);
  }

  // Ensure voucher-format settings exist on pre-existing DBs (idempotent;
  // never overwrites values the admin has already chosen).
  await pool.query(`
    INSERT INTO settings (config_key, config_value) VALUES
      ('voucherCharset', 'alphanumeric'),
      ('voucherLength', '8'),
      ('voucherPrefix', 'WFI-'),
      ('hotspotLoginUrl', ''),
      ('whatsappNumber', ''),
      ('whatsappMessage', 'Halo Admin AdilaNet, saya butuh bantuan.')
    ON CONFLICT (config_key) DO NOTHING;
  `);

  // Seed a starter promo banner so the home screen isn't empty
  const { rows: promoRows } = await pool.query("SELECT COUNT(*) as cnt FROM promos");
  if (parseInt(promoRows[0].cnt) === 0) {
    await pool.query(`
      INSERT INTO promos (title, subtitle, color, icon, badge, link_type, button_text, active, sort_order, show_on) VALUES
      ('Anti Buffering', 'Streaming & gaming lancar tanpa putus', 'iris', 'zap', 'Unggulan', 'packages', 'Lihat Paket', true, 1, 'both'),
      ('Hemat Lebih Banyak', 'Beli paket mingguan, lebih irit!', 'gold', 'star', 'Promo', 'packages', 'Beli Sekarang', true, 2, 'both')
      ON CONFLICT DO NOTHING;
    `);
  }

  // Ensure pin column can hold a bcrypt hash (~60 chars) on pre-existing DBs
  await pool.query(`ALTER TABLE users ALTER COLUMN pin TYPE VARCHAR(255)`);
  // Widen role column to fit 'superadmin'
  await pool.query(`ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20)`);
  // Guarantee a protected superadmin exists (promote oldest admin if none)
  await pool.query(`
    UPDATE users SET role = 'superadmin'
    WHERE id = (SELECT id FROM users WHERE role IN ('admin','superadmin') ORDER BY id ASC LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'superadmin')
  `);
  // Fallback: if no admins exist at all, promote the oldest user so there is always a superadmin
  await pool.query(`
    UPDATE users SET role = 'superadmin'
    WHERE id = (SELECT id FROM users ORDER BY id ASC LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'superadmin')
  `);

  // Migrate any plaintext password/pin values to bcrypt hashes (idempotent)
  const { rows: allUsers } = await pool.query("SELECT id, password, pin FROM users");
  for (const u of allUsers) {
    const updates: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    if (u.password && !isBcryptHash(u.password)) {
      updates.push(`password = $${idx++}`);
      vals.push(await hashSecret(u.password));
    }
    if (u.pin && !isBcryptHash(u.pin)) {
      updates.push(`pin = $${idx++}`);
      vals.push(await hashSecret(u.pin));
    }
    if (updates.length > 0) {
      vals.push(u.id);
      await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}`, vals);
    }
  }
  if (allUsers.some((u: any) => !isBcryptHash(u.password))) {
    console.log("[DB] Migrasi password plaintext ke bcrypt selesai.");
  }

  console.log("[DB] Schema & seed selesai.");
}

async function getSettings() {
  const { rows } = await pool.query("SELECT config_key, config_value FROM settings");
  const s: Record<string, string> = {};
  rows.forEach((r: any) => { s[r.config_key] = r.config_value; });
  return s;
}

// SanPay signs/verifies payloads with HMAC-SHA256 over the raw JSON body,
// using the merchant's API Key as the secret. Same algorithm both directions.
function sanpaySignature(rawBody: string, apiKey: string): string {
  return crypto.createHmac("sha256", apiKey).update(rawBody, "utf8").digest("hex");
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 5000;

  const SESSION_SECRET = process.env.SESSION_SECRET;
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET tidak diset. Wajib diisi untuk keamanan sesi.");
  }

  const isProd = process.env.NODE_ENV === "production";
  app.set("trust proxy", 1);
  app.use(cors({ origin: true, credentials: true }));
  // Capture the raw request body so we can verify the SanPay webhook HMAC signature.
  app.use(express.json({
    limit: '3mb',
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));

  const PgSession = connectPgSimple(session);
  app.use(
    session({
      store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        // Hanya aktifkan secure cookie kalau benar-benar di belakang HTTPS.
        // Default mati supaya tetap jalan saat diakses lewat HTTP (mis. IP LAN).
        // Set COOKIE_SECURE=true di env kalau app dilayani via HTTPS.
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  // Init database
  try {
    await initDb();
  } catch (err) {
    console.error("[DB] Gagal inisialisasi database:", err);
  }

  // ─── HEALTH ─────────────────────────────────────────────────────────────
  app.get("/api/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", db_connected: true });
    } catch {
      res.json({ status: "ok", db_connected: false });
    }
  });

  // ─── AUTH ────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ success: false, error: "Identifier dan password wajib diisi." });
      }
      const { rows } = await pool.query(
        `SELECT * FROM users WHERE (email = $1 OR phone_number = $1 OR name = $1) LIMIT 1`,
        [identifier]
      );
      if (rows.length === 0) {
        return res.status(401).json({ success: false, error: "Username/Nomor HP atau Password salah." });
      }
      const user = rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ success: false, error: "Username/Nomor HP atau Password salah." });
      }
      if (user.status === 'blocked') {
        return res.status(403).json({ success: false, error: "Akun Anda telah ditangguhkan. Hubungi Administrator." });
      }
      req.session.userId = user.id;
      req.session.role = user.role;
      const { password: _pw, pin: _pin, ...safeUser } = user;
      res.json({ success: true, data: { ...safeUser, balance: parseFloat(safeUser.balance), has_pin: !!_pin } });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, error: "Belum login." });
    }
    try {
      const { rows } = await pool.query(
        `SELECT id, name, email, phone_number, role, balance, status, (pin IS NOT NULL AND pin <> '') AS has_pin FROM users WHERE id = $1`,
        [req.session.userId]
      );
      if (rows.length === 0 || rows[0].status === 'blocked') {
        return req.session.destroy(() => res.status(401).json({ success: false, error: "Sesi tidak valid." }));
      }
      const u = rows[0];
      res.json({ success: true, data: { ...u, balance: parseFloat(u.balance) } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, phone_number, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: "Nama, email, dan password wajib diisi." });
      }
      const hashed = await hashSecret(password);
      const { rows } = await pool.query(
        `INSERT INTO users (name, email, phone_number, password, role, balance) VALUES ($1, $2, $3, $4, 'user', 0) RETURNING *`,
        [name, email, phone_number || null, hashed]
      );
      const user = rows[0];
      req.session.userId = user.id;
      req.session.role = user.role;
      const { password: _pw, pin: _pin, ...safeUser } = user;
      res.json({ success: true, data: { ...safeUser, balance: parseFloat(safeUser.balance), has_pin: !!_pin } });
    } catch (err: any) {
      if (err.code === '23505') {
        return res.status(409).json({ success: false, error: "Email atau nomor HP sudah terdaftar." });
      }
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── USERS ───────────────────────────────────────────────────────────────
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, email, phone_number, role, balance, status, created_at FROM users ORDER BY id`
      );
      res.json({ success: true, data: rows.map((u: any) => ({ ...u, balance: parseFloat(u.balance) })) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      if (!isAdminRole(req.session.role) && Number(req.params.id) !== req.session.userId) {
        return res.status(403).json({ success: false, error: "Akses ditolak." });
      }
      const { rows } = await pool.query(
        `SELECT id, name, email, phone_number, role, balance, status, created_at FROM users WHERE id = $1`,
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ success: false, error: "User tidak ditemukan." });
      const u = rows[0];
      res.json({ success: true, data: { ...u, balance: parseFloat(u.balance) } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const isAdmin = isAdminRole(req.session.role);
      const isSuper = req.session.role === "superadmin";
      const targetId = Number(req.params.id);
      if (!isAdmin && targetId !== req.session.userId) {
        return res.status(403).json({ success: false, error: "Akses ditolak." });
      }
      const { name, email, phone_number, password, pin, role, balance, status } = req.body;

      // Load target role to apply superadmin protections
      const { rows: tgtRows } = await pool.query(`SELECT role FROM users WHERE id = $1`, [targetId]);
      if (tgtRows.length === 0) return res.status(404).json({ success: false, error: "User tidak ditemukan." });
      const targetIsSuper = tgtRows[0].role === "superadmin";

      // A superadmin account can only be modified by itself (no field changes by others)
      if (targetIsSuper && targetId !== req.session.userId) {
        return res.status(403).json({ success: false, error: "Akun superadmin tidak bisa diubah oleh admin lain." });
      }
      // Role value allowlist
      if (role !== undefined && !["user", "admin", "superadmin"].includes(role)) {
        return res.status(400).json({ success: false, error: "Role tidak valid." });
      }
      // Only a superadmin may grant admin/superadmin rights (no privilege escalation)
      if (role !== undefined && isAdminRole(role) && !isSuper) {
        return res.status(403).json({ success: false, error: "Hanya superadmin yang dapat memberi hak admin." });
      }
      // Prevent demoting the last remaining superadmin (lock-out protection)
      if (targetIsSuper && role !== undefined && role !== "superadmin") {
        const { rows: cnt } = await pool.query(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'superadmin'`);
        if (cnt[0].n <= 1) {
          return res.status(400).json({ success: false, error: "Tidak bisa menurunkan superadmin terakhir." });
        }
      }

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;
      if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
      if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }
      if (phone_number !== undefined) { fields.push(`phone_number = $${idx++}`); values.push(phone_number); }
      if (password !== undefined && password !== "") { fields.push(`password = $${idx++}`); values.push(await hashSecret(password)); }
      if (pin !== undefined && pin !== "") { fields.push(`pin = $${idx++}`); values.push(await hashSecret(pin)); }
      // Privileged fields — admin only
      if (isAdmin && role !== undefined) { fields.push(`role = $${idx++}`); values.push(role); }
      if (isAdmin && balance !== undefined) { fields.push(`balance = $${idx++}`); values.push(balance); }
      if (isAdmin && status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }
      if (fields.length === 0) {
        return res.status(400).json({ success: false, error: "Tidak ada perubahan yang dikirim." });
      }
      fields.push(`updated_at = NOW()`);
      values.push(targetId);
      const { rows } = await pool.query(
        `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, name, email, phone_number, role, balance, status, (pin IS NOT NULL AND pin <> '') AS has_pin`,
        values
      );
      if (rows.length === 0) return res.status(404).json({ success: false, error: "User tidak ditemukan." });
      const u = rows[0];
      res.json({ success: true, data: { ...u, balance: parseFloat(u.balance) } });
    } catch (err: any) {
      if (err.code === '23505') {
        return res.status(409).json({ success: false, error: "Email atau nomor HP sudah dipakai." });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const targetId = Number(req.params.id);
      if (targetId === req.session.userId) {
        return res.status(400).json({ success: false, error: "Tidak bisa menghapus akun sendiri." });
      }
      const { rows } = await pool.query(`SELECT role FROM users WHERE id = $1`, [targetId]);
      if (rows.length === 0) return res.json({ success: true });
      const targetRole = rows[0].role;
      if (targetRole === "superadmin") {
        return res.status(403).json({ success: false, error: "Akun superadmin tidak bisa dihapus." });
      }
      if (isAdminRole(targetRole) && req.session.role !== "superadmin") {
        return res.status(403).json({ success: false, error: "Hanya superadmin yang dapat menghapus admin." });
      }
      await pool.query(`DELETE FROM users WHERE id = $1`, [targetId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/users/:id/topup", requireAdmin, async (req, res) => {
    try {
      const amount = Number(req.body?.amount);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, error: "Nominal tidak valid." });
      const targetId = Number(req.params.id);
      const { rows: tgt } = await pool.query(`SELECT role FROM users WHERE id = $1`, [targetId]);
      if (tgt.length === 0) return res.status(404).json({ success: false, error: "User tidak ditemukan." });
      if (tgt[0].role === "superadmin" && targetId !== req.session.userId) {
        return res.status(403).json({ success: false, error: "Saldo superadmin tidak bisa diubah oleh admin lain." });
      }
      // Balance, history, and notification must succeed or fail as one unit so
      // a partial failure can never leave the saldo changed without a record
      // (which would let an admin retry and double-credit).
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query(
          `UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, balance`,
          [amount, targetId]
        );
        if (rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ success: false, error: "User tidak ditemukan." });
        }
        const newBalance = parseFloat(rows[0].balance);
        // Record the top-up for history (who topped up whom, how much, when).
        await client.query(
          `INSERT INTO topups (user_id, admin_id, amount) VALUES ($1, $2, $3)`,
          [targetId, req.session.userId, amount]
        );
        // Notify the user whose balance was filled.
        await client.query(
          `INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, 'topup')`,
          [targetId, 'Saldo Ditambahkan', `Saldo Anda bertambah ${formatRupiah(amount)}. Saldo sekarang ${formatRupiah(newBalance)}.`]
        );
        await client.query("COMMIT");
        res.json({ success: true, data: { ...rows[0], balance: newBalance } });
      } catch (txErr: any) {
        await client.query("ROLLBACK");
        throw txErr;
      } finally {
        client.release();
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── TOP-UP HISTORY ───────────────────────────────────────────────────────
  app.get("/api/topups", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT t.*, u.name AS user_name, a.name AS admin_name
        FROM topups t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN users a ON t.admin_id = a.id
        ORDER BY t.created_at DESC
        LIMIT 200
      `);
      res.json({ success: true, data: rows.map((t: any) => ({ ...t, amount: parseFloat(t.amount) })) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [req.session.userId]
      );
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await pool.query(
        `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2`,
        [Number(req.params.id), req.session.userId]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await pool.query(
        `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
        [req.session.userId]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── PACKAGES ────────────────────────────────────────────────────────────
  app.get("/api/packages", async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM packages ORDER BY price ASC`);
      res.json({ success: true, data: rows.map((p: any) => ({ ...p, price: parseFloat(p.price) })) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/packages", requireAdmin, async (req, res) => {
    try {
      const { name, speed, quota, duration, price, badge_color, router_id, mikrotik_profile } = req.body;
      if (!name || !speed || !quota || !duration || !price) {
        return res.status(400).json({ success: false, error: "Semua field paket wajib diisi." });
      }
      const { rows } = await pool.query(
        `INSERT INTO packages (name, speed, quota, duration, price, badge_color, router_id, mikrotik_profile) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [name, speed, quota, duration, price, badge_color || 'blue', router_id || null, mikrotik_profile || null]
      );
      res.json({ success: true, data: { ...rows[0], price: parseFloat(rows[0].price) } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.patch("/api/packages/:id", requireAdmin, async (req, res) => {
    try {
      const { name, speed, quota, duration, price, badge_color, router_id, mikrotik_profile } = req.body;
      const { rows } = await pool.query(
        `UPDATE packages SET name=$1, speed=$2, quota=$3, duration=$4, price=$5, badge_color=$6, router_id=$7, mikrotik_profile=$8 WHERE id=$9 RETURNING *`,
        [name, speed, quota, duration, price, badge_color, router_id || null, mikrotik_profile || null, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Paket tidak ditemukan." });
      res.json({ success: true, data: { ...rows[0], price: parseFloat(rows[0].price) } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/packages/:id", requireAdmin, async (req, res) => {
    try {
      await pool.query(`DELETE FROM packages WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── ROUTERS ─────────────────────────────────────────────────────────────
  app.get("/api/routers", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, ip_address, api_port, username, status, connected_users, created_at FROM routers ORDER BY id`
      );
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/routers", requireAdmin, async (req, res) => {
    try {
      const { name, ip_address, api_port, username, password } = req.body;
      if (!name || !ip_address) return res.status(400).json({ success: false, error: "Nama dan IP wajib diisi." });
      const { rows } = await pool.query(
        `INSERT INTO routers (name, ip_address, api_port, username, password, status, connected_users) VALUES ($1,$2,$3,$4,$5,'offline',0) RETURNING id, name, ip_address, api_port, username, status, connected_users, created_at`,
        [name, ip_address, api_port || '8728', username || 'admin', password || '']
      );
      res.json({ success: true, data: rows[0] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/routers/:id", requireAdmin, async (req, res) => {
    try {
      await pool.query(`DELETE FROM routers WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/routers/:id", requireAdmin, async (req, res) => {
    try {
      const { name, ip_address, api_port, username, password } = req.body;
      const fields = ["name=$1", "ip_address=$2", "api_port=$3", "username=$4"];
      const values: any[] = [name, ip_address, api_port || '8728', username];
      let idx = 5;
      // Only overwrite password when a new one is explicitly provided
      if (password !== undefined && password !== "") {
        fields.push(`password=$${idx++}`);
        values.push(password);
      }
      values.push(req.params.id);
      const { rows } = await pool.query(
        `UPDATE routers SET ${fields.join(", ")} WHERE id=$${idx} RETURNING id, name, ip_address, api_port, username, status, connected_users, created_at`,
        values
      );
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      res.json({ success: true, data: rows[0] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/routers/:id/test", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM routers WHERE id = $1`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      const router = rows[0];
      const start = Date.now();
      try {
        const { getProfiles } = await import("./src/server/mikrotik");
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout (4s)")), 4000)
        );
        await Promise.race([
          getProfiles({ host: router.ip_address, user: router.username, pass: router.password, port: router.api_port }),
          timeoutPromise,
        ]);
        const latency = Date.now() - start;
        await pool.query(`UPDATE routers SET status='online' WHERE id=$1`, [router.id]);
        return res.json({ success: true, connected: true, latency, message: `Terhubung dalam ${latency}ms` });
      } catch (connErr: any) {
        await pool.query(`UPDATE routers SET status='offline' WHERE id=$1`, [router.id]);
        return res.json({ success: true, connected: false, message: connErr.message });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Sync: read the REAL live hotspot sessions from the router and store the
  // current connected-user count. Never falls back to fake/random data.
  app.post("/api/routers/:id/sync", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM routers WHERE id = $1`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      const router = rows[0];
      const { getActiveUsers } = await import("./src/server/mikrotik");
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Mikrotik connection timeout")), 4000)
      );
      const active = await Promise.race([
        getActiveUsers({ host: router.ip_address, user: router.username, pass: router.password, port: router.api_port }),
        timeoutPromise,
      ]);
      const { rows: updated } = await pool.query(
        `UPDATE routers SET connected_users = $1, status = 'online' WHERE id = $2 RETURNING id, name, ip_address, api_port, username, status, connected_users, created_at`,
        [active.length, router.id]
      );
      res.json({ success: true, data: updated[0], count: active.length });
    } catch (err: any) {
      await pool.query(`UPDATE routers SET status='offline' WHERE id=$1`, [req.params.id]).catch(() => {});
      res.status(502).json({ success: false, error: `Gagal membaca router: ${err.message}` });
    }
  });

  // Live list of users currently connected to the router's hotspot.
  app.get("/api/routers/:id/active-users", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM routers WHERE id = $1`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      const router = rows[0];
      const { getActiveUsers } = await import("./src/server/mikrotik");
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Mikrotik connection timeout")), 4000)
      );
      const active = await Promise.race([
        getActiveUsers({ host: router.ip_address, user: router.username, pass: router.password, port: router.api_port }),
        timeoutPromise,
      ]);
      // Keep the stored count in sync with the live reading.
      await pool.query(`UPDATE routers SET connected_users = $1, status = 'online' WHERE id = $2`, [active.length, router.id]).catch(() => {});
      res.json({ success: true, data: active });
    } catch (err: any) {
      await pool.query(`UPDATE routers SET status='offline' WHERE id=$1`, [req.params.id]).catch(() => {});
      res.status(502).json({ success: false, error: `Gagal membaca user aktif: ${err.message}` });
    }
  });

  // ─── TRANSACTIONS ────────────────────────────────────────────────────────
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const isAdmin = isAdminRole(req.session.role);
      let query = `
        SELECT t.*, u.name as user_name, p.name as package_name
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN packages p ON t.package_id = p.id
      `;
      const params: any[] = [];
      if (!isAdmin) {
        // Regular users only ever see their own transactions
        query += ` WHERE t.user_id = $1`;
        params.push(req.session.userId);
      } else if (req.query.user_id) {
        query += ` WHERE t.user_id = $1`;
        params.push(req.query.user_id);
      }
      query += ` ORDER BY t.created_at DESC`;
      const { rows } = await pool.query(query, params);
      res.json({
        success: true,
        data: rows.map((t: any) => ({ ...t, amount: parseFloat(t.amount) }))
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      const user_id = req.session.userId;
      const { package_id, payment_method, pin } = req.body;
      if (!package_id || !payment_method) {
        return res.status(400).json({ success: false, error: "Data transaksi tidak lengkap." });
      }
      // This endpoint only handles instant balance (saldo) purchases. QRIS goes
      // through /api/payment/create-qris and is only fulfilled after a verified
      // payment callback — no voucher may be minted here for non-saldo methods.
      if (payment_method !== 'saldo') {
        return res.status(400).json({ success: false, error: "Metode pembayaran tidak didukung di sini. Gunakan QRIS." });
      }

      // Get user and package
      const { rows: userRows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [user_id]);
      const { rows: pkgRows } = await pool.query(`SELECT * FROM packages WHERE id = $1`, [package_id]);

      if (userRows.length === 0) return res.status(404).json({ success: false, error: "User tidak ditemukan." });
      if (pkgRows.length === 0) return res.status(404).json({ success: false, error: "Paket tidak ditemukan." });

      const user = userRows[0];
      const pkg = pkgRows[0];
      const amount = await resolvePurchaseAmount(pkg, req.body.promo_id);

      let newBalance = parseFloat(user.balance);

      if (payment_method === 'saldo') {
        // Validate PIN (stored hashed)
        if (user.pin) {
          const pinOk = pin ? await bcrypt.compare(String(pin), user.pin) : false;
          if (!pinOk) {
            return res.status(401).json({ success: false, error: "Otorisasi Gagal: PIN salah." });
          }
        }
        // Atomic conditional deduction — prevents race/overdraft
        const { rows: deducted } = await pool.query(
          `UPDATE users SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND balance >= $1 RETURNING balance`,
          [amount, user_id]
        );
        if (deducted.length === 0) {
          return res.status(400).json({ success: false, error: "Saldo tidak mencukupi." });
        }
        newBalance = parseFloat(deducted[0].balance);
      }

      const voucherCode = await generateUniqueVoucher();

      // For instant (saldo) purchases, create the voucher on Mikrotik now.
      // If provisioning fails, refund the deducted balance so the buyer isn't charged.
      if (payment_method === 'saldo') {
        try {
          await provisionVoucher(pkg, voucherCode, buildVoucherIdentity({ userId: user.id, name: user.name }));
        } catch (provErr: any) {
          await pool.query(
            `UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
            [amount, user_id]
          );
          console.error(`[Transaksi] Gagal provision voucher, saldo dikembalikan: ${provErr.message}`);
          return res.status(502).json({ success: false, error: `Gagal membuat voucher di Mikrotik: ${provErr.message}` });
        }
      }

      // Create transaction
      const { rows: txRows } = await pool.query(
        `INSERT INTO transactions (user_id, package_id, voucher_code, amount, payment_method, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [user_id, package_id, voucherCode, amount, payment_method, payment_method === 'saldo' ? 'success' : 'pending']
      );

      const tx = txRows[0];

      // Notify the buyer that their voucher purchase succeeded. This is
      // best-effort: the voucher is already minted and the balance deducted, so
      // a notification failure must NOT fail the request (which would make the
      // buyer retry and get charged twice).
      if (payment_method === 'saldo') {
        try {
          await pool.query(
            `INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, 'purchase')`,
            [user_id, 'Pembelian Berhasil', `Voucher ${voucherCode} untuk paket ${pkg.name} berhasil dibeli. Sisa saldo ${formatRupiah(newBalance)}.`]
          );
        } catch (notifErr: any) {
          console.error(`[Transaksi] Gagal membuat notifikasi pembelian (transaksi tetap sukses): ${notifErr.message}`);
        }
      }

      res.json({
        success: true,
        data: {
          transaction: { ...tx, amount: parseFloat(tx.amount) },
          voucher_code: voucherCode,
          new_balance: newBalance
        }
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/transactions/:id", requireAdmin, async (req, res) => {
    try {
      await pool.query(`DELETE FROM transactions WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── SETTINGS ────────────────────────────────────────────────────────────
  app.get("/api/settings", requireAdmin, async (req, res) => {
    try {
      const s = await getSettings();
      res.json({
        success: true,
        data: {
          sanpayApiKey: s.sanpayApiKey || '',
          merchantId: s.merchantId || '',
          telegramToken: s.telegramToken || '',
          telegramChatId: s.telegramChatId || '',
          qrisEnabled: s.qrisEnabled !== 'false',
          voucherCharset: s.voucherCharset || 'alphanumeric',
          voucherLength: parseInt(s.voucherLength || '8', 10),
          voucherPrefix: s.voucherPrefix !== undefined ? s.voucherPrefix : 'WFI-',
          hotspotLoginUrl: s.hotspotLoginUrl || '',
          whatsappNumber: s.whatsappNumber || '',
          whatsappMessage: s.whatsappMessage !== undefined ? s.whatsappMessage : 'Halo Admin AdilaNet, saya butuh bantuan.'
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/settings", requireAdmin, async (req, res) => {
    try {
      const { sanpayApiKey, merchantId, telegramToken, telegramChatId, qrisEnabled,
              voucherCharset, voucherLength, voucherPrefix, hotspotLoginUrl,
              whatsappNumber, whatsappMessage } = req.body;

      // Validate & sanitize the hotspot login URL (used for one-tap WiFi login
      // after purchase). Must be empty or a valid http/https URL.
      let hsUrl = typeof hotspotLoginUrl === 'string' ? hotspotLoginUrl.trim() : '';
      if (hsUrl.length > 0) {
        if (hsUrl.length > 255 || !/^https?:\/\/[^\s]+$/i.test(hsUrl)) {
          return res.status(400).json({ success: false, error: "URL Login Hotspot tidak valid. Contoh: http://10.5.50.1/login" });
        }
      }

      // Validate & sanitize voucher-format settings.
      const charset = ['alphanumeric', 'numeric', 'alpha'].includes(voucherCharset)
        ? voucherCharset : 'alphanumeric';
      let vlen = parseInt(String(voucherLength), 10);
      if (!Number.isFinite(vlen) || vlen < 4) vlen = 8;
      if (vlen > 20) vlen = 20;
      let vprefix = typeof voucherPrefix === 'string'
        ? voucherPrefix.toUpperCase().replace(/[^A-Z0-9-]/g, '') : 'WFI-';
      if (vprefix.length > 10) vprefix = vprefix.slice(0, 10);

      // WhatsApp helpdesk number: keep only digits (international format, no +).
      // Empty disables the help-center button on the user side.
      let waNum = typeof whatsappNumber === 'string' ? whatsappNumber.replace(/[^0-9]/g, '') : '';
      if (waNum.startsWith('0')) waNum = '62' + waNum.slice(1);
      if (waNum.length > 20) waNum = waNum.slice(0, 20);
      if (waNum.length > 0 && waNum.length < 8) {
        return res.status(400).json({ success: false, error: "Nomor WhatsApp tidak valid. Contoh: 081234567890" });
      }
      let waMsg = typeof whatsappMessage === 'string' ? whatsappMessage.trim() : '';
      if (waMsg.length > 300) waMsg = waMsg.slice(0, 300);

      const updates = [
        ['sanpayApiKey', sanpayApiKey ?? ''],
        ['merchantId', merchantId ?? ''],
        ['telegramToken', telegramToken ?? ''],
        ['telegramChatId', telegramChatId ?? ''],
        ['qrisEnabled', String(qrisEnabled ?? true)],
        ['voucherCharset', charset],
        ['voucherLength', String(vlen)],
        ['voucherPrefix', vprefix],
        ['hotspotLoginUrl', hsUrl],
        ['whatsappNumber', waNum],
        ['whatsappMessage', waMsg],
      ];
      for (const [key, val] of updates) {
        await pool.query(
          `INSERT INTO settings (config_key, config_value) VALUES ($1,$2) ON CONFLICT (config_key) DO UPDATE SET config_value=$2, updated_at=NOW()`,
          [key, val]
        );
      }
      res.json({ success: true, message: "Pengaturan berhasil disimpan." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/config/public", async (req, res) => {
    try {
      const s = await getSettings();
      res.json({ success: true, data: {
        qrisEnabled: s.qrisEnabled !== 'false',
        hotspotLoginUrl: s.hotspotLoginUrl || '',
        whatsappNumber: s.whatsappNumber || '',
        whatsappMessage: s.whatsappMessage !== undefined ? s.whatsappMessage : 'Halo Admin AdilaNet, saya butuh bantuan.'
      } });
    } catch {
      res.json({ success: true, data: { qrisEnabled: true, hotspotLoginUrl: '', whatsappNumber: '', whatsappMessage: '' } });
    }
  });

  // ─── PROMOS / BANNERS ──────────────────────────────────────────────────────
  const PROMO_COLORS = ['iris', 'gold', 'brand', 'success', 'danger', 'grape'];
  const PROMO_ICONS = ['star', 'zap', 'wifi', 'gift', 'percent', 'flame', 'rocket', 'sparkles'];
  const PROMO_LINK_TYPES = ['packages', 'package', 'external', 'none'];
  const PROMO_SHOW_ON = ['home', 'landing', 'both'];

  function mapPromo(p: any) {
    return {
      id: p.id,
      title: p.title,
      subtitle: p.subtitle || '',
      color: p.color || 'iris',
      icon: p.icon || 'star',
      badge: p.badge || '',
      image_url: p.image_url || '',
      link_type: p.link_type || 'packages',
      link_value: p.link_value || '',
      button_text: p.button_text || '',
      active: !!p.active,
      start_date: p.start_date ? new Date(p.start_date).toISOString().slice(0, 10) : null,
      end_date: p.end_date ? new Date(p.end_date).toISOString().slice(0, 10) : null,
      sort_order: p.sort_order ?? 0,
      show_on: p.show_on || 'both',
      discount_type: ['percent', 'amount'].includes(p.discount_type) ? p.discount_type : 'none',
      discount_value: parseFloat(p.discount_value) || 0,
    };
  }

  function sanitizePromo(body: any) {
    const title = String(body.title ?? '').trim().slice(0, 120);
    const subtitle = String(body.subtitle ?? '').trim().slice(0, 200);
    const color = PROMO_COLORS.includes(body.color) ? body.color : 'iris';
    const icon = PROMO_ICONS.includes(body.icon) ? body.icon : 'star';
    const badge = String(body.badge ?? '').trim().slice(0, 40);
    let image_url = typeof body.image_url === 'string' ? body.image_url : '';
    // Only accept inline image data URLs (jpeg/png/webp) or http(s) links.
    if (image_url && !/^data:image\/(jpeg|png|webp);base64,/.test(image_url) && !/^https?:\/\//.test(image_url)) image_url = '';
    // Hard cap inline image payload (~1.5 MB of base64 ≈ ~1.1 MB binary).
    if (image_url.length > 1_500_000) image_url = '';
    const link_type = PROMO_LINK_TYPES.includes(body.link_type) ? body.link_type : 'packages';
    const link_value = String(body.link_value ?? '').trim().slice(0, 500);
    const button_text = String(body.button_text ?? '').trim().slice(0, 40);
    const active = body.active === undefined ? true : !!body.active;
    const show_on = PROMO_SHOW_ON.includes(body.show_on) ? body.show_on : 'both';
    let sort_order = parseInt(String(body.sort_order), 10);
    if (!Number.isFinite(sort_order)) sort_order = 0;
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const start_date = dateRe.test(body.start_date) ? body.start_date : null;
    const end_date = dateRe.test(body.end_date) ? body.end_date : null;
    // Discount only applies when the promo targets a specific package.
    let discount_type = ['percent', 'amount'].includes(body.discount_type) ? body.discount_type : 'none';
    let discount_value = parseFloat(String(body.discount_value));
    if (!Number.isFinite(discount_value) || discount_value < 0) discount_value = 0;
    if (discount_type === 'percent' && discount_value > 100) discount_value = 100;
    if (discount_type === 'amount' && discount_value > 99_999_999) discount_value = 99_999_999;
    if (link_type !== 'package' || discount_value <= 0) { discount_type = 'none'; discount_value = 0; }
    return { title, subtitle, color, icon, badge, image_url, link_type, link_value, button_text, active, show_on, sort_order, start_date, end_date, discount_type, discount_value };
  }

  // Authoritative purchase price: starts from the package price and applies a
  // promo discount ONLY when the promo is valid (active, in its date window,
  // targets THIS package). Never trust a client-supplied amount.
  async function resolvePurchaseAmount(pkg: any, promoId: any): Promise<number> {
    const base = Math.round(parseFloat(pkg.price));
    const pid = parseInt(String(promoId), 10);
    if (!Number.isFinite(pid)) return base;
    const { rows } = await pool.query(
      `SELECT * FROM promos WHERE id = $1 AND active = true
         AND (start_date IS NULL OR start_date <= CURRENT_DATE)
         AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
      [pid]
    );
    const promo = rows[0];
    if (!promo) return base;
    if (promo.link_type !== 'package' || String(promo.link_value) !== String(pkg.id)) return base;
    const dval = parseFloat(promo.discount_value) || 0;
    if (dval <= 0) return base;
    if (promo.discount_type === 'percent') return Math.max(0, Math.round(base * (1 - Math.min(dval, 100) / 100)));
    if (promo.discount_type === 'amount') return Math.max(0, Math.round(base - dval));
    return base;
  }

  // Public: only active promos within their schedule window. Optional ?show_on=home|landing
  app.get("/api/promos/public", async (req, res) => {
    try {
      const showOn = PROMO_SHOW_ON.includes(String(req.query.show_on)) ? String(req.query.show_on) : null;
      const { rows } = await pool.query(
        `SELECT * FROM promos
         WHERE active = true
           AND (start_date IS NULL OR start_date <= CURRENT_DATE)
           AND (end_date IS NULL OR end_date >= CURRENT_DATE)
         ORDER BY sort_order ASC, id ASC
         LIMIT 12`
      );
      let data = rows.map(mapPromo);
      if (showOn) data = data.filter(p => p.show_on === showOn || p.show_on === 'both');
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin: full list
  app.get("/api/promos", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM promos ORDER BY sort_order ASC, id ASC`);
      res.json({ success: true, data: rows.map(mapPromo) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/promos", requireAdmin, async (req, res) => {
    try {
      const p = sanitizePromo(req.body);
      if (!p.title) return res.status(400).json({ success: false, error: "Judul promo wajib diisi." });
      const { rows } = await pool.query(
        `INSERT INTO promos (title, subtitle, color, icon, badge, image_url, link_type, link_value, button_text, active, start_date, end_date, sort_order, show_on, discount_type, discount_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [p.title, p.subtitle, p.color, p.icon, p.badge, p.image_url, p.link_type, p.link_value, p.button_text, p.active, p.start_date, p.end_date, p.sort_order, p.show_on, p.discount_type, p.discount_value]
      );
      res.json({ success: true, data: mapPromo(rows[0]) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.patch("/api/promos/:id", requireAdmin, async (req, res) => {
    try {
      const p = sanitizePromo(req.body);
      if (!p.title) return res.status(400).json({ success: false, error: "Judul promo wajib diisi." });
      const { rows } = await pool.query(
        `UPDATE promos SET title=$1, subtitle=$2, color=$3, icon=$4, badge=$5, image_url=$6, link_type=$7, link_value=$8, button_text=$9, active=$10, start_date=$11, end_date=$12, sort_order=$13, show_on=$14, discount_type=$15, discount_value=$16 WHERE id=$17 RETURNING *`,
        [p.title, p.subtitle, p.color, p.icon, p.badge, p.image_url, p.link_type, p.link_value, p.button_text, p.active, p.start_date, p.end_date, p.sort_order, p.show_on, p.discount_type, p.discount_value, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Promo tidak ditemukan." });
      res.json({ success: true, data: mapPromo(rows[0]) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/promos/:id", requireAdmin, async (req, res) => {
    try {
      await pool.query(`DELETE FROM promos WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── PAYMENT (QRIS via SanPay) ────────────────────────────────────────────
  // Generates a real dynamic QRIS through SanPay (sanpay.site). The voucher is
  // NEVER issued here — it is only issued after SanPay confirms payment via the
  // signed webhook below. The client polls /api/payment/status/:refId.
  app.post("/api/payment/create-qris", async (req, res) => {
    try {
      const s = await getSettings();
      if (s.qrisEnabled === 'false') {
        return res.status(403).json({ success: false, error: "Pembayaran via QRIS sedang dinonaktifkan." });
      }

      const apiKey = (s.sanpayApiKey || '').trim();
      const merchantCode = (s.merchantId || '').trim();
      if (!apiKey || !merchantCode) {
        return res.status(503).json({
          success: false,
          error: "QRIS belum dikonfigurasi. Admin perlu mengisi Merchant Code & API Key SanPay di Setelan.",
        });
      }

      const { packageId } = req.body;
      if (!packageId) return res.status(400).json({ success: false, error: "packageId wajib diisi." });
      const { rows: pkgRows } = await pool.query(`SELECT * FROM packages WHERE id = $1`, [packageId]);
      if (pkgRows.length === 0) return res.status(404).json({ success: false, error: "Paket tidak ditemukan." });
      const pkg = pkgRows[0];

      // Authoritative amount from the package + any valid promo discount —
      // never trust a client-supplied price.
      const amount = await resolvePurchaseAmount(pkg, req.body.promoId);
      const phone = typeof req.body.phone === 'string' ? req.body.phone.slice(0, 30) : null;
      const userId = req.session?.userId || null;

      // Unique partner reference (SanPay limit: 64 chars).
      const refId = `WFI-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

      // Record a pending transaction up-front keyed by reference_id. SanPay's
      // callback only echoes this reference, so we must persist who/what it is for.
      await pool.query(
        `INSERT INTO transactions (user_id, package_id, voucher_code, amount, payment_method, status, reference_id, phone)
         VALUES ($1, $2, NULL, $3, 'qris', 'pending', $4, $5)
         ON CONFLICT (reference_id) DO NOTHING`,
        [userId, packageId, amount, refId, phone]
      );

      // Ask SanPay to generate the dynamic QRIS.
      const payload = JSON.stringify({ amount, partnerReferenceNo: refId, expirySeconds: 600 });
      const signature = sanpaySignature(payload, apiKey);
      let sanpayJson: any;
      try {
        const resp = await fetch("https://sanpay.site/api/v1/topup_qris", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Merchant-Code": merchantCode,
            "X-Signature": signature,
          },
          body: payload,
        });
        sanpayJson = await resp.json().catch(() => ({}));
        if (!resp.ok || sanpayJson.status !== "success" || !sanpayJson.qrContent) {
          throw new Error(sanpayJson?.message || `SanPay HTTP ${resp.status}`);
        }
      } catch (apiErr: any) {
        await pool.query(`DELETE FROM transactions WHERE reference_id = $1 AND status = 'pending'`, [refId]);
        console.error(`[QRIS] Gagal membuat QRIS SanPay: ${apiErr.message}`);
        return res.status(502).json({ success: false, error: `Gagal membuat QRIS: ${apiErr.message}` });
      }

      const qrContent = sanpayJson.qrContent;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrContent)}`;
      res.json({
        success: true,
        data: {
          reference_id: refId,
          qr_string: qrContent,
          qr_url: qrUrl,
          amount,
          expires_at: sanpayJson.expiresAt || null,
          status: "pending",
        },
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Client polls this to learn when SanPay has confirmed the payment and the
  // voucher has been provisioned. The reference is unguessable (timestamp+random).
  app.get("/api/payment/status/:refId", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT status, voucher_code FROM transactions WHERE reference_id = $1`,
        [req.params.refId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: "Transaksi tidak ditemukan." });
      }
      const row = rows[0];
      res.json({
        success: true,
        data: {
          status: row.status,
          voucher_code: row.status === "success" ? row.voucher_code : null,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // SanPay calls this when a payment succeeds. Authenticated via X-Merchant-Code
  // + X-Signature (HMAC-SHA256 of the raw body with our API Key).
  app.post("/api/webhook/sanpay", async (req: any, res) => {
    try {
      const s = await getSettings();
      const apiKey = (s.sanpayApiKey || '').trim();
      const merchantCode = (s.merchantId || '').trim();

      // Verify authenticity. Only enforced once credentials are configured so the
      // SanPay dashboard "Validasi URL" test can still reach us during setup.
      if (apiKey && merchantCode) {
        const sigHeader = req.get("x-signature") || "";
        const mcHeader = req.get("x-merchant-code") || "";
        const raw = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body || {});
        const expected = sanpaySignature(raw, apiKey);
        const sigOk =
          sigHeader.length === expected.length &&
          crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
        if (mcHeader !== merchantCode || !sigOk) {
          return res.status(401).json({ status: "error", message: "Invalid signature" });
        }
      }

      const body = req.body || {};

      // Validation ping from the SanPay dashboard — just acknowledge.
      if (body.isValidationTest) {
        return res.status(200).json({ status: "success" });
      }

      // Only act on a successful payment. QRIS success callbacks carry no status
      // field (SanPay only calls on success), but VA/Retail send status='success'
      // and payment_status='PAID'. Reject anything that explicitly says otherwise.
      if (body.status && body.status !== "success") {
        return res.status(200).json({ status: "success" });
      }
      if (body.payment_status && body.payment_status !== "PAID") {
        return res.status(200).json({ status: "success" });
      }

      // QRIS callback echoes our partnerReferenceNo as `referenceNo`.
      // VA/Retail callback uses `partnerReferenceNo`.
      const ref = body.referenceNo || body.partnerReferenceNo;
      if (!ref) {
        return res.status(200).json({ status: "success" });
      }

      // Atomically claim the pending transaction so concurrent/duplicate
      // callbacks can never double-provision.
      const { rows: claim } = await pool.query(
        `UPDATE transactions SET status = 'provisioning'
         WHERE reference_id = $1 AND status = 'pending'
         RETURNING id, package_id, amount, user_id, phone`,
        [ref]
      );
      if (claim.length === 0) {
        // Unknown reference, or already handled/in-flight — acknowledge idempotently.
        return res.status(200).json({ status: "success" });
      }

      const txId = claim[0].id;

      // Verify the paid amount matches what we charged for this reference.
      if (body.amount !== undefined) {
        const expected = Math.round(parseFloat(claim[0].amount));
        const paid = Math.round(Number(body.amount));
        if (!Number.isFinite(paid) || paid !== expected) {
          await pool.query(`UPDATE transactions SET status = 'pending' WHERE id = $1`, [txId]);
          console.error(`[Webhook] Nominal tidak cocok untuk ${ref}: diharapkan ${expected}, diterima ${body.amount}`);
          return res.status(400).json({ status: "error", message: "amount mismatch" });
        }
      }

      const { rows: pkgRows } = await pool.query(`SELECT * FROM packages WHERE id = $1`, [claim[0].package_id]);
      if (pkgRows.length === 0) {
        await pool.query(`UPDATE transactions SET status = 'pending' WHERE id = $1`, [txId]);
        return res.status(200).json({ status: "success" });
      }

      try {
        const code = await generateUniqueVoucher();
        // Tag the voucher with who bought it: a registered user (look up name) or
        // a public/guest QRIS purchase (fall back to the phone they entered).
        let identity: string;
        if (claim[0].user_id) {
          const { rows: bu } = await pool.query(`SELECT name FROM users WHERE id = $1`, [claim[0].user_id]);
          identity = buildVoucherIdentity({ userId: claim[0].user_id, name: bu[0]?.name });
        } else {
          identity = buildVoucherIdentity({ phone: claim[0].phone });
        }
        await provisionVoucher(pkgRows[0], code, identity);
        await pool.query(
          `UPDATE transactions SET voucher_code = $1, status = 'success' WHERE id = $2`,
          [code, txId]
        );
        console.log(`[Webhook] Pembayaran ${ref} sukses — voucher ${code} dibuat.`);
      } catch (provErr: any) {
        // Roll back to 'pending' and return a non-2xx so SanPay retries the
        // callback later (e.g. once a transiently-offline router is back). The
        // buyer has paid, so the transaction stays recoverable for reconciliation.
        await pool.query(`UPDATE transactions SET status = 'pending' WHERE id = $1`, [txId]);
        console.error(`[Webhook] Gagal provision voucher untuk ${ref}: ${provErr.message}`);
        return res.status(500).json({ status: "error", message: "provisioning failed, will retry" });
      }

      res.status(200).json({ status: "success" });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).json({ status: "error" });
    }
  });

  // ─── MIKROTIK PROFILES ───────────────────────────────────────────────────
  app.get("/api/routers/:id/profiles", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM routers WHERE id = $1`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      const router = rows[0];

      const fallbackProfiles = [
        { id: "default", name: "default", sessionTimeout: "Unlimited", validity: "Unlimited", validityRaw: "", sharedUsers: "1", rateLimit: "N/A" },
        { id: "1jam", name: "1jam", sessionTimeout: "1 Jam", validity: "1 Jam", validityRaw: "1h", sharedUsers: "1", rateLimit: "2M/2M" },
        { id: "3jam", name: "3jam", sessionTimeout: "3 Jam", validity: "3 Jam", validityRaw: "3h", sharedUsers: "1", rateLimit: "5M/5M" },
        { id: "1hari", name: "1hari", sessionTimeout: "1 Hari", validity: "1 Hari", validityRaw: "1d", sharedUsers: "1", rateLimit: "10M/10M" },
        { id: "7hari", name: "7hari", sessionTimeout: "7 Hari", validity: "7 Hari", validityRaw: "7d", sharedUsers: "2", rateLimit: "20M/20M" },
        { id: "30hari", name: "30hari", sessionTimeout: "30 Hari", validity: "30 Hari", validityRaw: "30d", sharedUsers: "3", rateLimit: "50M/50M" },
      ];

      try {
        // Race Mikrotik connection against 4 second timeout
        const { getProfiles } = await import("./src/server/mikrotik");
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Mikrotik connection timeout")), 4000)
        );
        const profiles = await Promise.race([
          getProfiles({ host: router.ip_address, user: router.username, pass: router.password, port: router.api_port }),
          timeoutPromise,
        ]);
        return res.json({ success: true, data: profiles, source: "mikrotik" });
      } catch (mikrotikErr: any) {
        console.warn(`[Mikrotik] Router ${router.name} tidak terjangkau: ${mikrotikErr.message}`);
        return res.json({
          success: true,
          data: fallbackProfiles,
          source: "demo",
          warning: "Router tidak terjangkau, menampilkan profil demo."
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  async function getRouterConfig(id: string) {
    const { rows } = await pool.query(`SELECT * FROM routers WHERE id = $1`, [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return { host: r.ip_address, user: r.username, pass: r.password, port: r.api_port };
  }

  // Create the actual hotspot voucher on the package's Mikrotik router using its
  // configured profile (profile defines duration & rate/quota limits).
  // Throws a clear error if the package is misconfigured or the router is unreachable.
  async function provisionVoucher(pkg: any, voucherCode: string, identity?: string) {
    if (!pkg.router_id) {
      throw new Error("Paket belum terhubung ke router Mikrotik. Hubungi admin.");
    }
    if (!pkg.mikrotik_profile) {
      throw new Error("Paket belum memiliki profil Mikrotik. Hubungi admin.");
    }
    const { rows } = await pool.query(`SELECT * FROM routers WHERE id = $1`, [pkg.router_id]);
    if (rows.length === 0) {
      throw new Error("Router untuk paket ini tidak ditemukan.");
    }
    const r = rows[0];
    await createVoucher(
      { host: r.ip_address, user: r.username, pass: r.password, port: r.api_port },
      pkg.mikrotik_profile,
      voucherCode,
      voucherCode,
      identity
    );
  }

  // Validate hotspot profile fields before sending to RouterOS
  function validateProfileInput(body: any): string | null {
    const { name, rateLimit, sharedUsers, sessionTimeout, validity } = body;
    const hasCtrl = (s: string) => /[\x00-\x1f]/.test(s);
    if (typeof name !== "string" || !/^[\w .\-]{1,64}$/.test(name)) {
      return "Nama profil hanya boleh huruf, angka, spasi, titik, dash; maks 64 karakter.";
    }
    if (rateLimit !== undefined && rateLimit !== "" &&
        (typeof rateLimit !== "string" || rateLimit.length > 64 || hasCtrl(rateLimit))) {
      return "Rate limit tidak valid.";
    }
    if (sharedUsers !== undefined && sharedUsers !== "" &&
        !/^\d{1,4}$/.test(String(sharedUsers))) {
      return "Shared users harus angka (1-9999).";
    }
    if (sessionTimeout !== undefined && sessionTimeout !== "" &&
        (typeof sessionTimeout !== "string" || sessionTimeout.length > 32 || hasCtrl(sessionTimeout))) {
      return "Session timeout tidak valid.";
    }
    if (validity !== undefined && validity !== "" &&
        (typeof validity !== "string" || !/^\d{1,5}[mhd]$/.test(validity))) {
      return "Masa aktif tidak valid (gunakan menit/jam/hari).";
    }
    return null;
  }

  app.post("/api/routers/:id/profiles", requireAdmin, async (req, res) => {
    try {
      const { name, rateLimit, sharedUsers, sessionTimeout, validity } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Nama profil wajib diisi." });
      const vErr = validateProfileInput(req.body);
      if (vErr) return res.status(400).json({ success: false, error: vErr });
      const cfg = await getRouterConfig(req.params.id);
      if (!cfg) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      await createProfile(cfg, { name, rateLimit, sharedUsers, sessionTimeout, validity });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: `Gagal membuat profil di router: ${err.message}` });
    }
  });

  app.put("/api/routers/:id/profiles", requireAdmin, async (req, res) => {
    try {
      const { profileId, name, rateLimit, sharedUsers, sessionTimeout, validity } = req.body;
      if (!profileId || !name) return res.status(400).json({ success: false, error: "profileId dan name wajib diisi." });
      if (typeof profileId !== "string" || profileId.length > 64 || /[\x00-\x1f]/.test(profileId)) {
        return res.status(400).json({ success: false, error: "profileId tidak valid." });
      }
      const vErr = validateProfileInput(req.body);
      if (vErr) return res.status(400).json({ success: false, error: vErr });
      const cfg = await getRouterConfig(req.params.id);
      if (!cfg) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      await updateProfile(cfg, profileId, { name, rateLimit, sharedUsers, sessionTimeout, validity });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: `Gagal memperbarui profil di router: ${err.message}` });
    }
  });

  app.delete("/api/routers/:id/profiles", requireAdmin, async (req, res) => {
    try {
      const { profileId } = req.body;
      if (!profileId) return res.status(400).json({ success: false, error: "profileId wajib diisi." });
      const cfg = await getRouterConfig(req.params.id);
      if (!cfg) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      await deleteProfile(cfg, profileId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: `Gagal menghapus profil di router: ${err.message}` });
    }
  });

  // ─── MIKROTIK VOUCHER ─────────────────────────────────────────────────────
  app.post("/api/router/create-voucher", requireAdmin, async (req, res) => {
    try {
      const { routerId, profile, name, password } = req.body;
      if (!routerId || !profile || !name) {
        return res.status(400).json({ success: false, error: "routerId, profile, dan name wajib diisi." });
      }
      const { rows } = await pool.query(`SELECT * FROM routers WHERE id = $1`, [routerId]);
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      const router = rows[0];
      const result = await createVoucher(
        { host: router.ip_address, user: router.username, pass: router.password, port: router.api_port },
        profile,
        name,
        password,
        buildVoucherIdentity({ admin: true })
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Bulk-generate vouchers and provision them on the router in one batch.
  app.post("/api/router/create-vouchers-bulk", requireAdmin, async (req, res) => {
    try {
      const { routerId, profile, quantity, codeFormat, loginMode } = req.body;
      if (!routerId || !profile) {
        return res.status(400).json({ success: false, error: "routerId dan profile wajib diisi." });
      }
      const qty = parseInt(String(quantity), 10);
      if (!Number.isFinite(qty) || qty < 1 || qty > 200) {
        return res.status(400).json({ success: false, error: "Jumlah voucher harus antara 1 dan 200." });
      }
      const fmt = codeFormat === "numbers" ? "numbers" : "alphanumeric";
      const separate = loginMode === "separate";

      const { rows } = await pool.query(`SELECT * FROM routers WHERE id = $1`, [routerId]);
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      const router = rows[0];

      // Generate unique codes within the batch (MikroTik enforces uniqueness too).
      const seen = new Set<string>();
      const vouchers: { name: string; password: string; comment?: string }[] = [];
      const identity = buildVoucherIdentity({ admin: true });
      let guard = 0;
      while (vouchers.length < qty && guard < qty * 50) {
        guard++;
        const user = genBulkCode(fmt);
        if (seen.has(user)) continue;
        seen.add(user);
        const pass = separate ? genBulkCode(fmt) : user;
        vouchers.push({ name: user, password: pass, comment: identity });
      }
      if (vouchers.length < qty) {
        return res.status(400).json({
          success: false,
          error: "Tidak bisa membuat kode unik sebanyak itu. Kurangi jumlah atau ganti format kode.",
        });
      }

      const result = await createVouchersBulk(
        { host: router.ip_address, user: router.username, pass: router.password, port: router.api_port },
        profile,
        vouchers
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── VITE / STATIC ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
