---
name: Development workflow port leftovers
description: Local Replit workflow restarts can leave an older app process bound to development ports.
---

When the application workflow fails with `EADDRINUSE` on port 5000 or the Vite WebSocket port 24678, inspect listeners and the process tree before restarting again. A previous `npm run dev` process may still be serving the old app while the new workflow fails.

**Why:** Repeated restarts reproduce the bind error and can leave the preview serving stale code.

**How to apply:** Confirm the PID belongs to the workspace app workflow, stop only that process group, then restart once and verify the expected port and local health endpoint. Do not infer anything about the production VPS from the development process.
