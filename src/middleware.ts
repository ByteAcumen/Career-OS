import { NextRequest, NextResponse } from "next/server";

// ── In-memory sliding window store ──────────────────────────────
// NOTE: This resets on cold starts in serverless. For multi-instance
// production, replace with an edge KV store (e.g. Upstash Redis).
const ipMap = new Map<string, { count: number; windowStart: number }>();

// Cleanup expired entries every 2 minutes to prevent memory growth
let lastCleanup = Date.now();
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 120_000) return;
  lastCleanup = now;
  for (const [key, val] of ipMap.entries()) {
    if (now - val.windowStart > RATE_WINDOW_MS) {
      ipMap.delete(key);
    }
  }
}

// ── Configuration ────────────────────────────────────────────────
/** Protected routes and their per-window request limits */
const PROTECTED_ROUTES: Array<{ pattern: RegExp; limit: number }> = [
  { pattern: /^\/api\/auth\/sign-in/, limit: 12 },   // 12 attempts per window
  { pattern: /^\/api\/auth\/sign-up/, limit: 8 },    // 8 per window
  { pattern: /^\/sign-in/, limit: 20 },
  { pattern: /^\/sign-up/, limit: 15 },
  { pattern: /^\/api\/auth\/reset-password/, limit: 5 },
  { pattern: /^\/api\/ai\/chat/, limit: 60 },         // Generous for authenticated users
];

const RATE_WINDOW_MS = 60_000; // 1-minute rolling window

// ── Middleware ───────────────────────────────────────────────────
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Find matching protected route
  const match = PROTECTED_ROUTES.find((r) => r.pattern.test(pathname));

  if (match) {
    maybeCleanup();

    // Prefer Cloudflare/Vercel real IP headers over remoteAddress
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";

    const key = `${ip}:${pathname.split("?")[0]}`;
    const now = Date.now();
    const entry = ipMap.get(key);

    if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
      // New window
      ipMap.set(key, { count: 1, windowStart: now });
    } else {
      entry.count++;
      if (entry.count > match.limit) {
        const retryAfter = Math.ceil((RATE_WINDOW_MS - (now - entry.windowStart)) / 1000);
        return new NextResponse(
          JSON.stringify({ message: "Too many requests. Please slow down.", retryAfter }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": String(match.limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil((entry.windowStart + RATE_WINDOW_MS) / 1000)),
            },
          },
        );
      }
    }
  }

  // ── Security headers are applied in next.config.ts ──
  // Middleware handles dynamic logic (rate limiting); static headers live in config.
  return NextResponse.next();
}

export const config = {
  // Only run on routes that need guarding — skip static assets and images
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
