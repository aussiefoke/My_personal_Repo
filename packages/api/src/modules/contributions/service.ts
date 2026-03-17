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
  access_tip:   null, // 永久有效直到被纠正
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
  // 1. 距离验证：必须在充电站 300m 以内
  const [station] = await db
    .select()
    .from(schema.stations)
    .where(eq(schema.stations.id, body.stationId));

  if (!station) throw new AppError(404, '充电站不存在');

  const dist = haversineKm(body.userLat, body.userLng, station.lat, station.lng);
  if (dist > 0.3) {
    throw new AppError(403, `你距该充电站 ${dist.toFixed(1)}km，需在 300m 以内才能提交报告`);
  }

  // 2. 频率限制：每人每站每天最多 3 条
  const [countRow] = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*) as count FROM contributions
    WHERE user_id = ${userId}
      AND station_id = ${body.stationId}
      AND created_at > NOW() - INTERVAL '24 hours'
  `);
  if (parseInt(countRow.count) >= 3) {
    throw new AppError(429, '今日对该充电站的贡献已达上限（3条/天）');
  }

  // 3. 获取用户信任分
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  if (!user) throw new AppError(404, '用户不存在');

  const expiryH = EXPIRY_HOURS[body.type];
  const expiresAt = expiryH
    ? new Date(Date.now() + expiryH * 3600_000)
    : null;

  // 4. 写入贡献
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

  // 5. 积分奖励
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

  // 6. 价格更新：尝试自动核验（2条以上匹配则标记 verified=1）
  if (body.type === 'price_update') {
    await tryAutoVerifyPrice(body.stationId, contrib.id, body.payload);
  }

  return { contribution: contrib, pointsEarned: points };
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
        sql`${schema.contributions.created_at} > NOW() - INTERVAL '24 hours'`,
        sql`${schema.contributions.id} != ${contribId}`
      )
    )
    .limit(5);

  const matching = recent.filter((r) => {
    try {
      const p = JSON.parse(r.payload) as Record<string, unknown>;
      return Math.abs((p.totalFlat as number) - (payload.totalFlat as number)) < 0.05;
    } catch {
      return false;
    }
  });

  if (matching.length >= 1) {
    // 自动写入一条新的已验证价格快照
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
  }
}
