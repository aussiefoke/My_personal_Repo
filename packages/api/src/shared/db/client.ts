import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgTable, uuid, text, real, integer, timestamp, index } from 'drizzle-orm/pg-core';

// ---- Schema 内联定义 ----
export const stations = pgTable('stations', {
  id:               uuid('id').primaryKey().defaultRandom(),
  name:             text('name').notNull(),
  operatorId:       text('operator_id').notNull(),
  address:          text('address').notNull(),
  city:             text('city').notNull(),
  lat:              real('lat').notNull(),
  lng:              real('lng').notNull(),
  chargerCountDc:   integer('charger_count_dc').default(0),
  chargerCountAc:   integer('charger_count_ac').default(0),
  status:           text('status').default('unknown'),
  reliabilityScore: real('reliability_score').default(0.5),
  parkingNote:      text('parking_note'),
  accessNote:       text('access_note'),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
});

export const chargerUnits = pgTable('charger_units', {
  id:            uuid('id').primaryKey().defaultRandom(),
  stationId:     uuid('station_id').notNull().references(() => stations.id, { onDelete: 'cascade' }),
  type:          text('type').notNull(),
  powerKw:       integer('power_kw').notNull(),
  connectorType: text('connector_type'),
  status:        text('status').default('unknown'),
  lastUpdated:   timestamp('last_updated').defaultNow(),
});

export const priceSnapshots = pgTable('price_snapshots', {
  id:            uuid('id').primaryKey().defaultRandom(),
  stationId:     uuid('station_id').notNull().references(() => stations.id, { onDelete: 'cascade' }),
  elecFeePeak:   real('elec_fee_peak').notNull(),
  elecFeeFlat:   real('elec_fee_flat').notNull(),
  elecFeeValley: real('elec_fee_valley').notNull(),
  serviceFee:    real('service_fee').notNull(),
  totalPeak:     real('total_peak'),
  totalFlat:     real('total_flat'),
  totalValley:   real('total_valley'),
  source:        text('source').notNull(),
  contributedBy: uuid('contributed_by'),
  verifiedAt:    timestamp('verified_at'),
  expiresAt:     timestamp('expires_at'),
  createdAt:     timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  phone:        text('phone').unique(),
  wechatOpenid: text('wechat_openid').unique(),
  points:       integer('points').default(0),
  trustScore:   real('trust_score').default(0.5),
  tier:         text('tier').default('newbie'),
  carModelId:   text('car_model_id'),
  createdAt:    timestamp('created_at').defaultNow(),
});

export const pointTransactions = pgTable('point_transactions', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull().references(() => users.id),
  amount:      integer('amount').notNull(),
  actionType:  text('action_type').notNull(),
  referenceId: uuid('reference_id'),
  createdAt:   timestamp('created_at').defaultNow(),
});

export const contributions = pgTable('contributions', {
  id:          uuid('id').primaryKey().defaultRandom(),
  stationId:   uuid('station_id').notNull().references(() => stations.id),
  userId:      uuid('user_id').notNull().references(() => users.id),
  type:        text('type').notNull(),
  payload:     text('payload').notNull(),
  trustWeight: real('trust_weight').default(1.0),
  verified:    integer('verified').default(0),
  expiresAt:   timestamp('expires_at'),
  createdAt:   timestamp('created_at').defaultNow(),
});

export const reviews = pgTable('reviews', {
  id:           uuid('id').primaryKey().defaultRandom(),
  stationId:    uuid('station_id').notNull().references(() => stations.id),
  userId:       uuid('user_id').notNull().references(() => users.id),
  rating:       integer('rating').notNull(),
  body:         text('body'),
  helpfulCount: integer('helpful_count').default(0),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ---- DB 连接 ----
const schema = {
  stations, chargerUnits, priceSnapshots,
  users, pointTransactions, contributions, reviews,
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://chargesmart:chargesmart@localhost:5432/chargesmart_dev',
  max: 10,
});

export const db = drizzle(pool, { schema });
export { schema };