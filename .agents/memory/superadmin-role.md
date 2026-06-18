---
name: Superadmin role
description: Rules and invariants for the protected superadmin role in the voucher app
---

# Superadmin role

A protected `superadmin` role exists alongside `admin` and `user`.

**Invariants (must always hold):**
- At least one superadmin always exists. Boot migration promotes the oldest admin to superadmin if none exists, then falls back to promoting the oldest user if there are no admins at all. Fresh-install seed creates a superadmin directly.
- A superadmin account can only be modified (any field) or deleted by that same superadmin — never by another admin. This blocks credential-reset takeover.
- Only a superadmin may grant `admin`/`superadmin` roles (no privilege escalation by regular admins). Role values are allowlisted to `user|admin|superadmin`.
- The last remaining superadmin cannot be demoted.
- Superadmin balance cannot be changed by other admins (topup endpoint enforces this too).

**Why:** Guarantees a guaranteed, un-lockoutable admin for fresh installs/testing, and closes admin-takeover paths.

**How to apply:** Use `isAdminRole(role)` (admin OR superadmin) for ALL admin-scope checks — never bare `role === 'admin'`. Any new user-mutating endpoint must re-check the target's role and apply the same superadmin protections. Frontend gates admin area with `role !== 'user'`.
