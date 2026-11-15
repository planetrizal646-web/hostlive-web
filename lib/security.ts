const attempts = new Map<string, { count: number; reset: number }>();

/**
 * Rate limiter sederhana berbasis memori.
 * Cukup buat dashboard internal; kalau deploy serverless, ganti ke Redis/Upstash.
 */
export function isRateLimited(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  // Bersihkan entry kadaluarsa biar memori gak bocor
  if (attempts.size > 1000) {
    for (const [k, v] of attempts) {
      if (now > v.reset) attempts.delete(k);
    }
  }

  if (!entry || now > entry.reset) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return false;
  }

  if (entry.count >= limit) return true;

  entry.count++;
  return false;
}

/**
 * Cek Origin header buat mitigasi CSRF tambahan.
 * SameSite=Lax udah bagus, tapi ini lapisan ekstra biar aman.
 */
export function isOriginValid(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  // Request tanpa Origin (misal: curl, atau beberapa kasus same-origin) dilepas dulu.
  // Next.js SameSite=Lax udah nahan cross-site POST kok.
  if (!origin) return true;

  try {
    const url = new URL(origin);
    return url.host === host;
  } catch {
    return false;
  }
}
