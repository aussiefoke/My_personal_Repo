import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

/**
 * MVP 阶段：模拟爬虫（实际接入时替换为真实 Playwright 解析）
 * 每个 parser 返回该运营商的标准化价格结构
 */
export async function syncPrices() {
  const stations = await db.select().from(schema.stations);

  for (const station of stations) {
    try {
      const price = await fetchPriceForOperator(station.operatorId);
      if (!price) continue;

      await db.insert(schema.priceSnapshots).values({
        stationId:     station.id,
        elecFeePeak:   price.elecFeePeak,
        elecFeeFlat:   price.elecFeeFlat,
        elecFeeValley: price.elecFeeValley,
        serviceFee:    price.serviceFee,
        totalPeak:     price.elecFeePeak + price.serviceFee,
        totalFlat:     price.elecFeeFlat + price.serviceFee,
        totalValley:   price.elecFeeValley + price.serviceFee,
        source:        'scraper',
        expiresAt:     new Date(Date.now() + 24 * 3600_000),
      });
    } catch (err) {
      console.error(`同步失败 [${station.name}]:`, err);
    }
  }
}

interface PriceData {
  elecFeePeak:   number;
  elecFeeFlat:   number;
  elecFeeValley: number;
  serviceFee:    number;
}

/**
 * 根据运营商 ID 调用对应解析器
 * TODO: 替换为真实 Playwright 爬虫
 */
async function fetchPriceForOperator(operatorId: string): Promise<PriceData | null> {
  // 开发阶段返回模拟数据
  const mockPrices: Record<string, PriceData> = {
    teld: {
      elecFeePeak:   0.92,
      elecFeeFlat:   0.68,
      elecFeeValley: 0.38,
      serviceFee:    0.35,
    },
    star_charge: {
      elecFeePeak:   0.88,
      elecFeeFlat:   0.65,
      elecFeeValley: 0.36,
      serviceFee:    0.40,
    },
    state_grid: {
      elecFeePeak:   0.85,
      elecFeeFlat:   0.62,
      elecFeeValley: 0.34,
      serviceFee:    0.30,
    },
  };

  return mockPrices[operatorId] ?? null;

  // ---- 真实爬虫示例（接入时取消注释）----
  // if (operatorId === 'teld') {
  //   const { parse } = await import('../parsers/teld');
  //   return parse();
  // }
}
