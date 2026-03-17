import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { stations } from './stations';
import { users } from './users';

export const contributions = pgTable(
  'contributions',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    stationId:   uuid('station_id')
      .notNull()
      .references(() => stations.id),
    userId:      uuid('user_id')
      .notNull()
      .references(() => users.id),
    // price_update | queue | fault | access_tip | new_station
    type:        text('type').notNull(),
    // JSON 字符串，每种 type 有自己的结构 (见 contributions/types.ts)
    payload:     text('payload').notNull(),
    // 提交时继承该用户的 trustScore
    trustWeight: real('trust_weight').default(1.0),
    // 0=待审 | 1=通过 | -1=拒绝
    verified:    integer('verified').default(0),
    expiresAt:   timestamp('expires_at'),
    createdAt:   timestamp('created_at').defaultNow(),
  },
  (t) => ({
    stationTypeIdx: index('contrib_station_type_idx').on(t.stationId, t.type),
    userIdx: index('contrib_user_idx').on(t.userId),
  })
);

export const reviews = pgTable('reviews', {
  id:           uuid('id').primaryKey().defaultRandom(),
  stationId:    uuid('station_id')
    .notNull()
    .references(() => stations.id),
  userId:       uuid('user_id')
    .notNull()
    .references(() => users.id),
  rating:       integer('rating').notNull(), // 1–5
  body:         text('body'),
  helpfulCount: integer('helpful_count').default(0),
  createdAt:    timestamp('created_at').defaultNow(),
});
