import { eq, and, sql } from 'drizzle-orm';
import { db, schema } from '../../shared/db/client';
import { haversineKm } from '../../shared/utils/helpers';
import { AppError } from '../../shared/utils/helpers';

const POINT_AWARDS: Record<string, number> = {
  price_update: 15,
  queue:        8,
  fault:        12,
  access_tip:   10,
  new_station:  20,
};

const EXPIRY_HOURS: Record<string, number | null> = {
  queue:        2,
  fault:        48,
  price_update: 48,
  access_tip:   null,
};

export interface ContributionInput {
  stationId: string;
  type: 'price_update' | 'queue' | 'fault' | 'access_tip' | 'new_station';
  payload: Record<string, unknown>;
  userLat: number;
  userLng: number;
}

export async function submitContribution(
  userId: string,
  body: ContributionInput
) {
  const [station] = await db
    .select()
    .from(schema.stations)
    .where(eq(schema.stations.id, body.stationId));

  if (!station) throw new AppError(404, '充电站不存在');

  const dist = haversineKm(body.userLat, body.userLng, station.lat, station.lng);
  if (dist > 0.3 && process.env.DEMO_MODE !== 'true') {
    throw new AppError(403, `你距该充电站 ${dist.toFixed(1)}km，需在 300m 以内才能提交报告`);
  }

 const rows = await db.execute<{ count: string }>(sql`
  SELECT COUNT(*) as count FROM contributions
  WHERE user_id = ${userId}
    AND station_id = ${body.stationId}
    AND created_at > NOW() - INTERVAL '24 hours'
`);
const countRow = Array.isArray(rows) ? rows[0] : (rows as any).rows?.[0];
  if (parseInt(countRow.count) >= 3) {
    throw new AppError(429, '今日对该充电站的贡献已达上限（3条/天）');
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  if (!user) throw new AppError(404, '用户不存在');

  const expiryH = EXPIRY_HOURS[body.type];
  const expiresAt = expiryH ? new Date(Date.now() + expiryH * 3600_000) : null;

  const [contrib] = await db
    .insert(schema.contributions)
    .values({
      stationId:   body.stationId,
      userId,
      type:        body.type,
      payload:     JSON.stringify(body.payload),
      trustWeight: user.trustScore ?? 1.0,
      expiresAt,
    })
    .returning();

  const points = POINT_AWARDS[body.type] ?? 0;
  if (points > 0) {
    await db.insert(schema.pointTransactions).values({
      userId,
      amount:      points,
      actionType:  body.type,
      referenceId: contrib.id,
    });
    await db.execute(sql`
      UPDATE users SET points = points + ${points} WHERE id = ${userId}
    `);
  }

  if (body.type === 'price_update') {
    await tryAutoVerifyPrice(body.stationId, contrib.id, body.payload);
  }

  return {
    contribution: contrib,
    pointsEarned: points,
    message: body.type === 'price_update'
      ? '价格已提交，2人以上确认后自动生效'
      : '贡献已提交，感谢你的帮助！'
  };
}

async function tryAutoVerifyPrice(
  stationId: string,
  contribId: string,
  payload: Record<string, unknown>
) {
  const recent = await db
    .select()
    .from(schema.contributions)
    .where(
      and(
        eq(schema.contributions.stationId, stationId),
        eq(schema.contributions.type, 'price_update'),
        sql`${schema.contributions.createdAt} > NOW() - INTERVAL '24 hours'`,
        sql`${schema.contributions.id} != ${contribId}`,
        sql`${schema.contributions.verified} >= 0`
      )
    )
    .limit(10);

  const matching = recent.filter((r) => {
    try {
      const p = JSON.parse(r.payload) as Record<string, unknown>;
      const diff = Math.abs((p.totalFlat as number) - (payload.totalFlat as number));
      return diff < 0.05;
    } catch {
      return false;
    }
  });

  const uniqueUsers = new Set(matching.map(r => r.userId));
  uniqueUsers.add('current');

  if (uniqueUsers.size >= 2) {
    await db.insert(schema.priceSnapshots).values({
      stationId,
      elecFeePeak:   payload.elecFeePeak as number,
      elecFeeFlat:   payload.elecFeeFlat as number,
      elecFeeValley: payload.elecFeeValley as number,
      serviceFee:    payload.serviceFee as number,
      totalPeak:     (payload.elecFeePeak as number) + (payload.serviceFee as number),
      totalFlat:     (payload.elecFeeFlat as number) + (payload.serviceFee as number),
      totalValley:   (payload.elecFeeValley as number) + (payload.serviceFee as number),
      source:        'user',
      contributedBy: contribId,
      verifiedAt:    new Date(),
      expiresAt:     new Date(Date.now() + 48 * 3600_000),
    });

    for (const r of matching) {
      await db.insert(schema.pointTransactions).values({
        userId:     r.userId,
        amount:     5,
        actionType: 'price_verified',
        referenceId: r.id,
      });
      await db.execute(
        sql`UPDATE users SET points = points + 5 WHERE id = ${r.userId}`
      );
    }

    console.log(`价格已通过 ${uniqueUsers.size} 人交叉验证，已更新充电站 ${stationId} 的价格`);
  } else {
    console.log(`价格待验证：已有 ${uniqueUsers.size}/2 人确认，等待更多用户核实`);
  }
}