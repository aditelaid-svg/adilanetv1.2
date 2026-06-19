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
- on-login arming script: on the FIRST login only (guard: comment does NOT already
  start with a digit), PREPEND the remaining minutes to whatever is in `comment`,
  producing `<minutes> <identifier>` e.g. `600 User#5 Ahmad`. (Identifiers always
  start with a letter — see comment-identifier note below.)
- A SINGLE global scheduler `an-voucher-reaper` runs every 60s: finds users whose
  comment starts with a digit, decrements the LEADING number (up to first space),
  PRESERVES the trailing identifier text, removes the user at 0/1. Installed via
  `ensureReaper` on validity-profile save AND self-healed on every `createVoucher`
  via `ensureValidityEnforcement`: it reads the voucher's profile, and if that
  profile has an `on-login` arming script (i.e. a fixed-validity profile) it calls
  `ensureReaper` (CREATES the scheduler if missing); non-validity profiles only get
  `syncReaperIfPresent`. **Why:** the main "los" (never-expiring) cause was the
  reaper scheduler being absent/deleted on the router — the old code only synced an
  existing reaper and never created one at voucher time. All best-effort: never
  blocks voucher issuance (`/ip/hotspot/user/add` runs first; errors only logged).
- Read-back: `parseOnLoginValidity` regex `/comment=\(?"?(\d+)/` recovers minutes from
  both legacy `comment=600` and current `comment=("600 " . $c)` scripts.

**Why this design (not a per-user one-shot scheduler):** A scheduler created with
`start-time=now` + `interval=N` can fire IMMEDIATELY on creation in RouterOS, which
would delete the voucher the instant it's first used. Computing an absolute future
start-time needs RouterOS date math that is fragile across ROS v6/v7 (date-format and
month/leap rollover). The minute-countdown + global reaper avoids both: no date math,
no per-user schedulers, and a stray immediate tick only costs ~1 minute. Accuracy is
±1 minute, which is acceptable.

**How to apply:** The hotspot `comment` is SHARED between the countdown and a
"dibuat oleh" identifier (`User#<id> <name>` / `Publik <phone>` / `Admin`, built by
`buildVoucherIdentity` + `sanitizeComment`). The countdown keys off a LEADING DIGIT,
so any identifier you ever write to a hotspot comment MUST start with a letter, or the
reaper will treat it as a counter and delete the user. The reaper filter is now
`find where comment~"^[0-9]"` (leading digit; handles both `599` and `599 <id>`).

**Migration gotcha:** `ensureReaper`/`syncReaperIfPresent` UPDATE an existing reaper's
on-event, but RouterOS schedulers are NOT auto-updated just by upgrading the app — the
update only happens when one of those functions runs (profile save, or any voucher
creation via `createVoucher`→`syncReaperIfPresent`). A router whose reaper is never
touched keeps its old script.

**Untestable here:** there is no real MikroTik in the dev env (getProfiles has a demo
fallback; writes hit the real router). The RouterOS scripts must be verified on the
user's actual router.
