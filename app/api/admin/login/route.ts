import { timingSafeEqual } from "node:crypto";

/**
 * Checks the main admin PIN. The PIN is a server secret (Vercel env ADMIN_PIN),
 * never sent to the browser or stored in the code.
 */

// Simple per-instance brute-force limit: 5 wrong tries per IP, then wait (doubling).
const attempts = new Map<string, { n: number; until: number }>();

function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}

function equal(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function GET() {
  return Response.json({ configured: Boolean(process.env.ADMIN_PIN) });
}

export async function POST(req: Request) {
  const expected = process.env.ADMIN_PIN;
  if (!expected) {
    return Response.json({ ok: false, error: "not-configured" }, { status: 501 });
  }

  const ip = clientIp(req);
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.until > now) {
    return Response.json({ ok: false, error: "too-many", waitSeconds: Math.ceil((rec.until - now) / 1000) }, { status: 429 });
  }

  let pin = "";
  try {
    pin = String(((await req.json()) as { pin?: unknown }).pin ?? "");
  } catch {
    return Response.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  if (pin && equal(pin, expected)) {
    attempts.delete(ip);
    return Response.json({ ok: true, name: process.env.ADMIN_NAME || "Admin" });
  }

  const n = (rec?.n ?? 0) + 1;
  attempts.set(ip, { n, until: n >= 5 ? now + 30_000 * 2 ** Math.min(n - 5, 6) : 0 });
  return Response.json({ ok: false, error: "wrong-pin" }, { status: 401 });
}
