CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE,
  wechat_openid TEXT UNIQUE,
  points INTEGER DEFAULT 0,
  trust_score REAL DEFAULT 0.5,
  tier TEXT DEFAULT 'newbie',
  car_model_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  charger_count_dc INTEGER DEFAULT 0,
  charger_count_ac INTEGER DEFAULT 0,
  status TEXT DEFAULT 'unknown',
  reliability_score REAL DEFAULT 0.5,
  parking_note TEXT,
  access_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS charger_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  power_kw INTEGER NOT NULL,
  connector_type TEXT,
  status TEXT DEFAULT 'unknown',
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  elec_fee_peak REAL NOT NULL,
  elec_fee_flat REAL NOT NULL,
  elec_fee_valley REAL NOT NULL,
  service_fee REAL NOT NULL,
  total_peak REAL,
  total_flat REAL,
  total_valley REAL,
  source TEXT NOT NULL,
  contributed_by UUID,
  verified_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  trust_weight REAL DEFAULT 1.0,
  verified INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL,
  body TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);