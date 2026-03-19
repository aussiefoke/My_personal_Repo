import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../../shared/db/client';
import { sql } from 'drizzle-orm';
import { requireAuth } from '../../shared/middleware/auth';

const FEATHERLESS_KEY = 'rc_99f363be1cd77ac59bc3ddd66211aecaedff98500d57833149275cbede77bfd6';

export async function aiRoutes(app: FastifyInstance) {

  // POST /api/v1/ai/chat
  app.post('/chat', async (request, reply) => {
    const parsed = z.object({
      message: z.string().min(1).max(500),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }).safeParse(request.body);

    if (!parsed.success) return reply.code(400).send({ error: '参数错误' });

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

      if (!response.ok) throw new Error(`Featherless API error: ${response.status}`);
      const data = await response.json() as any;
      return { reply: data.choices[0].message.content };
    } catch (err) {
      console.error('AI error:', err);
      return reply.code(500).send({ error: 'AI 服务暂时不可用，请稍后再试' });
    }
  });

  // POST /api/v1/ai/scan-receipt
  app.post('/scan-receipt', async (request, reply) => {
    const parsed = z.object({
      imageBase64: z.string().min(1),
      mimeType: z.string().default('image/jpeg'),
    }).safeParse(request.body);

    if (!parsed.success) return reply.code(400).send({ error: '参数错误' });

    const { imageBase64, mimeType } = parsed.data;

    try {
      const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FEATHERLESS_KEY}`,
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen3-VL-30B-A3B-Instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                },
                {
                  type: 'text',
                  text: `请识别这张充电账单截图，找出：
1. 本次充电的度数（kWh）
2. 充电日期

只返回JSON，不要返回其他内容：
{"kwh": 数字, "date": "YYYY-MM-DD", "found": true}
找不到返回：
{"kwh": 0, "date": null, "found": false}`,
                },
              ],
            },
          ],
          max_tokens: 100,
          temperature: 0.1,
        }),
      });

      if (!response.ok) throw new Error(`Featherless API error: ${response.status}`);

      const data = await response.json() as any;
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{.*\}/s);
      if (!jsonMatch) throw new Error('无法解析 AI 返回结果');

      const result = JSON.parse(jsonMatch[0]);

      // 验证账单日期不超过7天
      if (result.date) {
        const receiptDate = new Date(result.date);
        const daysDiff = (Date.now() - receiptDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 7) {
          return {
            kwh: 0,
            found: false,
            reason: `账单日期为 ${result.date}，超过7天的账单无法领取积分`,
          };
        }
      }

      const kwh = Math.min(parseFloat(result.kwh) || 0, 100); // 最多100度
      const co2Saved = kwh * 0.094;
      const points = Math.min(Math.floor(kwh * 2), 200); // 最多200积分

      return {
        kwh,
        found: result.found,
        co2Saved: co2Saved.toFixed(2),
        kmEquivalent: (kwh * 6).toFixed(0),
        treesEquivalent: (co2Saved / 18).toFixed(3),
        pointsEarned: points,
      };
    } catch (err) {
      console.error('Scan receipt error:', err);
      return reply.code(500).send({ error: '识别失败，请重试' });
    }
  });

  // POST /api/v1/ai/claim-carbon-points
  app.post('/claim-carbon-points', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = z.object({
      kwh: z.number().min(0.1).max(100),
      stationId: z.string(),
    }).safeParse(request.body);

    if (!parsed.success) return reply.code(400).send({ error: '参数错误' });

    const user = request.user as { userId: string };

    // 每日限领一次
    const todayResult = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*) as count FROM point_transactions
      WHERE user_id = ${user.userId}
        AND action_type = 'carbon_receipt'
        AND created_at > NOW() - INTERVAL '24 hours'
    `);
const todayRows = Array.isArray(todayResult) ? todayResult : (todayResult as any).rows ?? [];
const todayCount = parseInt(todayRows[0]?.count ?? '0');
if (todayCount >= 1) {
  return reply.code(429).send({ error: '今日已领取过碳积分，明天再来' });
}

    const points = Math.min(Math.floor(parsed.data.kwh * 2), 200);

    await db.execute(sql`
      UPDATE users SET points = points + ${points} WHERE id = ${user.userId}
    `);

    await db.insert(schema.pointTransactions).values({
      userId:      user.userId,
      amount:      points,
      actionType:  'carbon_receipt',
      referenceId: parsed.data.stationId,
    });

    return { pointsEarned: points, message: '积分已到账' };
  });
}