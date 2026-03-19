import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../shared/db/client';
import { sql } from 'drizzle-orm';

const FEATHERLESS_KEY = 'rc_99f363be1cd77ac59bc3ddd66211aecaedff98500d57833149275cbede77bfd6';

export async function aiRoutes(app: FastifyInstance) {
  app.post('/chat', async (request, reply) => {
    const parsed = z.object({
      message: z.string().min(1).max(500),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }).safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: '参数错误' });
    }

    const { message, lat = 22.5396, lng = 114.0577 } = parsed.data;

    const latDelta = 5 / 111;
    const lngDelta = 5 / (111 * Math.cos((lat * Math.PI) / 180));

    const result = await db.execute<any>(sql`
      SELECT s.name, s.address, s.operator_id,
             s.charger_count_dc, s.charger_count_ac,
             s.reliability_score, s.parking_note,
             p.total_flat, p.total_peak, p.total_valley, p.service_fee,
             ROUND(SQRT(POWER(s.lat - ${lat}, 2) + POWER(s.lng - ${lng}, 2)) * 111) as distance_km
      FROM stations s
      LEFT JOIN LATERAL (
        SELECT total_flat, total_peak, total_valley, service_fee
        FROM price_snapshots
        WHERE station_id = s.id
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON true
      WHERE s.lat BETWEEN ${lat - latDelta} AND ${lat + latDelta}
        AND s.lng BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}
        AND s.status = 'active'
      ORDER BY distance_km ASC
      LIMIT 8
    `);

    const stations = Array.isArray(result) ? result : (result as any).rows ?? [];

    const hour = new Date().getHours();
    const period = hour >= 8 && hour < 22 ? '平时' : '谷时';

    const stationContext = stations.map((s: any) =>
      `- ${s.name}（${s.address}）：距离约${s.distance_km}km，` +
      `平时¥${s.total_flat?.toFixed(2) ?? '未知'}/度，` +
      `谷时¥${s.total_valley?.toFixed(2) ?? '未知'}/度，` +
      `快充${s.charger_count_dc}个，慢充${s.charger_count_ac}个，` +
      `可靠性${Math.round((s.reliability_score ?? 0.5) * 100)}%，` +
      `停车：${s.parking_note ?? '未知'}`
    ).join('\n');

    const systemPrompt = `你是 ChargeSmart 的 AI 充电助手，专门帮助中国 EV 用户找到最合适的充电站。

当前时段：${period}（${hour}点）
用户附近的充电站数据：
${stationContext}

回答规则：
1. 根据用户的问题，结合上面的充电站数据给出具体建议
2. 推荐时说明理由（价格/距离/可靠性）
3. 回答简洁，不超过150字
4. 用中文回答
5. 如果用户问英文，用英文回答
6. 不要编造数据，只使用上面提供的真实数据`;

    try {
      const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FEATHERLESS_KEY}`,
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-7B-Instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Featherless API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const aiReply = data.choices[0].message.content;

      return { reply: aiReply };
    } catch (err) {
      console.error('AI error:', err);
      return reply.code(500).send({ error: 'AI 服务暂时不可用，请稍后再试' });
    }
  });
}