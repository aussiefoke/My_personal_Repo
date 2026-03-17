import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env') });
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  console.log('🌱 开始写入种子数据...');

  // 插入示例充电站（深圳）
  await db.insert(schema.stations).values([
    {
      name: '特来电·深圳北站充电站',
      operatorId: 'teld',
      address: '广东省深圳市龙华区民治街道深圳北站停车场B区',
      city: 'shenzhen',
      lat: 22.6085,
      lng: 114.0318,
      chargerCountDc: 12,
      chargerCountAc: 4,
      status: 'active',
      reliabilityScore: 0.82,
      parkingNote: '充电免停车费2小时',
      accessNote: '从B出口进入，沿指示牌走约200米',
    },
    {
      name: '星星充电·南山科技园',
      operatorId: 'star_charge',
      address: '广东省深圳市南山区科技园南区停车场',
      city: 'shenzhen',
      lat: 22.5411,
      lng: 113.9442,
      chargerCountDc: 8,
      chargerCountAc: 6,
      status: 'active',
      reliabilityScore: 0.75,
      parkingNote: '停车费5元/小时，充电期间不另收费',
      accessNote: '入口在科苑路，地下一层',
    },
    {
      name: '国家电网·福田中心区',
      operatorId: 'state_grid',
      address: '广东省深圳市福田区益田路荔枝公园停车场',
      city: 'shenzhen',
      lat: 22.5396,
      lng: 114.0577,
      chargerCountDc: 6,
      chargerCountAc: 10,
      status: 'active',
      reliabilityScore: 0.9,
      parkingNote: '首2小时免费，之后3元/小时',
      accessNote: '荔枝公园西门进入，地下停车场内',
    },
  ]).onConflictDoNothing();

  // 插入价格快照
  const allStations = await db.select().from(schema.stations);
  for (const s of allStations) {
    await db.insert(schema.priceSnapshots).values({
      stationId: s.id,
      elecFeePeak:   0.92,
      elecFeeFlat:   0.68,
      elecFeeValley: 0.38,
      serviceFee:    0.35,
      totalPeak:     1.27,
      totalFlat:     1.03,
      totalValley:   0.73,
      source: 'seed',
      expiresAt: new Date(Date.now() + 48 * 3600_000),
    }).onConflictDoNothing();
  }

  console.log(`✅ 写入 ${allStations.length} 个充电站 + 价格快照`);
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
