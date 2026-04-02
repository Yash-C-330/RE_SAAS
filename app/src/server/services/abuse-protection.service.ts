import crypto from "crypto";
import { getRedisClient } from "@/server/redis/client";

export type AbuseCheckResult = {
  blocked: boolean;
  reason?: string;
  blockForSeconds?: number;
};

const BURST_WINDOW_SECONDS = 15;
const BURST_THRESHOLD = 25;
const REPEATED_MESSAGE_WINDOW_SECONDS = 300;
const REPEATED_MESSAGE_THRESHOLD = 5;
const BLOCK_DURATION_SECONDS = 600;

export async function evaluateAbuseRisk(params: {
  tenantId: string;
  provider: "twilio" | "openai";
  message?: string;
}) {
  const redis = getRedisClient();
  const blockKey = `abuse:block:${params.tenantId}`;

  const existingBlockTtl = await redis.ttl(blockKey);
  if (existingBlockTtl > 0) {
    return {
      blocked: true,
      reason: "tenant_temporarily_blocked",
      blockForSeconds: existingBlockTtl,
    } satisfies AbuseCheckResult;
  }

  const now = Date.now();
  const burstKey = `abuse:burst:${params.tenantId}:${params.provider}`;
  const burstWindowMs = BURST_WINDOW_SECONDS * 1000;

  const burstPipeline = await redis
    .multi()
    .zremrangebyscore(burstKey, 0, now - burstWindowMs)
    .zadd(burstKey, now, `${now}:${crypto.randomUUID()}`)
    .zcard(burstKey)
    .expire(burstKey, BURST_WINDOW_SECONDS + 5)
    .exec();

  const burstCount = Number(burstPipeline?.[2]?.[1] ?? 0);
  if (burstCount > BURST_THRESHOLD) {
    await redis.set(blockKey, "burst_traffic", "EX", BLOCK_DURATION_SECONDS);
    return {
      blocked: true,
      reason: "burst_traffic_detected",
      blockForSeconds: BLOCK_DURATION_SECONDS,
    } satisfies AbuseCheckResult;
  }

  if (!params.message) {
    return { blocked: false } satisfies AbuseCheckResult;
  }

  const messageHash = hashMessage(params.message);
  const repeatedKey = `abuse:repeat:${params.tenantId}:${params.provider}:${messageHash}`;
  const repeatedCount = await redis.incr(repeatedKey);
  if (repeatedCount === 1) {
    await redis.expire(repeatedKey, REPEATED_MESSAGE_WINDOW_SECONDS);
  }

  if (repeatedCount > REPEATED_MESSAGE_THRESHOLD) {
    await redis.set(blockKey, "repeated_message", "EX", BLOCK_DURATION_SECONDS);
    return {
      blocked: true,
      reason: "repeated_message_detected",
      blockForSeconds: BLOCK_DURATION_SECONDS,
    } satisfies AbuseCheckResult;
  }

  return { blocked: false } satisfies AbuseCheckResult;
}

function hashMessage(input: string) {
  return crypto.createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}
