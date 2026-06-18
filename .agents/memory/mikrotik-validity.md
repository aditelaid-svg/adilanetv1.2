---
name: Mikrotik fixed-validity (masa aktif)
description: How "masa aktif tetap" voucher expiry (expire N wall-clock time after first login) is enforced on RouterOS, and why this mechanism was chosen.
---

# Fixed-validity ("masa aktif tetap") expiry

Vouchers must expire a fixed wall-clock time after their FIRST login, regardless of
usage/reconnects. (The old bug: duration was `session-timeout`, which is per-session
and resets on reconnect, so total time exceeded the configured value.)

## Mechanism (in `src/server/mikrotik.ts`)
- Profile carries a `validity` (raw RouterOS duration like `10h`/`30m`/`7d`, built in
  the UI from a number + unit). When set, `profileParams` injects an `on-login` arming
  script and clears `session-timeout=0s`.
- on-login arming script: on the FIRST login only (guard: user `comment` is empty),
  stamp the remaining minutes into the user's `comment` (e.g. `comment=600`).
- A SINGLE global scheduler `an-voucher-reaper` (installed idempotently via
  `ensureReaper` whenever a validity profile is saved) runs every 60s, decrements the
  numeric comment of every armed user, and removes the user when it reaches 0/1.
- Read-back: `parseOnLoginValidity` recovers the duration from `comment=<minutes>` in
  the stored on-login; `getProfiles` exposes `validity` (human) + `validityRaw`.

**Why this design (not a per-user one-shot scheduler):** A scheduler created with
`start-time=now` + `interval=N` can fire IMMEDIATELY on creation in RouterOS, which
would delete the voucher the instant it's first used. Computing an absolute future
start-time needs RouterOS date math that is fragile across ROS v6/v7 (date-format and
month/leap rollover). The minute-countdown + global reaper avoids both: no date math,
no per-user schedulers, and a stray immediate tick only costs ~1 minute. Accuracy is
±1 minute, which is acceptable.

**How to apply:** Keep `comment` reserved as the countdown/armed flag for hotspot
users — do not set a numeric comment elsewhere or the reaper will count it down.
`createVoucher` intentionally sets no comment (fresh vouchers stay unarmed until first
login). The reaper filters `find where comment~"^[0-9]+\$"` (note: `\$` in ROS source
is the regex end-anchor `$`).

**Untestable here:** there is no real MikroTik in the dev env (getProfiles has a demo
fallback; writes hit the real router). The RouterOS scripts must be verified on the
user's actual router.
