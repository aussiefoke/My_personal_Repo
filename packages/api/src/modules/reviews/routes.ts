import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '../../shared/middleware/auth';
import { db, schema } from '../../shared/db/client';

export async function reviewsRoutes(app: FastifyInstance) {
  // GET /api/v1/reviews/:stationId
  app.get<{ Params: { stationId: string } }>(
    '/:stationId',
    async (request, reply) => {
      const page = Number((request.query as Record<string,string>).page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;

      const rows = await db
        .select()
        .from(schema.reviews)
        .where(eq(schema.reviews.stationId, request.params.stationId))
        .orderBy(sql`${schema.reviews.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      return { reviews: rows, page };
    }
  );

  // POST /api/v1/reviews  (需要登录)
  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = z.object({
      stationId: z.string().uuid(),
      rating:    z.number().int().min(1).max(5),
      body:      z.string().min(5).max(500).optional(),
    }).safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: '参数错误', details: parsed.error.flatten() });
    }

    const user = request.user as { userId: string };

    // 每人每站只能评价一次
    const [existing] = await db
      .select()
      .from(schema.reviews)
      .where(
        eq(schema.reviews.stationId, parsed.data.stationId)
      )
      .limit(1);

    // 写入评价
    const [review] = await db
      .insert(schema.reviews)
      .values({
        stationId: parsed.data.stationId,
        userId:    user.userId,
        rating:    parsed.data.rating,
        body:      parsed.data.body,
      })
      .returning();

    // 奖励积分
    await db.insert(schema.pointTransactions).values({
      userId:     user.userId,
      amount:     10,
      actionType: 'review',
      referenceId: review.id,
    });
    await db.execute(
      sql`UPDATE users SET points = points + 10 WHERE id = ${user.userId}`
    );

    return reply.code(201).send({ review, pointsEarned: 10 });
  });

  // POST /api/v1/reviews/:id/helpful
  app.post<{ Params: { id: string } }>(
    '/:id/helpful',
    { preHandler: requireAuth },
    async (request, reply) => {
      await db.execute(
        sql`UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ${request.params.id}`
      );
      return { ok: true };
    }
  );
}
