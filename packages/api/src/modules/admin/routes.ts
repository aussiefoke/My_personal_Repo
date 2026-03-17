import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { requireAdmin } from '../../shared/middleware/auth';
import { db, schema } from '../../shared/db/client';

export async function adminRoutes(app: FastifyInstance) {
  // 所有 admin 路由都需要管理员权限
  app.addHook('preHandler', requireAdmin);

  // GET /api/v1/admin/dashboard
  app.get('/dashboard', async () => {
    const [userCount] = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM users`
    );
    const [stationCount] = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM stations`
    );
    const [pendingCount] = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM contributions WHERE verified = 0`
    );
    const [reviewCount] = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM reviews`
    );

    return {
      users:              parseInt(userCount.count),
      stations:           parseInt(stationCount.count),
      pendingContribs:    parseInt(pendingCount.count),
      reviews:            parseInt(reviewCount.count),
    };
  });

  // POST /api/v1/admin/stations  (新增充电站)
  app.post('/stations', async (request, reply) => {
    const parsed = z.object({
      name:           z.string().min(2),
      operatorId:     z.string(),
      address:        z.string(),
      city:           z.string(),
      lat:            z.number(),
      lng:            z.number(),
      chargerCountDc: z.number().int().default(0),
      chargerCountAc: z.number().int().default(0),
      parkingNote:    z.string().optional(),
      accessNote:     z.string().optional(),
    }).safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: '参数错误', details: parsed.error.flatten() });
    }

    const [station] = await db
      .insert(schema.stations)
      .values(parsed.data)
      .returning();

    return reply.code(201).send({ station });
  });

  // PATCH /api/v1/admin/stations/:id
  app.patch<{ Params: { id: string } }>('/stations/:id', async (request, reply) => {
    const [updated] = await db
      .update(schema.stations)
      .set({ ...(request.body as object), updatedAt: new Date() })
      .where(eq(schema.stations.id, request.params.id))
      .returning();

    if (!updated) return reply.code(404).send({ error: '充电站不存在' });
    return { station: updated };
  });

  // GET /api/v1/admin/contributions/queue  (待审核的贡献)
  app.get('/contributions/queue', async () => {
    const rows = await db
      .select()
      .from(schema.contributions)
      .where(eq(schema.contributions.verified, 0))
      .orderBy(sql`${schema.contributions.createdAt} DESC`)
      .limit(50);

    return { queue: rows };
  });

  // PATCH /api/v1/admin/contributions/:id  (审核通过/拒绝)
  app.patch<{ Params: { id: string } }>('/contributions/:id', async (request, reply) => {
    const parsed = z.object({
      verified: z.union([z.literal(1), z.literal(-1)]),
    }).safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: '参数错误：verified 必须为 1 或 -1' });
    }

    const [updated] = await db
      .update(schema.contributions)
      .set({ verified: parsed.data.verified })
      .where(eq(schema.contributions.id, request.params.id))
      .returning();

    return { contribution: updated };
  });
}
