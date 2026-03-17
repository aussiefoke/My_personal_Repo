import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendOtp, verifyOtp } from './authService';

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
}
