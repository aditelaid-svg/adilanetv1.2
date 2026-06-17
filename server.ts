import express from "express";
import path from "path";
import cors from "cors";
import { Pool } from "pg";
import { createVoucher } from "./src/server/mikrotik";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone_number VARCHAR(30) UNIQUE,
      password VARCHAR(255) NOT NULL,
      pin VARCHAR(6),
      role VARCHAR(10) DEFAULT 'user',
      balance DECIMAL(10,2) DEFAULT 0.00,
      status VARCHAR(10) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
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
      ('Admin Web', 'admin@wifivoucher.com', '08999999999', 'admin', 'admin', 0),
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

  app.use(cors());
  app.use(express.json());

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
        `SELECT * FROM users WHERE (email = $1 OR phone_number = $1 OR name = $1) AND password = $2 LIMIT 1`,
        [identifier, password]
      );
      if (rows.length === 0) {
        return res.status(401).json({ success: false, error: "Username/Nomor HP atau Password salah." });
      }
      const user = rows[0];
      if (user.status === 'blocked') {
        return res.status(403).json({ success: false, error: "Akun Anda telah ditangguhkan. Hubungi Administrator." });
      }
      const { password: _pw, ...safeUser } = user;
      res.json({ success: true, data: { ...safeUser, balance: parseFloat(safeUser.balance) } });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, phone_number, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: "Nama, email, dan password wajib diisi." });
      }
      const { rows } = await pool.query(
        `INSERT INTO users (name, email, phone_number, password, role, balance) VALUES ($1, $2, $3, $4, 'user', 0) RETURNING *`,
        [name, email, phone_number || null, password]
      );
      const user = rows[0];
      const { password: _pw, ...safeUser } = user;
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
  app.get("/api/users", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, email, phone_number, pin, role, balance, status, created_at FROM users ORDER BY id`
      );
      res.json({ success: true, data: rows.map((u: any) => ({ ...u, balance: parseFloat(u.balance) })) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, email, phone_number, pin, role, balance, status, created_at FROM users WHERE id = $1`,
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ success: false, error: "User tidak ditemukan." });
      const u = rows[0];
      res.json({ success: true, data: { ...u, balance: parseFloat(u.balance) } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const { name, email, phone_number, password, pin, role, balance, status } = req.body;
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;
      if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
      if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }
      if (phone_number !== undefined) { fields.push(`phone_number = $${idx++}`); values.push(phone_number); }
      if (password !== undefined) { fields.push(`password = $${idx++}`); values.push(password); }
      if (pin !== undefined) { fields.push(`pin = $${idx++}`); values.push(pin); }
      if (role !== undefined) { fields.push(`role = $${idx++}`); values.push(role); }
      if (balance !== undefined) { fields.push(`balance = $${idx++}`); values.push(balance); }
      if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }
      fields.push(`updated_at = NOW()`);
      values.push(req.params.id);
      const { rows } = await pool.query(
        `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, name, email, phone_number, pin, role, balance, status`,
        values
      );
      if (rows.length === 0) return res.status(404).json({ success: false, error: "User tidak ditemukan." });
      const u = rows[0];
      res.json({ success: true, data: { ...u, balance: parseFloat(u.balance) } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/users/:id/topup", async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ success: false, error: "Nominal tidak valid." });
      const { rows } = await pool.query(
        `UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, balance`,
        [amount, req.params.id]
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

  app.post("/api/packages", async (req, res) => {
    try {
      const { name, speed, quota, duration, price, badge_color } = req.body;
      if (!name || !speed || !quota || !duration || !price) {
        return res.status(400).json({ success: false, error: "Semua field paket wajib diisi." });
      }
      const { rows } = await pool.query(
        `INSERT INTO packages (name, speed, quota, duration, price, badge_color) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [name, speed, quota, duration, price, badge_color || 'blue']
      );
      res.json({ success: true, data: { ...rows[0], price: parseFloat(rows[0].price) } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.patch("/api/packages/:id", async (req, res) => {
    try {
      const { name, speed, quota, duration, price, badge_color } = req.body;
      const { rows } = await pool.query(
        `UPDATE packages SET name=$1, speed=$2, quota=$3, duration=$4, price=$5, badge_color=$6 WHERE id=$7 RETURNING *`,
        [name, speed, quota, duration, price, badge_color, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Paket tidak ditemukan." });
      res.json({ success: true, data: { ...rows[0], price: parseFloat(rows[0].price) } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/packages/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM packages WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── ROUTERS ─────────────────────────────────────────────────────────────
  app.get("/api/routers", async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM routers ORDER BY id`);
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/routers", async (req, res) => {
    try {
      const { name, ip_address, api_port, username, password } = req.body;
      if (!name || !ip_address) return res.status(400).json({ success: false, error: "Nama dan IP wajib diisi." });
      const { rows } = await pool.query(
        `INSERT INTO routers (name, ip_address, api_port, username, password, status, connected_users) VALUES ($1,$2,$3,$4,$5,'offline',0) RETURNING *`,
        [name, ip_address, api_port || '8728', username || 'admin', password || '']
      );
      res.json({ success: true, data: rows[0] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/routers/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM routers WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/routers/:id/sync", async (req, res) => {
    try {
      const newCount = Math.floor(Math.random() * 20) + 5;
      const { rows } = await pool.query(
        `UPDATE routers SET connected_users = connected_users + $1 WHERE id = $2 RETURNING *`,
        [newCount, req.params.id]
      );
      res.json({ success: true, data: rows[0] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── TRANSACTIONS ────────────────────────────────────────────────────────
  app.get("/api/transactions", async (req, res) => {
    try {
      const userId = req.query.user_id;
      let query = `
        SELECT t.*, u.name as user_name, p.name as package_name
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN packages p ON t.package_id = p.id
      `;
      const params: any[] = [];
      if (userId) {
        query += ` WHERE t.user_id = $1`;
        params.push(userId);
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

  app.post("/api/transactions", async (req, res) => {
    try {
      const { user_id, package_id, payment_method, pin } = req.body;
      if (!user_id || !package_id || !payment_method) {
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

      if (payment_method === 'saldo') {
        // Validate PIN
        if (user.pin && user.pin !== pin) {
          return res.status(401).json({ success: false, error: "Otorisasi Gagal: PIN salah." });
        }
        // Check balance
        const balance = parseFloat(user.balance);
        if (balance < amount) {
          return res.status(400).json({ success: false, error: "Saldo tidak mencukupi." });
        }
        // Deduct balance
        await pool.query(`UPDATE users SET balance = balance - $1, updated_at = NOW() WHERE id = $2`, [amount, user_id]);
      }

      // Generate voucher code
      const voucherCode = `WFI-${Math.random().toString(36).substring(2,8).toUpperCase()}`;

      // Create transaction
      const { rows: txRows } = await pool.query(
        `INSERT INTO transactions (user_id, package_id, voucher_code, amount, payment_method, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [user_id, package_id, voucherCode, amount, payment_method, payment_method === 'saldo' ? 'success' : 'pending']
      );

      const tx = txRows[0];

      // Get updated user balance
      const { rows: updatedUser } = await pool.query(`SELECT balance FROM users WHERE id = $1`, [user_id]);

      res.json({
        success: true,
        data: {
          transaction: { ...tx, amount: parseFloat(tx.amount) },
          voucher_code: voucherCode,
          new_balance: parseFloat(updatedUser[0].balance)
        }
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM transactions WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── SETTINGS ────────────────────────────────────────────────────────────
  app.get("/api/settings", async (req, res) => {
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

  app.post("/api/settings", async (req, res) => {
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
      const { reference_id, status, user_id, package_id } = req.body;
      console.log(`[Webhook] Pembayaran ${reference_id}: ${status}`);
      if ((status === "Success" || status === "PAID") && user_id && package_id) {
        const voucherCode = `WFI-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
        await pool.query(
          `INSERT INTO transactions (user_id, package_id, voucher_code, amount, payment_method, status) 
           SELECT $1, $2, $3, price, 'qris', 'success' FROM packages WHERE id = $2`,
          [user_id, package_id, voucherCode]
        );
      }
      res.status(200).json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).send("Webhook Error");
    }
  });

  // ─── MIKROTIK PROFILES ───────────────────────────────────────────────────
  app.get("/api/routers/:id/profiles", async (req, res) => {
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
          getProfiles({ host: router.ip_address, user: router.username, pass: router.password }),
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

  // ─── MIKROTIK VOUCHER ─────────────────────────────────────────────────────
  app.post("/api/router/create-voucher", async (req, res) => {
    try {
      const { host, user, pass, profile, name, password } = req.body;
      const result = await createVoucher({ host, user, pass }, profile, name, password);
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
