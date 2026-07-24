// Fixed-window rate limiter kept in process memory.
//
// This is deliberately best-effort: on a serverless host each instance holds its
// own counters, so the real ceiling is (limit x instances) and counters reset on
// cold start. That is still enough to make credential stuffing and signup spam
// expensive, and it needs no extra infrastructure. Move to Redis/Upstash if a
// hard global guarantee is ever required.

type Window = { count: number; resetAt: number }

const buckets = new Map<string, Window>()

// Without eviction the map grows once per distinct IP, forever.
const MAX_TRACKED_KEYS = 10_000

function sweep(now: number) {
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key)
  }
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) sweep(now)
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  existing.count += 1
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))

  if (existing.count > limit) {
    return { ok: false, remaining: 0, retryAfterSeconds }
  }

  return { ok: true, remaining: limit - existing.count, retryAfterSeconds }
}

// Trust the leftmost x-forwarded-for entry only as a coarse bucketing hint; it is
// spoofable, so this throttles honest clients and raises cost for others rather
// than being an access control.
export function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  return `${scope}:${ip}`
}

export function tooManyRequests(result: RateLimitResult, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(result.retryAfterSeconds),
    },
  })
}
