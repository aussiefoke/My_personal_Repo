import {
  pgTable,
  uuid,
  text,
  real,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { stations } from './stations';

export const priceSnapshots = pgTable(
  'price_snapshots',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    stationId:     uuid('station_id')
      .notNull()
      .references(() => stations.id, { onDelete: 'cascade' }),
    // 分时电费 (元/kWh)
    elecFeePeak:   real('elec_fee_peak').notNull(),   // 峰时
    elecFeeFlat:   real('elec_fee_flat').notNull(),   // 平时
    elecFeeValley: real('elec_fee_valley').notNull(), // 谷时
    serviceFee:    real('service_fee').notNull(),      // 服务费
    // 预计算总价 = 电费 + 服务费
    totalPeak:     real('total_peak'),
    totalFlat:     real('total_flat'),
    totalValley:   real('total_valley'),
    source:        text('source').notNull(), // user | scraper | operator_api
    contributedBy: uuid('contributed_by'),   // 用户贡献时有值，爬虫为 null
    verifiedAt:    timestamp('verified_at'),
    expiresAt:     timestamp('expires_at'),  // 用户贡献 48h，爬虫 24h
    createdAt:     timestamp('created_at').defaultNow(),
  },
  (t) => ({
    stationCreatedIdx: index('price_station_created_idx').on(
      t.stationId,
      t.createdAt
    ),
  })
);
