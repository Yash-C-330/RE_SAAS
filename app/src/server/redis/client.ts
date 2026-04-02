import IORedis from "ioredis";

let redisClient: IORedis | null = null;

export function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    throw new Error("REDIS_URL is required for managed integrations");
  }

  redisClient = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });

  return redisClient;
}
