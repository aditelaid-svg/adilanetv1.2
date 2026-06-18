import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { createVoucher, createProfile, updateProfile, deleteProfile } from "./src/server/mikrotik";
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

function isBcryptHash(value: unknown): boolean {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

async function hashSecret(value: string): Promise<string> {
  return bcrypt.hash(value, BCRYPT_ROUNDS);
}

async function generateUniqueVoucher(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = `WFI-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const { rows } = await pool.query("SELECT 1 FROM transactions WHERE voucher_code = $1", [code]);
    if (rows.length === 0) return code;
  }
  throw new Error("Gagal menghasilkan kode voucher unik, coba lagi.");
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
    DROP INDEX IF EXISTS transactions_reference_id_uniq;
    CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_id_key ON transactions(reference_id);

    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      config_key VARCHAR(100) UNIQUE NOT NULL,
      config_value TEXT DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW()
    );
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
      ('qrisEnabled', 'true')
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
  app.use(express.json());

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
        secure: isProd,
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
      res.json({ success: true, data: { ...safeUser, balance: parseFloat(safeUser.balance) } });
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
        `SELECT id, name, email, phone_number, role, balance, status FROM users WHERE id = $1`,
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
      res.json({ success: true, data: { ...safeUser, balance: parseFloat(safeUser.balance) } });
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
        `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, name, email, phone_number, role, balance, status`,
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
      const { amount } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ success: false, error: "Nominal tidak valid." });
      const targetId = Number(req.params.id);
      const { rows: tgt } = await pool.query(`SELECT role FROM users WHERE id = $1`, [targetId]);
      if (tgt.length === 0) return res.status(404).json({ success: false, error: "User tidak ditemukan." });
      if (tgt[0].role === "superadmin" && targetId !== req.session.userId) {
        return res.status(403).json({ success: false, error: "Saldo superadmin tidak bisa diubah oleh admin lain." });
      }
      const { rows } = await pool.query(
        `UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, balance`,
        [amount, targetId]
      );
      if (rows.length === 0) return res.status(404).json({ success: false, error: "User tidak ditemukan." });
      res.json({ success: true, data: { ...rows[0], balance: parseFloat(rows[0].balance) } });
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

  app.post("/api/routers/:id/sync", requireAdmin, async (req, res) => {
    try {
      const newCount = Math.floor(Math.random() * 20) + 5;
      const { rows } = await pool.query(
        `UPDATE routers SET connected_users = connected_users + $1 WHERE id = $2 RETURNING id, name, ip_address, api_port, username, status, connected_users, created_at`,
        [newCount, req.params.id]
      );
      res.json({ success: true, data: rows[0] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
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

      // Get user and package
      const { rows: userRows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [user_id]);
      const { rows: pkgRows } = await pool.query(`SELECT * FROM packages WHERE id = $1`, [package_id]);

      if (userRows.length === 0) return res.status(404).json({ success: false, error: "User tidak ditemukan." });
      if (pkgRows.length === 0) return res.status(404).json({ success: false, error: "Paket tidak ditemukan." });

      const user = userRows[0];
      const pkg = pkgRows[0];
      const amount = parseFloat(pkg.price);

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
          await provisionVoucher(pkg, voucherCode);
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
          qrisEnabled: s.qrisEnabled !== 'false'
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/settings", requireAdmin, async (req, res) => {
    try {
      const { sanpayApiKey, merchantId, telegramToken, telegramChatId, qrisEnabled } = req.body;
      const updates = [
        ['sanpayApiKey', sanpayApiKey ?? ''],
        ['merchantId', merchantId ?? ''],
        ['telegramToken', telegramToken ?? ''],
        ['telegramChatId', telegramChatId ?? ''],
        ['qrisEnabled', String(qrisEnabled ?? true)],
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
      res.json({ success: true, data: { qrisEnabled: s.qrisEnabled !== 'false' } });
    } catch {
      res.json({ success: true, data: { qrisEnabled: true } });
    }
  });

  // ─── PAYMENT (QRIS) ───────────────────────────────────────────────────────
  app.post("/api/payment/create-qris", async (req, res) => {
    try {
      const s = await getSettings();
      if (s.qrisEnabled === 'false') {
        return res.status(403).json({ success: false, error: "Pembayaran via QRIS sedang Maintenance/Dinonaktifkan." });
      }

      const { amount, packageId, phone } = req.body;
      const SANPAY_API_KEY = s.sanpayApiKey || process.env.SANPAY_API_KEY;
      const refId = `WFI-TX-${Date.now()}`;

      if (!SANPAY_API_KEY) {
        return res.json({
          success: true,
          data: {
            reference_id: refId,
            qr_string: "QRIS_MOCK_DATA_1234567890",
            qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=QRIS-DEMO-${refId}`,
            amount: amount,
            status: "pending"
          },
          message: "Mode demo: QRIS mock (tidak ada API Key)"
        });
      }

      // Real Sanpay integration placeholder
      res.json({
        success: true,
        data: {
          reference_id: refId,
          qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=QRIS-${refId}`,
          amount,
          status: "pending"
        }
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/webhook/sanpay", async (req, res) => {
    try {
      // Verify webhook authenticity via shared secret
      const expectedSecret = process.env.SANPAY_WEBHOOK_SECRET;
      if (expectedSecret) {
        const provided = req.get("x-webhook-secret") || req.body?.secret;
        if (provided !== expectedSecret) {
          return res.status(401).json({ received: false, error: "Webhook signature tidak valid." });
        }
      }
      const { reference_id, status, user_id, package_id } = req.body;
      console.log(`[Webhook] Pembayaran ${reference_id}: ${status}`);
      let voucherCode = null;
      if (status === "Success" || status === "PAID") {
        // reference_id is mandatory so the callback is idempotent (no bypass).
        if (!reference_id) {
          return res.status(400).json({ received: false, error: "reference_id wajib untuk konfirmasi pembayaran." });
        }
        if (user_id && package_id) {
          const { rows: pkgRows } = await pool.query(`SELECT * FROM packages WHERE id = $1`, [package_id]);
          if (pkgRows.length > 0) {
            // Atomically claim this payment reference BEFORE provisioning. The row
            // is 'pending' with voucher_code = NULL until the hotspot user is
            // actually created on Mikrotik — so a concurrent/duplicate callback
            // never receives a code that isn't valid yet.
            const { rows: claim } = await pool.query(
              `INSERT INTO transactions (user_id, package_id, voucher_code, amount, payment_method, status, reference_id)
               VALUES ($1, $2, NULL, $3, 'qris', 'pending', $4)
               ON CONFLICT (reference_id) DO NOTHING RETURNING id`,
              [user_id, package_id, parseFloat(pkgRows[0].price), reference_id]
            );
            if (claim.length === 0) {
              // Already claimed/processed — only expose the code once it succeeded
              const { rows: existing } = await pool.query(
                `SELECT voucher_code, status FROM transactions WHERE reference_id = $1`,
                [reference_id]
              );
              const row = existing[0];
              return res.status(200).json({
                received: true,
                voucher_code: row && row.status === "success" ? row.voucher_code : null,
              });
            }
            const claimedId = claim[0].id;
            try {
              const code = await generateUniqueVoucher();
              await provisionVoucher(pkgRows[0], code);
              await pool.query(
                `UPDATE transactions SET voucher_code = $1, status = 'success' WHERE id = $2`,
                [code, claimedId]
              );
              voucherCode = code;
            } catch (provErr: any) {
              // Provisioning failed — release the claim so the payment can be retried
              await pool.query(`DELETE FROM transactions WHERE id = $1`, [claimedId]);
              console.error(`[Webhook] Gagal provision voucher untuk ${reference_id}: ${provErr.message}`);
            }
          }
        }
      }
      res.status(200).json({ received: true, voucher_code: voucherCode });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).send("Webhook Error");
    }
  });

  // ─── PUBLIC PURCHASE (no login needed - for hotspot portal) ───────────────
  app.post("/api/transactions/public", async (req, res) => {
    try {
      const { package_id, phone } = req.body;
      if (!package_id) return res.status(400).json({ success: false, error: "package_id wajib diisi." });
      const { rows: pkgRows } = await pool.query(`SELECT * FROM packages WHERE id = $1`, [package_id]);
      if (pkgRows.length === 0) return res.status(404).json({ success: false, error: "Paket tidak ditemukan." });
      const pkg = pkgRows[0];
      const voucherCode = await generateUniqueVoucher();
      // Create the voucher on the Mikrotik router first — if this fails the buyer
      // gets no usable voucher, so we abort instead of saving a dead transaction.
      try {
        await provisionVoucher(pkg, voucherCode);
      } catch (provErr: any) {
        console.error(`[PublicBuy] Gagal provision voucher: ${provErr.message}`);
        return res.status(502).json({ success: false, error: `Gagal membuat voucher di Mikrotik: ${provErr.message}` });
      }
      const { rows: txRows } = await pool.query(
        `INSERT INTO transactions (user_id, package_id, voucher_code, amount, payment_method, status) VALUES (NULL, $1, $2, $3, 'qris', 'success') RETURNING *`,
        [package_id, voucherCode, parseFloat(pkg.price)]
      );
      const tx = txRows[0];
      console.log(`[PublicBuy] Voucher dibuat: ${voucherCode} untuk paket ${pkg.name}, HP: ${phone || 'N/A'}`);
      res.json({ success: true, data: { transaction: tx, voucher_code: voucherCode, package: pkg } });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── MIKROTIK PROFILES ───────────────────────────────────────────────────
  app.get("/api/routers/:id/profiles", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM routers WHERE id = $1`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      const router = rows[0];

      const fallbackProfiles = [
        { id: "default", name: "default", sessionTimeout: "Unlimited", sharedUsers: "1", rateLimit: "N/A" },
        { id: "1jam", name: "1jam", sessionTimeout: "1 Jam", sharedUsers: "1", rateLimit: "2M/2M" },
        { id: "3jam", name: "3jam", sessionTimeout: "3 Jam", sharedUsers: "1", rateLimit: "5M/5M" },
        { id: "1hari", name: "1hari", sessionTimeout: "1 Hari", sharedUsers: "1", rateLimit: "10M/10M" },
        { id: "7hari", name: "7hari", sessionTimeout: "7 Hari", sharedUsers: "2", rateLimit: "20M/20M" },
        { id: "30hari", name: "30hari", sessionTimeout: "30 Hari", sharedUsers: "3", rateLimit: "50M/50M" },
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
  async function provisionVoucher(pkg: any, voucherCode: string) {
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
      voucherCode
    );
  }

  // Validate hotspot profile fields before sending to RouterOS
  function validateProfileInput(body: any): string | null {
    const { name, rateLimit, sharedUsers, sessionTimeout } = body;
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
    return null;
  }

  app.post("/api/routers/:id/profiles", requireAdmin, async (req, res) => {
    try {
      const { name, rateLimit, sharedUsers, sessionTimeout } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Nama profil wajib diisi." });
      const vErr = validateProfileInput(req.body);
      if (vErr) return res.status(400).json({ success: false, error: vErr });
      const cfg = await getRouterConfig(req.params.id);
      if (!cfg) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      await createProfile(cfg, { name, rateLimit, sharedUsers, sessionTimeout });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: `Gagal membuat profil di router: ${err.message}` });
    }
  });

  app.put("/api/routers/:id/profiles", requireAdmin, async (req, res) => {
    try {
      const { profileId, name, rateLimit, sharedUsers, sessionTimeout } = req.body;
      if (!profileId || !name) return res.status(400).json({ success: false, error: "profileId dan name wajib diisi." });
      if (typeof profileId !== "string" || profileId.length > 64 || /[\x00-\x1f]/.test(profileId)) {
        return res.status(400).json({ success: false, error: "profileId tidak valid." });
      }
      const vErr = validateProfileInput(req.body);
      if (vErr) return res.status(400).json({ success: false, error: vErr });
      const cfg = await getRouterConfig(req.params.id);
      if (!cfg) return res.status(404).json({ success: false, error: "Router tidak ditemukan." });
      await updateProfile(cfg, profileId, { name, rateLimit, sharedUsers, sessionTimeout });
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
        password
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
