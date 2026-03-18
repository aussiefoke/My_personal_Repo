import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { requireAdmin, requireAuth } from '../../shared/middleware/auth';
import { db, schema } from '../../shared/db/client';

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/send-otp
  app.post('/send-otp', async (request, reply) => {
    const body = z.object({ phone: z.string().regex(/^1[3-9]\d{9}$/) })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: '手机号格式错误' });

    await sendOtp(body.data.phone);
    return { message: '验证码已发送' };
  });

  // POST /api/v1/auth/verify-otp
  app.post('/verify-otp', async (request, reply) => {
    const body = z.object({
      phone: z.string(),
      code: z.string().length(6),
    }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: '参数错误' });

    const result = await verifyOtp(body.data.phone, body.data.code);
    if (!result) return reply.code(401).send({ error: '验证码错误或已过期' });

    const token = app.jwt.sign(
      { userId: result.user.id, role: 'user' },
      { expiresIn: '30d' }
    );

    return { token, user: result.user };
  });

  // GET /api/v1/users/me
  app.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as { userId: string };
    const [profile] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.userId));

    if (!profile) return reply.code(404).send({ error: '用户不存在' });
    return { user: profile };
  });

  // GET /api/v1/users/me/transactions
  app.get('/me/transactions', { preHandler: requireAuth }, async (request) => {
    const user = request.user as { userId: string };
    const transactions = await db
      .select()
      .from(schema.pointTransactions)
      .where(eq(schema.pointTransactions.userId, user.userId))
      .orderBy(sql`${schema.pointTransactions.createdAt} DESC`)
      .limit(20);

    return { transactions };
  });

  // GET /api/v1/users/me/contributions
  app.get('/me/contributions', { preHandler: requireAuth }, async (request) => {
    const user = request.user as { userId: string };
    const contributions = await db
      .select()
      .from(schema.contributions)
      .where(eq(schema.contributions.userId, user.userId))
      .orderBy(sql`${schema.contributions.createdAt} DESC`)
      .limit(20);

    return { contributions };
  });
}