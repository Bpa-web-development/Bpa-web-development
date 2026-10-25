-- Marlowby database schema (PostgreSQL). Safe to run more than once.
-- Apply with: npm run db:migrate

CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    zip           TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    user_agent  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS orders (
    id            BIGSERIAL PRIMARY KEY,
    order_number  TEXT NOT NULL UNIQUE,
    user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL,
    zip           TEXT NOT NULL,
    gift_note     TEXT NOT NULL DEFAULT '',
    promo_code    TEXT NOT NULL DEFAULT '',
    subtotal      NUMERIC(10, 2) NOT NULL,
    discount      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total         NUMERIC(10, 2) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);

CREATE TABLE IF NOT EXISTS order_lines (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    plan        TEXT NOT NULL,
    term        TEXT NOT NULL,
    qty         INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 5),
    unit_price  NUMERIC(10, 2) NOT NULL,
    due         NUMERIC(10, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS order_lines_order_idx ON order_lines(order_id);

CREATE TABLE IF NOT EXISTS tickets (
    id          BIGSERIAL PRIMARY KEY,
    ticket_code TEXT NOT NULL UNIQUE,
    user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    order_ref   TEXT NOT NULL DEFAULT '',
    topic       TEXT NOT NULL,
    message     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'received',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id                BIGSERIAL PRIMARY KEY,
    email             TEXT NOT NULL UNIQUE,
    topics            TEXT[] NOT NULL DEFAULT '{}',
    unsubscribe_token TEXT NOT NULL UNIQUE,
    subscribed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    unsubscribed_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS rate_limits (
    key       TEXT PRIMARY KEY,
    count     INTEGER NOT NULL,
    reset_at  TIMESTAMPTZ NOT NULL
);
