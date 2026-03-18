import { eq, and, sql } from 'drizzle-orm';
import { db, schema } from '../../shared/db/client';

export async function getNearbyStations(
  lat: number,
  lng: number,
  radiusKm: number = 5
) {
  // 用简单的边界框查询（MVP 阶段不需要完整 PostGIS，数据量小时够用）
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  const rows = await db
    .select()
    .from(schema.stations)
    .where(
      and(
        sql`${schema.stations.lat} BETWEEN ${lat - latDelta} AND ${lat + latDelta}`,
        sql`${schema.stations.lng} BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}`,
      )
    );

  // 加上直线距离（前端排序用）
  return rows.map((s) => {
    const dLat = s.lat - lat;
    const dLng = s.lng - lng;
    const distanceKm = Math.sqrt(dLat ** 2 + dLng ** 2) * 111;
    return { ...s, distanceKm: Math.round(distanceKm * 10) / 10 };
  }).sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getStationById(id: string) {
  const [station] = await db
    .select()
    .from(schema.stations)
    .where(eq(schema.stations.id, id));
  return station ?? null;
}

export async function getStationWithDetails(id: string) {
  const station = await getStationById(id);
  if (!station) return null;

  const chargers = await db
    .select()
    .from(schema.chargerUnits)
    .where(eq(schema.chargerUnits.stationId, id));

  const [latestPrice] = await db
    .select()
    .from(schema.priceSnapshots)
    .where(eq(schema.priceSnapshots.stationId, id))
    .orderBy(sql`${schema.priceSnapshots.createdAt} DESC`)
    .limit(1);

  const reviews = await db
    .select()
    .from(schema.reviews)
    .where(eq(schema.reviews.stationId, id))
    .orderBy(sql`${schema.reviews.createdAt} DESC`)
    .limit(10);

    
  const recentReports = await db
    .select()
    .from(schema.contributions)
    .where(
      and(
        eq(schema.contributions.stationId, id),
        sql`${schema.contributions.verified} >= 0`
      )
    )
    .orderBy(sql`${schema.contributions.createdAt} DESC`)
    .limit(5);

  return { ...station, chargers, latestPrice, reviews, recentReports };
}
