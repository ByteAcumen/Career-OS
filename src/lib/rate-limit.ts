type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

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
