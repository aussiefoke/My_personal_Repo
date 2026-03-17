import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const stations = pgTable(
  'stations',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    name:             text('name').notNull(),
    operatorId:       text('operator_id').notNull(), // e.g. 'teld' | 'star_charge' | 'state_grid'
    address:          text('address').notNull(),
    city:             text('city').notNull(),
    lat:              real('lat').notNull(),
    lng:              real('lng').notNull(),
    chargerCountDc:   integer('charger_count_dc').default(0),
    chargerCountAc:   integer('charger_count_ac').default(0),
    status:           text('status').default('unknown'), // active | offline | unknown
    reliabilityScore: real('reliability_score').default(0.5), // 0.0 – 1.0
    parkingNote:      text('parking_note'),
    accessNote:       text('access_note'),
    createdAt:        timestamp('created_at').defaultNow(),
    updatedAt:        timestamp('updated_at').defaultNow(),
  },
  (t) => ({
    cityIdx: index('stations_city_idx').on(t.city),
    latLngIdx: index('stations_lat_lng_idx').on(t.lat, t.lng),
  })
);

export const chargerUnits = pgTable('charger_units', {
  id:            uuid('id').primaryKey().defaultRandom(),
  stationId:     uuid('station_id')
    .notNull()
    .references(() => stations.id, { onDelete: 'cascade' }),
  type:          text('type').notNull(),          // DC_fast | AC_slow | DC_super
  powerKw:       integer('power_kw').notNull(),
  connectorType: text('connector_type'),           // GB/T_DC | GB/T_AC | CCS2
  status:        text('status').default('unknown'), // available | occupied | fault | unknown
  lastUpdated:   timestamp('last_updated').defaultNow(),
});
