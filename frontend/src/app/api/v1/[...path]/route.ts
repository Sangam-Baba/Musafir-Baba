// The website's login relay (owner decision, 18 Nov 2026): the B2B API stays on musafirbabaserver.3mongoose.online,
// a different site from musafirbaba.com, so browsers wouldn't send its strict sign-in cookie. Only the sign-in calls
// come through here, server to server, so the cookie belongs to musafirbaba.com (HttpOnly, SameSite=Strict, path
// /api/v1/auth — the same path on this site). Everything else goes straight to the API with the access token.
// - allow-list only (anything else 404), POST only, small JSON bodies (≤ 64 KB);
// - forwards only our refresh cookie and the headers the API needs; passes back status, body and Set-Cookie;
// - tells the API the visitor's IP (rate limits, activity log) with the shared secret B2B_RELAY_SECRET.
// Server-only settings: B2B_UPSTREAM_URL (e.g. https://musafirbabaserver.3mongoose.online/api/v1) and B2B_RELAY_SECRET.
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED = /^(auth\/[a-z0-9-]+(\/[a-z0-9-]+)*|registrations\/hotel|invitations\/accept)$/;
const MAX_BODY = 64 * 1024;
const COOKIE = "b2b_refresh";

const upstream = () => (process.env.B2B_UPSTREAM_URL ?? process.env.NEXT_PUBLIC_B2B_API_URL ?? "").replace(/\/$/, "");

// musafirbaba.com is served through Cloudflare, so Vercel sees a Cloudflare edge address; the visitor's own address is
// in Cloudflare's `cf-connecting-ip`. It is believed only when the address connecting to Vercel really is Cloudflare's
// (published ranges, https://www.cloudflare.com/ips/) — a direct call to the Vercel address can't fake it.
const CF_V4 = ["173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13", "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22"];
const CF_V6 = ["2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32", "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32"];

function v4(ip: string): number | null {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((p[0]! << 24) >>> 0) + (p[1]! << 16) + (p[2]! << 8) + p[3]!;
}
function inV4(ip: string, cidr: string) {
  const [base = "", bits = "32"] = cidr.split("/");
  const a = v4(ip);
  const b = v4(base);
  if (a === null || b === null) return false;
  const n = Number(bits);
  const mask = n === 0 ? 0 : (0xffffffff << (32 - n)) >>> 0;
  return ((a & mask) >>> 0) === ((b & mask) >>> 0);
}
function v6(ip: string): bigint | null {
  const halves = ip.split("::");
  if (halves.length > 2 || ip.includes(".")) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const parts = [...head, ...Array<string>(Math.max(fill, 0)).fill("0"), ...tail];
  if (parts.length !== 8) return null;
  let n = BigInt(0);
  for (const p of parts) {
    if (!/^[0-9a-f]{1,4}$/i.test(p)) return null;
    n = n * BigInt(65536) + BigInt(parseInt(p, 16));
  }
  return n;
}
function inV6(ip: string, cidr: string) {
  const [base = "", bits = "128"] = cidr.split("/");
  const a = v6(ip);
  const b = v6(base);
  if (a === null || b === null) return false;
  const shift = BigInt(128 - Number(bits));
  return a >> shift === b >> shift;
}
const viaCloudflare = (ip: string) => (ip.includes(":") ? CF_V6.some((c) => inV6(ip, c)) : CF_V4.some((c) => inV4(ip, c)));

/** The visitor's IP: Cloudflare's `cf-connecting-ip` when the request came through Cloudflare, else what Vercel saw. */
function visitorIp(req: NextRequest) {
  let edge = "";
  for (const h of ["x-vercel-forwarded-for", "x-forwarded-for", "x-real-ip"]) {
    const first = req.headers.get(h)?.split(",")[0]?.trim();
    if (first) {
      edge = first;
      break;
    }
  }
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  return edge && cf && viaCloudflare(edge) ? cf : edge;
}

/** The shared secret, without stray spaces or line breaks from pasting it into a settings form. */
const relaySecret = () => (process.env.B2B_RELAY_SECRET ?? "").trim();

const problem = (status: number, code: string, title: string) =>
  NextResponse.json({ type: "about:blank", status, code, title }, { status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" } });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/v1/[...path]">) {
  const path = (await ctx.params).path.join("/");
  const base = upstream();
  if (!ALLOWED.test(path)) return problem(404, "ROUTE_NOT_FOUND", "Not found");
  if (!base) return problem(503, "RELAY_NOT_CONFIGURED", "The sign-in relay isn't set up");
  const body = await req.text();
  if (body.length > MAX_BODY) return problem(413, "BODY_TOO_LARGE", "Request too large");

  const headers: Record<string, string> = { Accept: "application/json" };
  for (const h of ["content-type", "authorization", "x-b2b-auth", "user-agent"]) {
    const v = req.headers.get(h);
    if (v) headers[h] = v;
  }
  const refresh = req.cookies.get(COOKIE)?.value;
  if (refresh) headers.cookie = `${COOKIE}=${refresh}`;
  const ip = visitorIp(req);
  const secret = relaySecret();
  if (ip && secret) {
    headers["x-b2b-client-ip"] = ip;
    headers["x-b2b-relay-key"] = secret;
  }

  let res: Response;
  try {
    res = await fetch(`${base}/${path}${req.nextUrl.search}`, { method: "POST", headers, body: body || undefined, redirect: "manual", cache: "no-store" });
  } catch {
    return problem(502, "UPSTREAM_UNREACHABLE", "Can't reach the server");
  }
  const out = new NextResponse(res.status === 204 ? null : await res.text(), { status: res.status });
  out.headers.set("Content-Type", res.headers.get("content-type") ?? "application/json");
  out.headers.set("Cache-Control", "no-store");
  // whether this deployment has the secret and sees the visitor's IP — yes / no only, never the values
  out.headers.set("x-b2b-relay", `secret=${secret ? "yes" : "no"}; ip=${ip ? "yes" : "no"}`);
  for (const c of res.headers.getSetCookie()) out.headers.append("Set-Cookie", c);
  return out;
}
