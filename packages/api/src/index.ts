import 'dotenv/config';
import Fastify from 'fastify';
import fjwt from '@fastify/jwt';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import crypto from 'crypto';

import { stationsRoutes }      from './modules/stations/routes';
import { rankingRoutes }       from './modules/ranking/routes';
import { authRoutes, userRoutes } from './modules/users/routes';
import { contributionsRoutes } from './modules/contributions/routes';
import { reviewsRoutes }       from './modules/reviews/routes';
import { calculatorRoutes }    from './modules/calculator/routes';
import { adminRoutes }         from './modules/admin/routes';
import { aiRoutes }            from './modules/ai/routes';

const APP_SECRET = 'chargesmart_2026_x9k2p';

const app = Fastify({
  logger: {
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
  },
});

async function bootstrap() {
  await app.register(cors, { origin: true });
  await app.register(fjwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-please-change',
  });

  // 全局限流：普通接口100次/分钟，AI接口单独限流
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      // 按 IP + 路径前缀限流
      const ip = request.ip;
      const isAI = request.url.startsWith('/api/v1/ai');
      return isAI ? `ai_${ip}` : `general_${ip}`;
    },
    errorResponseBuilder: () => ({
      error: '请求过于频繁，请稍后再试',
    }),
  });

  // AI 接口额外限流：10次/分钟
  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/api/v1/ai')) return;

    const ip = request.ip;
    const key = `ai_strict_${ip}`;
    const store = (app as any)._aiRateStore ?? ((app as any)._aiRateStore = new Map());

    const now = Date.now();
    const record = store.get(key) ?? { count: 0, resetAt: now + 60000 };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + 60000;
    }

    record.count++;
    store.set(key, record);

    if (record.count > 10) {
      return reply.code(429).send({ error: 'AI 接口请求过于频繁，每分钟最多10次' });
    }
  });

  // 请求签名验证
  app.addHook('preHandler', async (request, reply) => {
    // 跳过健康检查
    if (request.url === '/health') return;

    const timestamp = request.headers['x-timestamp'] as string;
    const nonce = request.headers['x-nonce'] as string;
    const signature = request.headers['x-signature'] as string;

    if (!timestamp || !nonce || !signature) {
      return reply.code(403).send({ error: '非法请求' });
    }

    // 时间戳超过5分钟拒绝
    if (Math.abs(Date.now() - parseInt(timestamp)) > 5 * 60 * 1000) {
      return reply.code(403).send({ error: '请求已过期' });
    }

    const expected = crypto
      .createHmac('sha256', APP_SECRET)
      .update(`${timestamp}${nonce}${APP_SECRET}`)
      .digest('hex');

    if (expected !== signature) {
      return reply.code(403).send({ error: '签名验证失败' });
    }
  });

  app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

  await app.register(authRoutes,          { prefix: '/api/v1/auth' });
  await app.register(userRoutes,          { prefix: '/api/v1/users' });
  await app.register(stationsRoutes,      { prefix: '/api/v1/stations' });
  await app.register(rankingRoutes,       { prefix: '/api/v1/ranking' });
  await app.register(contributionsRoutes, { prefix: '/api/v1/contributions' });
  await app.register(reviewsRoutes,       { prefix: '/api/v1/reviews' });
  await app.register(calculatorRoutes,    { prefix: '/api/v1/calculator' });
  await app.register(adminRoutes,         { prefix: '/api/v1/admin' });
  await app.register(aiRoutes,            { prefix: '/api/v1/ai' });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.code(500).send({ error: '服务器内部错误', message: error.message });
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`ChargeSmart API running on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});