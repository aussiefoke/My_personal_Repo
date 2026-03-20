import { eq, and, sql } from 'drizzle-orm';
import { db, schema } from '../../shared/db/client';
import { getNearbyStations } from '../stations/service';
import { getCurrentPricePeriod } from '../../shared/utils/helpers';

type SortBy = 'best' | 'cheapest' | 'nearest' | 'fastest' | 'available';

interface ScoredStation {
  id: string;
  name: string;
  operatorId: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  status: string | null;
  reliabilityScore: number | null;
  chargerCountDc: number | null;
  chargerCountAc: number | null;
  latestPrice: typeof schema.priceSnapshots.$inferSelect | null;
  availableCount: number;
  queueReportCount: number;
  score: number;
  recommendLabel: string;
}

export async function getRankedStations(
  lat: number,
  lng: number,
  radiusKm: number,
  sortBy: SortBy = 'best'
): Promise<ScoredStation[]> {
  const period = getCurrentPricePeriod();
  const nearby = await getNearbyStations(lat, lng, radiusKm, true);

  const enriched = await Promise.all(
    nearby.map(async (s) => {
      const [latestPrice] = await db
        .select()
        .from(schema.priceSnapshots)
        .where(eq(schema.priceSnapshots.stationId, s.id))
        .orderBy(sql`${schema.priceSnapshots.createdAt} DESC`)
        .limit(1);

      const availableChargers = await db
        .select()
        .from(schema.chargerUnits)
        .where(
          and(
            eq(schema.chargerUnits.stationId, s.id),
            eq(schema.chargerUnits.status, 'available')
          )
        );

      const queueReports = await db
        .select()
        .from(schema.contributions)
        .where(
          and(
            eq(schema.contributions.stationId, s.id),
            eq(schema.contributions.type, 'queue'),
            sql`${schema.contributions.createdAt} > NOW() - INTERVAL '2 hours'`
          )
        );

      return {
        ...s,
        latestPrice: latestPrice ?? null,
        availableCount: availableChargers.length,
        queueReportCount: queueReports.length,
      };
    })
  );

  const prices = enriched
    .map((s) => {
      if (!s.latestPrice) return null;
      if (period === 'peak') return s.latestPrice.totalPeak;
      if (period === 'valley') return s.latestPrice.totalValley;
      return s.latestPrice.totalFlat;
    })
    .filter((p): p is number => p !== null);

  const minPrice = prices.length ? Math.min(...prices) : 1;
  const maxPrice = prices.length ? Math.max(...prices) : 2;
  const priceRange = maxPrice - minPrice || 1;

  const scored: ScoredStation[] = enriched.map((s) => {
    const currentPrice = (() => {
      if (!s.latestPrice) return null;
      if (period === 'peak') return s.latestPrice.totalPeak;
      if (period === 'valley') return s.latestPrice.totalValley;
      return s.latestPrice.totalFlat;
    })();

    const priceScore = currentPrice !== null
      ? 1 - (currentPrice - minPrice) / priceRange
      : 0.3;

    const totalChargers = (s.chargerCountDc ?? 0) + (s.chargerCountAc ?? 0);
    const rawAvailScore = totalChargers > 0
      ? s.availableCount / totalChargers
      : 0.3;
    const availScore = Math.max(0, rawAvailScore - s.queueReportCount * 0.15);

    const distScore = 1 / (1 + s.distanceKm);
    const reliScore = s.reliabilityScore ?? 0.5;

    const score =
      priceScore * 0.35 +
      availScore * 0.25 +
      distScore * 0.20 +
      reliScore * 0.15 +
      0.05;

    const recommendLabel = (() => {
      if (priceScore > 0.8 && availScore > 0.6) return '价格最优，当前有空位';
      if (priceScore > 0.8) return `当前时段价格最低 ¥${currentPrice?.toFixed(2)}/度`;
      if (availScore > 0.8) return '空位充足，无需排队';
      if (distScore > 0.7) return `距你最近 ${s.distanceKm}km`;
      if (reliScore > 0.85) return '用户评价：设备可靠';
      return '综合评分较高';
    })();

    return {
      id: s.id,
      name: s.name,
      operatorId: s.operatorId,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      distanceKm: s.distanceKm,
      status: s.status,
      reliabilityScore: s.reliabilityScore,
      chargerCountDc: s.chargerCountDc,
      chargerCountAc: s.chargerCountAc,
      latestPrice: s.latestPrice,
      availableCount: s.availableCount,
      queueReportCount: s.queueReportCount,
      score,
      recommendLabel,
    };
  });

  return scored.sort((a, b) => {
    switch (sortBy) {
      case 'cheapest': {
        const ap = a.latestPrice?.totalFlat ?? 99;
        const bp = b.latestPrice?.totalFlat ?? 99;
        return ap - bp;
      }
      case 'nearest':
        return a.distanceKm - b.distanceKm;
      case 'fastest':
        return b.availableCount - a.availableCount;
      case 'available':
        return b.availableCount - a.availableCount;
      default:
        return b.score - a.score;
    }
  });
}