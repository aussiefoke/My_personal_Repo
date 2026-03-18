import 'dotenv/config';
import Fastify from 'fastify';
import fjwt from '@fastify/jwt';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import { stationsRoutes }      from './modules/stations/routes';
import { rankingRoutes }       from './modules/ranking/routes';
import { authRoutes, userRoutes } from './modules/users/routes';
import { contributionsRoutes } from './modules/contributions/routes';
import { reviewsRoutes }       from './modules/reviews/routes';
import { calculatorRoutes }    from './modules/calculator/routes';
import { adminRoutes }         from './modules/admin/routes';

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
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
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

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.code(500).send({ error: '服务器内部错误', message: error.message });
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`✅ ChargeSmart API 运行在 http://localhost:${port}`);
  console.log(`📋 路由列表: http://localhost:${port}/health`);
}

bootstrap().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});