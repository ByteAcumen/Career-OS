type Bucket = {
  count: number;
  resetAt: number;
};

// NOTE: This is an in-memory rate limiter. In serverless environments (Vercel),
// each function invocation may be a new process, so limits reset on cold starts.
// For production multi-instance deploys, replace with a Turso or Upstash Redis backend.
const buckets = new Map<string, Bucket>();

// Prevent the buckets map from growing forever — clean up expired entries every 5 minutes.
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
    },
    5 * 60_000,
  );
}

export function rateLimit(
  request: Request,
  key: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "local";
  const ip = forwardedFor.split(",")[0]?.trim() || "local";
  const bucketKey = `${key}:${ip}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return null;
  }

  if (existing.count >= options.limit) {
    return Math.ceil((existing.resetAt - now) / 1000);
  }

  existing.count += 1;
  buckets.set(bucketKey, existing);
  return null;
}
