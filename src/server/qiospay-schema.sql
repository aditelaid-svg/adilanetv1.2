-- Applied idempotently at application startup, including self-hosted PostgreSQL.
-- Existing transactions, ledger events, and nominal reservations are preserved.
CREATE TABLE IF NOT EXISTS qiospay_events (
  event_key VARCHAR(64) PRIMARY KEY,
  merchant_code VARCHAR(64) NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  paid_at TIMESTAMPTZ NOT NULL,
  provider_ref TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'unmatched',
  reference_id VARCHAR(100),
  error TEXT
);
CREATE TABLE IF NOT EXISTS qiospay_invoices (
  transaction_id INTEGER PRIMARY KEY REFERENCES transactions(id) ON DELETE RESTRICT,
  reference_id VARCHAR(100) UNIQUE NOT NULL,
  merchant_code VARCHAR(64) NOT NULL,
  base_amount INTEGER NOT NULL CHECK (base_amount > 0),
  unique_code INTEGER NOT NULL CHECK (unique_code BETWEEN 1 AND 999),
  total_amount INTEGER NOT NULL CHECK (total_amount = base_amount + unique_code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  router_id INTEGER REFERENCES routers(id) ON DELETE RESTRICT,
  mikrotik_profile VARCHAR(100),
  event_key VARCHAR(64) UNIQUE REFERENCES qiospay_events(event_key),
  voucher_candidate VARCHAR(100) UNIQUE,
  claim_started_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  -- Never recycle nominal reservations, even after expiry/deletion/payment.
  -- A static QR cannot invalidate an old payment instruction.
  UNIQUE (merchant_code, total_amount)
);
-- Add wallet payments without renumbering/removing existing voucher invoices.
ALTER TABLE qiospay_invoices ADD COLUMN IF NOT EXISTS purpose VARCHAR(12) NOT NULL DEFAULT 'voucher'
  CHECK (purpose IN ('voucher','topup'));
ALTER TABLE qiospay_invoices ALTER COLUMN router_id DROP NOT NULL;
ALTER TABLE qiospay_invoices ALTER COLUMN mikrotik_profile DROP NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid='qiospay_invoices'::regclass AND conname='qiospay_invoice_destination'
  ) THEN
    ALTER TABLE qiospay_invoices ADD CONSTRAINT qiospay_invoice_destination
      CHECK (purpose='topup' OR (router_id IS NOT NULL AND mikrotik_profile IS NOT NULL));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS qiospay_events_unmatched ON qiospay_events(merchant_code, status);