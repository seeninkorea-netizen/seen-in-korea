-- SIK Experiences MVP, SQLite / Cloudflare D1
CREATE TABLE IF NOT EXISTS sik_campaigns (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','paused','closed','rejected')),
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  address_ko TEXT NOT NULL,
  business_email TEXT NOT NULL,
  offer_ko TEXT NOT NULL,
  visit_window TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  slots INTEGER NOT NULL DEFAULT 5 CHECK(slots BETWEEN 1 AND 30),
  title_en TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  location_en TEXT NOT NULL DEFAULT '',
  offer_en TEXT NOT NULL DEFAULT '',
  deliverables_en TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sik_campaign_status ON sik_campaigns(status, published_at);

CREATE TABLE IF NOT EXISTS sik_creators (
  id TEXT PRIMARY KEY,
  creator_name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  social_url TEXT NOT NULL,
  followers TEXT NOT NULL,
  area TEXT NOT NULL,
  languages TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sik_creators_email ON sik_creators(email);

CREATE TABLE IF NOT EXISTS sik_campaign_applications (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES sik_campaigns(id) ON DELETE CASCADE,
  creator_name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  social_url TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','selected','rejected','withdrawn')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(campaign_id, email)
);
CREATE INDEX IF NOT EXISTS idx_sik_apps_campaign_status ON sik_campaign_applications(campaign_id, status);
