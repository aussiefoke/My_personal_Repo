import { eq } from 'drizzle-orm';
import { db, schema } from '../../shared/db/client';

// 内存存储 OTP（MVP 用，生产环境换成 Redis）
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export function generateOtp(): string {
  // 开发阶段固定验证码，上线前删除
  return '123456';
}

export async function sendOtp(phone: string): Promise<string> {
  const code = generateOtp();
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60_000 }); // 5分钟有效

  // 开发环境：直接打印 OTP（生产环境接入阿里云短信）
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📱 [DEV] 验证码 ${phone}: ${code}`);
    return 'ok';
  }

  // TODO: 接入阿里云短信
  // await aliSms.sendSms({ phone, code, signName: process.env.ALIBABA_SMS_SIGN_NAME });
  return 'ok';
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ token: string; user: typeof schema.users.$inferSelect } | null> {
  const stored = otpStore.get(phone);
  if (!stored || stored.code !== code || Date.now() > stored.expiresAt) {
    return null;
  }
  otpStore.delete(phone);

  // 查找或创建用户
  let [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.phone, phone));

  if (!user) {
    [user] = await db
      .insert(schema.users)
      .values({ phone })
      .returning();
  }

  return { token: '', user }; // token 由路由层通过 fastify-jwt 签发
}

export async function getUserById(id: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id));
  return user ?? null;
}
