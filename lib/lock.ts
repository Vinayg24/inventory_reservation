import { redis } from "@/lib/redis";

export async function acquireLock(
  key: string,
  ttlMs: number
): Promise<boolean> {
  const result = await redis.set(key, "1", { nx: true, px: ttlMs });
  return result === "OK";
}

export async function releaseLock(key: string): Promise<void> {
  await redis.del(key);
}
