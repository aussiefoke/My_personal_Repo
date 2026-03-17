import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../shared/middleware/auth';
import { submitContribution } from './service';
import { eq, and, sql } from 'drizzle-orm';
import { db, schema } from '../../shared/db/client';

const contributionSchema = z.object({
  stationId: z.string().uuid(),
  type: z.enum(['price_update', 'queue', 'fault', 'access_tip', 'new_station']),
  payload: z.record(z.unknown()),
  userLat: z.number(),
  userLng: z.number(),
});

export async function contributionsRoutes(app: FastifyInstance) {
  // POST /api/v1/contributions  (需要登录)
  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = contributionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: '参数错误', details: parsed.error.flatten() });
    }

    const user = request.user as { userId: string };
    try {
      const result = await submitContribution(user.userId, parsed.data);
      return reply.code(201).send(result);
    } catch (err: unknown) {
      if (err instanceof Error && 'statusCode' in err) {
        const e = err as { statusCode: number; message: string };
        return reply.code(e.statusCode).send({ error: e.message });
      }
      throw err;
    }
  });

  // GET /api/v1/contributions/:stationId/recent  (公开)
  app.get<{ Params: { stationId: string } }>(
    '/:stationId/recent',
    async (request, reply) => {
      const rows = await db
        .select()
        .from(schema.contributions)
        .where(
          and(
            eq(schema.contributions.stationId, request.params.stationId),
            sql`(${schema.contributions.expiresAt} IS NULL OR ${schema.contributions.expiresAt} > NOW())`,
            sql`${schema.contributions.verified} >= 0`
          )
        )
        .orderBy(sql`${schema.contributions.createdAt} DESC`)
        .limit(20);

      return { reports: rows };
    }
  );
}
