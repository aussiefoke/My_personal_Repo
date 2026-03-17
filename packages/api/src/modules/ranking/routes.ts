import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getRankedStations } from './service';

const rankSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.5).max(30).default(5),
  sortBy: z.enum(['best', 'cheapest', 'nearest', 'fastest', 'available']).default('best'),
});

export async function rankingRoutes(app: FastifyInstance) {
  // GET /api/v1/ranking/nearby?lat=22.5&lng=114.0&sortBy=cheapest
  app.get('/nearby', async (request, reply) => {
    const parsed = rankSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: '参数错误', details: parsed.error.flatten() });
    }
    const { lat, lng, radiusKm, sortBy } = parsed.data;
    const stations = await getRankedStations(lat, lng, radiusKm, sortBy);
    return { stations, count: stations.length };
  });
}
