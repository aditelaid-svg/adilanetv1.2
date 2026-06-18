---
name: Top-up history & in-app notifications
description: How admin top-up history and user in-app notifications are wired, and the financial-consistency rules around them.
---

# Top-up history & in-app notifications

Two DB tables back this: `topups` (user_id, admin_id, amount, created_at) and `notifications` (user_id, title, body, type in info|topup|purchase, read, created_at). Both auto-create on boot in server.ts schema block.

Endpoints: GET /api/topups (requireAdmin, joins user_name/admin_name), GET /api/notifications (requireAuth, own only, LIMIT 50), POST /api/notifications/:id/read and /read-all (both scoped by user_id — no IDOR). Frontend: AdminTopups page (/admin/topups), UserNotifications page (/user/notifications), bell+unread badge in UserLayout, 30s polling in AppContext.

## Financial-consistency rules (do not regress)
- **Top-up must be atomic.** Balance update + topups insert + notification insert run in one BEGIN/COMMIT/ROLLBACK on a dedicated client in POST /api/users/:id/topup.
  **Why:** if the history/notification insert fails after balance already changed, the endpoint 500s and the admin retries → double-credit, and saldo desyncs from history.
- **Purchase/transaction notifications are best-effort.** In POST /api/transactions the 'purchase' notification insert is wrapped in its own try/catch that only logs on failure.
  **Why:** the voucher is already minted on MikroTik and the balance already deducted; a notification failure must never 500 the request or the buyer retries and gets charged twice.
- **How to apply:** any new side-effect on a financial endpoint is either inside the same DB transaction as the money movement, or made best-effort after the money is committed. Never leave it as a bare `await pool.query` in the critical path between money movement and the success response.
