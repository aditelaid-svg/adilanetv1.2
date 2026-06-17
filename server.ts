import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";

// Mock mariadb pool instantiation that can be expanded later
// import mariadb from "mariadb";
// const pool = mariadb.createPool({ ... process.env ... });

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Healthcheck endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", db_connected: false, message: "Running in mock API mode for preview." });
  });

  // Example API stub
  app.get("/api/users", (req, res) => {
     res.json([{id: 1, name: "Admin Web", email: "admin@wifivoucher.com"}]);
  });

  // In-memory mock for Settings (in production this goes to MariaDB `settings` table)
  let appSettings = {
    sanpayApiKey: process.env.SANPAY_API_KEY || "",
    merchantId: process.env.SANPAY_MERCHANT_ID || "",
    telegramToken: "",
    qrisEnabled: true
  };

  app.get("/api/settings", (req, res) => {
    res.json({ success: true, data: appSettings });
  });

  // Public config endpoint for frontend to check if QRIS is enabled
  app.get("/api/config/public", (req, res) => {
    res.json({ success: true, data: { qrisEnabled: appSettings.qrisEnabled } });
  });

  app.post("/api/settings", express.json(), (req, res) => {
     // Di MariaDB, ini akan UPDATE ke tabel settings
     const { sanpayApiKey, merchantId, telegramToken, qrisEnabled } = req.body;
     appSettings = { ...appSettings, sanpayApiKey, merchantId, telegramToken, qrisEnabled: qrisEnabled ?? appSettings.qrisEnabled };
     res.json({ success: true, message: "Pengaturan berhasil disimpan" });
  });

  // --- START SANPAY INTEGRATION (GENERIC) ---
  app.post("/api/payment/create-qris", async (req, res) => {
    try {
      if (!appSettings.qrisEnabled) {
          return res.status(403).json({ success: false, error: "Pembayaran via QRIS sedang Maintenance/Dinonaktifkan." });
      }

      const { amount, packageId, phone } = req.body;
      
      // Ambil API Key dari setting DB (atau environment)
      const SANPAY_API_KEY = appSettings.sanpayApiKey || process.env.SANPAY_API_KEY;
      const refId = `WFI-TX-${Date.now()}`;
      
      if (!SANPAY_API_KEY) {
        // Mock Response for Development without API Key
        return res.json({
          success: true,
          data: {
            reference_id: refId,
            qr_string: "QRIS_MOCK_DATA_1234567890",
            qr_url: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=QRIS_DEMO_WIFI",
            amount: amount,
            status: "pending"
          },
          message: "Created mock QRIS transaction (no API key provided)"
        });
      }

      // Normally here you would use fetch to call Sanpay API:
      // const response = await fetch("https://sanpay.site/api/v1/qris/create", {
      //   method: "POST",
      //   headers: { "Authorization": `Bearer ${SANPAY_API_KEY}`, "Content-Type": "application/json" },
      //   body: JSON.stringify({ amount, reference_id: refId, ... })
      // });
      // const result = await response.json();

      // Placeholder for actual integration
      res.json({
          success: true,
          message: "Transaction initiated",
          data: {
            reference_id: refId,
            qr_url: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=QRIS_DEMO_WIFI",
            status: "pending"
          }
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Webhook Endpoint to receive payment notification
  app.post("/api/webhook/sanpay", express.json(), (req, res) => {
    try {
      const { reference_id, status } = req.body;
      // 1. Verify webhook signature (using secret)
      // 2. If status is Paid/Success:
      // 3. Mark transaction as success in database
      // 4. Generate Wi-Fi Voucher (Mikrotik API)
      console.log(`[Webhook] Payment Update for ${reference_id}: ${status}`);

      // Respond 200 OK so Sanpay stops retrying
      res.status(200).json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).send("Webhook Error");
    }
  });
  // --- END SANPAY INTEGRATION ---

  if (process.env.NODE_ENV !== "production") {
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
