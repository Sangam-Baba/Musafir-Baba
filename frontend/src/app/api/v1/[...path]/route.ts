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

/** The visitor's IP as Vercel sees it (first address of its forwarding headers). */
function visitorIp(req: NextRequest) {
  for (const h of ["x-vercel-forwarded-for", "x-forwarded-for", "x-real-ip"]) {
    const first = req.headers.get(h)?.split(",")[0]?.trim();
    if (first) return first;
  }
  return "";
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
