import { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: '请先登录' });
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const payload = request.user as { role?: string };
    if (payload.role !== 'admin') {
      reply.code(403).send({ error: '需要管理员权限' });
    }
  } catch {
    reply.code(401).send({ error: '请先登录' });
  }
}
