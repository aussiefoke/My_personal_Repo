import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  phone:        text('phone').unique(),
  wechatOpenid: text('wechat_openid').unique(),
  points:       integer('points').default(0),
  // 信任分：新用户 0.5，普通 1.0，资深 1.5
  trustScore:   real('trust_score').default(0.5),
  // newbie | regular | expert | guardian
  tier:         text('tier').default('newbie'),
  carModelId:   text('car_model_id'), // 对应 constants/carModels.ts 里的 id
  createdAt:    timestamp('created_at').defaultNow(),
});

export const pointTransactions = pgTable('point_transactions', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id')
    .notNull()
    .references(() => users.id),
  amount:      integer('amount').notNull(),
  // price_update | queue_report | fault_report | access_tip | review | new_station
  actionType:  text('action_type').notNull(),
  referenceId: uuid('reference_id'), // 对应贡献或评价的 id
  createdAt:   timestamp('created_at').defaultNow(),
});
