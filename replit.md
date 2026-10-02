# AdilaNet on Replit

## Run
- Use the Run button / `Start application` workflow, which runs `npm run dev`.
- Express serves the API and Vite frontend together on `0.0.0.0:5000`.
- Keep the existing React, Vite, Express, and PostgreSQL structure.
- The separate `artifacts/mockup-sandbox` is not part of the AdilaNet app or its TypeScript check.

## Configuration
- `DATABASE_URL` uses the workspace's PostgreSQL connection.
- `SESSION_SECRET` is required and must remain in Replit Secrets.
- The existing server initializes its database tables and seed accounts at startup.
- The README lists initial login accounts. Change their default passwords before making the app publicly available.
- Configure a reachable MikroTik router through the admin interface for real voucher provisioning. A private LAN router needs network access from this cloud environment.
- Configure Sanpay credentials through admin Settings for live QRIS payments; do not add invented credentials or replace payments with simulated results.

## Checks
- `npm run lint`: TypeScript check for AdilaNet.
- `npm run build`: builds the frontend and `dist/server.cjs`.
- `/api/health`: reports database connectivity.
- For a production build, run `NODE_ENV=production npm start`; this serves the built frontend rather than Vite middleware.