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
- Qiospay is the only QRIS provider. Configure it through admin Settings; do not invent credentials or simulate real payment results.

## Checks
- `npm run lint`: TypeScript check for AdilaNet.
- `npm run build`: builds the frontend and `dist/server.cjs`.
- `/api/health`: reports database connectivity.
- For a production build, run `NODE_ENV=production npm start`; this serves the built frontend rather than Vite middleware.

## Qiospay static QRIS
- The user retired SanPay because it is no longer active/used. QRIS only uses Qiospay; do not reintroduce a provider selector or SanPay integration. Historical transactions are retained.
- Regenerate any API key exposed in a chat/screenshot. Enter the fresh key privately in admin Settings with the merchant code and **complete static QR string**. The new key is write-only in the UI; a blank input preserves the saved key.
- Save, then copy the generated callback URL to the Qiospay dashboard's URL Callback QRIS field. Use the callback URL from the app environment you are actually testing/using; copy it again from the published app when moving to production.
- The callback token is private to administrators. Do not post the URL publicly or log its token.
- Use a dedicated QRIS merchant for AdilaNet; unrelated payments with the same nominal cannot reliably identify their purchaser.
- Test/sync uses the documented authenticated GET-mutasi API. A callback only requests a sync: it is never payment proof. Only positive merchant-ledger credits of the exact total, inside the invoice time window, can pay an invoice.
- Checkout shows package price + unique addition of Rp1–999 and the exact payable total. The customer must enter this total in their wallet. The addition is part of the charged total and is not automatically refunded.
- The app's 10-minute deadline does **not** invalidate the static QR at Qiospay. Out-of-window payments and surplus/unmatched payments need manual merchant investigation/refund; they never automatically mint vouchers.
- Exact merchant totals are never reused, even after expiry or successful payment, to prevent old payment instructions paying another order. There are at most 999 nominal choices per base price (fewer if ranges overlap or historical credits occupy them); exhaustion returns an explicit error rather than recycling them.
- Transaction records with Qiospay reservations cannot be deleted. The admin ledger panel shows recent credits and review states; verified payments waiting for the router can be retried from Transactions.
- Reconciliation polls every 30 seconds while recent unresolved invoices exist (48-hour automatic window). Administrators can sync manually after that. Router recovery retains the same voucher candidate and does not require another customer payment.
- Existing saldo payments remain supported independently. QRIS is unavailable to buyers until Qiospay is configured and enabled.
- `npm run test:qiospay` runs deterministic client/service tests with fixture ledger responses and an isolated, temporary PostgreSQL schema. It never contacts live Qiospay or MikroTik.
- Live merchant connectivity and wallet payment behavior must be checked with the newly configured account before public use. Fixture tests do not establish live-provider compatibility.

### Schema setup
- The Qiospay tables were applied to the workspace development database using `src/server/qiospay-schema.sql`.
- For Replit-managed production databases, Publish applies the development schema changes through the supported migration flow; do not add production startup migrations.
- For an external/self-hosted PostgreSQL deployment, apply that SQL file to the intended database **before running this updated app**, using your existing migration process. It adds tables without replacing the database.