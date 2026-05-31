import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export type Counts = Record<string, { yo: number; emoji: number }>;

const KEY = 'yo:counts';

export async function getCounts(): Promise<Counts> {
  const raw = await redis.hgetall<Record<string, string>>(KEY);
  if (!raw) return {};
  const result: Counts = {};
  for (const [field, val] of Object.entries(raw)) {
    const [name, type] = field.split(':');
    if (!result[name]) result[name] = { yo: 0, emoji: 0 };
    result[name][type as 'yo' | 'emoji'] = Number(val);
  }
  return result;
}

export async function increment(name: string, type: 'yo' | 'emoji'): Promise<number> {
  return redis.hincrby(KEY, `${name}:${type}`, 1);
}
