/** Additive, idempotent bootstrap also works in self-hosted production images. */
export async function ensurePpobSchema(db: { query(sql: string): Promise<unknown> }) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ppob_config (
      id integer PRIMARY KEY CHECK (id=1), enabled boolean NOT NULL DEFAULT false,
      mode text NOT NULL DEFAULT 'test' CHECK(mode IN ('test','live')),
      default_markup bigint NOT NULL DEFAULT 1500 CHECK(default_markup BETWEEN 0 AND 1000000),
      max_order bigint NOT NULL DEFAULT 500000 CHECK(max_order BETWEEN 1000 AND 5000000),
      daily_limit bigint NOT NULL DEFAULT 1000000 CHECK(daily_limit BETWEEN 1000 AND 20000000),
      last_sync_at timestamptz, last_sync_attempt_at timestamptz,
      provider_balance numeric(18,2), connection_checked_at timestamptz, last_connection_attempt_at timestamptz,
      connection_account_hash text, catalog_account_hash text,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO ppob_config(id) VALUES(1) ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS ppob_products (
      sku text PRIMARY KEY, name text NOT NULL, category text NOT NULL, brand text NOT NULL,
      description text NOT NULL DEFAULT '', cost_price bigint NOT NULL CHECK(cost_price>0),
      enabled boolean NOT NULL DEFAULT false, provider_active boolean NOT NULL DEFAULT false,
      unlimited_stock boolean NOT NULL DEFAULT false, stock integer NOT NULL DEFAULT 0,
      multi boolean NOT NULL DEFAULT false, cut_off_start text NOT NULL DEFAULT '00:00',
      cut_off_end text NOT NULL DEFAULT '00:00',
      fixed_price bigint CHECK(fixed_price BETWEEN 1 AND 5000000),
      markup bigint CHECK(markup BETWEEN 0 AND 1000000), synced_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS ppob_quotes (
      id uuid PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sku text NOT NULL REFERENCES ppob_products(sku) ON DELETE RESTRICT,
      product_name text NOT NULL, category text NOT NULL, customer_no text NOT NULL,
      cost_price bigint NOT NULL, sell_price bigint NOT NULL,
      expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS ppob_orders (
      id uuid PRIMARY KEY, reference text UNIQUE NOT NULL,
      quote_id uuid UNIQUE NOT NULL REFERENCES ppob_quotes(id) ON DELETE RESTRICT,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      sku text NOT NULL, product_name text NOT NULL, category text NOT NULL, customer_no text NOT NULL,
      cost_price bigint NOT NULL CHECK(cost_price>0), amount bigint NOT NULL CHECK(amount>=cost_price),
      idempotency_key uuid NOT NULL, account_hash text NOT NULL,
      status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed','review')),
      message text NOT NULL DEFAULT 'Pesanan tersimpan. Menunggu konfirmasi Digiflazz.',
      serial text, provider_price bigint, response_code text,
      refunded_at timestamptz, attempts integer NOT NULL DEFAULT 0,
      next_check_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id,idempotency_key)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS ppob_one_pending_target
      ON ppob_orders(sku,customer_no) WHERE status IN ('pending','review');
    CREATE INDEX IF NOT EXISTS ppob_orders_due ON ppob_orders(next_check_at)
      WHERE status IN ('pending','review');
    CREATE INDEX IF NOT EXISTS ppob_orders_user ON ppob_orders(user_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS ppob_wallet_entries (
      id bigserial PRIMARY KEY, order_id uuid NOT NULL REFERENCES ppob_orders(id) ON DELETE RESTRICT,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      kind text NOT NULL CHECK(kind IN ('debit','refund')), amount bigint NOT NULL CHECK(amount>0),
      balance_after numeric(18,2) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(order_id,kind)
    );
    CREATE TABLE IF NOT EXISTS ppob_pin_guard (
      user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      failures integer NOT NULL DEFAULT 0, window_started_at timestamptz NOT NULL DEFAULT now(),
      locked_until timestamptz
    );
    CREATE TABLE IF NOT EXISTS ppob_audit (
      id bigserial PRIMARY KEY, actor_id integer REFERENCES users(id) ON DELETE SET NULL,
      action text NOT NULL, entity_id text, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ppob_audit_created ON ppob_audit(created_at DESC);
  `);
}