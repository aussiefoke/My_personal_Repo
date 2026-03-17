import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../../shared/db/client';
import { eq, sql } from 'drizzle-orm';
import { getCurrentPricePeriod } from '../../shared/utils/helpers';

const estimateSchema = z.object({
  batteryKwh:  z.number().positive(),   // 电池总容量 kWh
  currentPct:  z.number().min(0).max(100),
  targetPct:   z.number().min(0).max(100),
  stationIds:  z.array(z.string().uuid()).min(1).max(10),
});

export async function calculatorRoutes(app: FastifyInstance) {
  // POST /api/v1/calculator/estimate
  app.post('/estimate', async (request, reply) => {
    const parsed = estimateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: '参数错误', details: parsed.error.flatten() });
    }

    const { batteryKwh, currentPct, targetPct, stationIds } = parsed.data;

    if (targetPct <= currentPct) {
      return reply.code(400).send({ error: '目标电量必须高于当前电量' });
    }

    const kwhNeeded = batteryKwh * (targetPct - currentPct) / 100;
    const period = getCurrentPricePeriod();

    const results = await Promise.all(
      stationIds.map(async (stationId) => {
        const [station] = await db
          .select()
          .from(schema.stations)
          .where(eq(schema.stations.id, stationId));

        const [price] = await db
          .select()
          .from(schema.priceSnapshots)
          .where(eq(schema.priceSnapshots.stationId, stationId))
          .orderBy(sql`${schema.priceSnapshots.createdAt} DESC`)
          .limit(1);

        if (!station || !price) return null;

        const pricePerKwh = (() => {
          if (period === 'peak')   return price.totalPeak   ?? price.totalFlat ?? 1;
          if (period === 'valley') return price.totalValley ?? price.totalFlat ?? 1;
          return price.totalFlat ?? 1;
        })();

        const estimatedCost   = kwhNeeded * pricePerKwh;
        // 估算充电时间：假设用最大功率的 80%（实际充电效率）
        const maxPowerKw = station.chargerCountDc && station.chargerCountDc > 0 ? 60 : 7;
        const estimatedHours  = kwhNeeded / (maxPowerKw * 0.8);
        const estimatedMinutes = Math.ceil(estimatedHours * 60);

        return {
          stationId,
          stationName:      station.name,
          kwhNeeded:        Math.round(kwhNeeded * 10) / 10,
          pricePerKwh:      Math.round(pricePerKwh * 100) / 100,
          estimatedCost:    Math.round(estimatedCost * 100) / 100,
          estimatedMinutes,
          pricePeriod:      period,
        };
      })
    );

    return { estimates: results.filter(Boolean) };
  });
}
