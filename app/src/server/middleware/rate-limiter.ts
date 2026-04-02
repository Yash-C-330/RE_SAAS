import crypto from "crypto";
import { getRedisClient } from "@/server/redis/client";

export type RateLimitCheckResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  used: number;
};

export async function enforceTenantRateLimit(params: {
  tenantId: string;
  resource: "sms" | "ai";
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitCheckResult> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowMs = params.windowSeconds * 1000;
  const minScore = now - windowMs;
  const key = `rl:tenant:${params.tenantId}:${params.resource}`;
  const member = `${now}:${crypto.randomUUID()}`;

  const pipelineResult = await redis
    .multi()
    .zremrangebyscore(key, 0, minScore)
    .zadd(key, now, member)
    .zcard(key)
    .pexpire(key, windowMs + 1000)
    .exec();

  const used = Number(pipelineResult?.[2]?.[1] ?? 0);
  const allowed = used <= params.limit;

  if (allowed) {
    return {
      allowed: true,
      used,
      remaining: Math.max(0, params.limit - used),
      retryAfterSeconds: 0,
    };
  }

  const oldestEntry = await redis.zrange(key, 0, 0, "WITHSCORES");
  const oldestScore = Number(oldestEntry?.[1] ?? now);
  const retryAfterSeconds = Math.max(1, Math.ceil((oldestScore + windowMs - now) / 1000));

  return {
    allowed: false,
    used,
    remaining: 0,
    retryAfterSeconds,
  };
}
