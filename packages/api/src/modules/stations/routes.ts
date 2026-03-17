import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getNearbyStations,
  getStationById,
  getStationWithDetails,
} from './service';

const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.5).max(50).default(5),
});

export async function stationsRoutes(app: FastifyInstance) {
  // GET /api/v1/stations/nearby?lat=22.5&lng=114.0&radiusKm=5
  app.get('/nearby', async (request, reply) => {
    const parsed = nearbySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: '参数错误', details: parsed.error.flatten() });
    }
    const { lat, lng, radiusKm } = parsed.data;
    const stations = await getNearbyStations(lat, lng, radiusKm);
    return { stations };
  });

  // GET /api/v1/stations/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const station = await getStationById(request.params.id);
    if (!station) return reply.code(404).send({ error: '充电站不存在' });
    return { station };
  });

  // GET /api/v1/stations/:id/details  (含充电桩、价格、评价)
  app.get<{ Params: { id: string } }>('/:id/details', async (request, reply) => {
    const data = await getStationWithDetails(request.params.id);
    if (!data) return reply.code(404).send({ error: '充电站不存在' });
    return data;
  });
}
