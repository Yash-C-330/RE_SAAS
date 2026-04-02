type Bucket = {
  hits: number[];
};

const buckets = new Map<string, Bucket>();

export type SimpleRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function enforceSimpleRateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): SimpleRateLimitResult {
  const now = Date.now();
  const windowMs = params.windowSeconds * 1000;
  const threshold = now - windowMs;

  const bucket = buckets.get(params.key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((ts) => ts > threshold);

  if (bucket.hits.length >= params.limit) {
    const oldestHit = bucket.hits[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestHit + windowMs - now) / 1000));
    buckets.set(params.key, bucket);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  bucket.hits.push(now);
  buckets.set(params.key, bucket);

  return {
    allowed: true,
    remaining: Math.max(0, params.limit - bucket.hits.length),
    retryAfterSeconds: 0,
  };
}
