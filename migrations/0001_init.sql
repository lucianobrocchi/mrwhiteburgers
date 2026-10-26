-- Base de datos única para todos los clientes (Cloudflare D1, base "negocios").
-- Todo lleva site_id: cada sitio fija el suyo en el servidor y nunca ve datos de otro.

-- Archivos chicos con versión: config del panel, eventos. La versión evita que dos
-- personas editando a la vez se pisen.
CREATE TABLE IF NOT EXISTS kv (
  site_id    TEXT NOT NULL,
  path       TEXT NOT NULL,
  json       TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (site_id, path)
);

-- Un renglón por pedido.
CREATE TABLE IF NOT EXISTS orders (
  id       TEXT PRIMARY KEY,          -- AAAAMMDD-xxxxxx
  site_id  TEXT NOT NULL,
  at       TEXT NOT NULL,             -- ISO, UTC
  d        TEXT NOT NULL,             -- día en hora de Argentina (AAAA-MM-DD)
  h        INTEGER NOT NULL,          -- hora en hora de Argentina
  w        INTEGER NOT NULL,          -- día de la semana (0 = domingo)
  total    INTEGER NOT NULL,
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  promo    TEXT NOT NULL DEFAULT '',
  zone_id  TEXT NOT NULL DEFAULT '',
  zone     TEXT NOT NULL DEFAULT '',
  src      TEXT NOT NULL DEFAULT 'directo',
  items    TEXT NOT NULL              -- JSON con lo que se pidió
);
CREATE INDEX IF NOT EXISTS orders_site_dia ON orders (site_id, d);
CREATE INDEX IF NOT EXISTS orders_site_at ON orders (site_id, at);
