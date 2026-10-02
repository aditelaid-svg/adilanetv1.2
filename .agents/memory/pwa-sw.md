---
name: PWA development cache freshness
description: Avoid stale Vite modules hiding shipped changes in persistent browser and installed PWA sessions.
---

Never cache Vite development source, transformed dependencies, or HMR endpoints in the service worker. Keep production hashed-asset caching and offline navigation support separate from development modules.

**Why:** A persistent browser displayed the removed payment-provider settings from cached JavaScript even though the running server returned the updated source and API. Reload alone can still read stale modules from an existing service worker.

**How to apply:** When changing caching rules, invalidate existing caches as well. If a browser shows old UI while a direct module fetch shows new code, inspect service-worker cache behavior before repeating implementation changes. Verify the existing browser updates, not just a service-worker-blocked test context.