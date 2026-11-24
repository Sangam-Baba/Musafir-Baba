"use client";
// API guides for client developers (Stage 14): quick start, keys, idempotency, price tokens and price check, the
// booking lifecycle, errors, limits, and webhooks with signature checks in Node, PHP, Python and Java. Public page —
// no sign-in needed. The full endpoint list is the OpenAPI file served by the API.
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { B2B_API } from "@/b2b/api";

const API = "https://musafirbabaserver.3mongoose.online/api/v1";

const VERIFY: Record<string, string> = {
  "Node.js": `import crypto from "node:crypto";

// rawBody: the request body exactly as received (a string / Buffer, before JSON.parse)
export function verify(header, rawBody, secret, toleranceSec = 300) {
  const items = header.split(",").map((p) => p.trim().split("="));
  const t = Number(items.find(([k]) => k === "t")?.[1]);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const want = crypto.createHmac("sha256", secret).update(\`\${t}.\${rawBody}\`).digest();
  return items.filter(([k]) => k === "v1").some(([, v]) => {
    const got = Buffer.from(v ?? "", "hex");
    return got.length === want.length && crypto.timingSafeEqual(got, want);
  });
}`,
  PHP: `function mb_verify(string $header, string $rawBody, string $secret, int $tolerance = 300): bool {
    $t = 0; $sigs = [];
    foreach (explode(',', $header) as $part) {
        [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
        if ($k === 't') $t = (int) $v;
        if ($k === 'v1') $sigs[] = $v;
    }
    if ($t === 0 || abs(time() - $t) > $tolerance) return false;
    $want = hash_hmac('sha256', $t . '.' . $rawBody, $secret);
    foreach ($sigs as $s) if (hash_equals($want, $s)) return true;
    return false;
}
// $ok = mb_verify($_SERVER['HTTP_MB_SIGNATURE'], file_get_contents('php://input'), $secret);`,
  Python: `import hashlib, hmac, time

def verify(header: str, raw_body: bytes, secret: str, tolerance: int = 300) -> bool:
    items = [p.strip().split("=", 1) for p in header.split(",")]
    t = next((int(v) for k, v in items if k == "t"), 0)
    if not t or abs(time.time() - t) > tolerance:
        return False
    want = hmac.new(secret.encode(), f"{t}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(want, v) for k, v in items if k == "v1")`,
  Java: `import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

static boolean verify(String header, String rawBody, String secret) throws Exception {
    long t = 0; java.util.List<String> sigs = new java.util.ArrayList<>();
    for (String part : header.split(",")) {
        String[] kv = part.trim().split("=", 2);
        if (kv.length < 2) continue;
        if (kv[0].equals("t")) t = Long.parseLong(kv[1]);
        if (kv[0].equals("v1")) sigs.add(kv[1]);
    }
    if (t == 0 || Math.abs(System.currentTimeMillis() / 1000 - t) > 300) return false;
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    byte[] want = mac.doFinal((t + "." + rawBody).getBytes(StandardCharsets.UTF_8));
    for (String s : sigs) if (MessageDigest.isEqual(want, HexFormat.of().parseHex(s))) return true;
    return false;
}`,
};

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-[12px] leading-relaxed text-slate-100"><code>{children}</code></pre>;
}
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

const TOC = [
  ["start", "Quick start: book in 15 minutes"],
  ["auth", "API keys"],
  ["idempotency", "Retrying safely (Idempotency-Key)"],
  ["prices", "Price tokens and price check"],
  ["lifecycle", "Booking lifecycle and cancelling"],
  ["errors", "Errors"],
  ["limits", "Limits and usage"],
  ["webhooks", "Webhooks"],
] as const;

function VerifyTabs() {
  const [lang, setLang] = useState("Node.js");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {Object.keys(VERIFY).map((l) => (
          <button key={l} onClick={() => setLang(l)} className={`rounded-full border px-3 py-0.5 text-[12px] ${lang === l ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 text-slate-600"}`}>{l}</button>
        ))}
      </div>
      <Code>{VERIFY[lang] ?? ""}</Code>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
      <nav className="mb-6 space-y-1 text-[13px] lg:sticky lg:top-6 lg:mb-0 lg:self-start">
        <p className="mb-2 font-semibold text-slate-900">MusafirBaba API</p>
        {TOC.map(([id, label]) => <a key={id} href={`#${id}`} className="block text-slate-600 hover:text-[#FE5300]">{label}</a>)}
        <a href={`${B2B_API}/openapi.json`} className="mt-3 block font-medium text-[#FE5300]">OpenAPI file (all endpoints) →</a>
        <Link href="/business/developers" className="block text-slate-600 hover:text-[#FE5300]">Your keys and webhooks →</Link>
      </nav>
      <main className="space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Connect your software to MusafirBaba</h1>
          <p className="text-[14px] text-slate-600">Search hotels, book, pay from your wallet and cancel — the same B2B prices and rules as your dashboard, from your own system. Base address: <code>{API}</code>. Amounts are whole paise (₹1 = 100). Dates are <code>YYYY-MM-DD</code>.</p>
        </header>

        <Section id="start" title="Quick start: book in 15 minutes">
          <p>1. Your company&apos;s Owner creates a key in <b>Business → Developers</b> with <code>hotel:search</code> and <code>hotel:book</code>. Copy it — it is shown once.</p>
          <p>2. Search, get offers, check the price, book, pay:</p>
          <Code>{`KEY="mb_live_XXXXXXXX_..."
curl -s ${API}/hotels/search -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{"destination":{"type":"CITY","id":"<cityId>"},"checkIn":"2026-12-20","checkOut":"2026-12-22","rooms":[{"adults":2}]}'

curl -s ${API}/hotels/<hotelRef>/offers -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{"checkIn":"2026-12-20","checkOut":"2026-12-22","rooms":[{"adults":2}]}'
# → offers[].priceToken

curl -s ${API}/hotels/offers/price-check -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{"priceToken":"<priceToken>"}'          # status OK → book

curl -s ${API}/client/orders -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -H "Idempotency-Key: booking-7f3a9c21e4b84d10" \\
  -d '{"priceToken":"<priceToken>","rooms":[{"leadGuest":"Asha Verma"}],"contact":{"name":"Asha Verma","email":"asha@example.com","phone":"+919800000000"},"customerReference":"YOUR-123"}'
# → { ref: "MBO-…", status: "HELD", … }

curl -s ${API}/client/orders/MBO-XXXXXXXX/pay -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -H "Idempotency-Key: pay-7f3a9c21e4b84d10" -d '{"method":"WALLET"}'
# → CONFIRMED (and a booking.confirmed webhook)`}</Code>
        </Section>

        <Section id="auth" title="API keys">
          <p>Send the key on every call: <code>Authorization: Bearer mb_live_&lt;prefix&gt;_&lt;secret&gt;</code>. A key acts for the person who created it, limited to the permissions picked for it:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><code>hotel:search</code> — search, offers, price check</li>
            <li><code>hotel:book</code> — book, pay, cancel, change requests</li>
            <li><code>orders:read</code> — orders and bookings</li>
            <li><code>wallet:read</code> — wallet balance</li>
            <li><code>webhooks:manage</code> — webhook addresses</li>
          </ul>
          <p>Keep keys on your server, never in a browser or app. Limit a key to your servers&apos; IP addresses. You can have 2 keys: to change a key, <b>Rotate</b> it — you get a new one and the old one keeps working for 24 hours. <b>Revoke</b> stops a key within 5 seconds. If the person who made it leaves your company, the key stops too. Test keys (<code>mb_test_…</code>) only work on our test server; live keys only on the live one.</p>
        </Section>

        <Section id="idempotency" title="Retrying safely (Idempotency-Key)">
          <p>Booking, paying and cancelling need an <code>Idempotency-Key</code> header (16–64 letters, digits, <code>-</code> or <code>_</code>). If the network fails, send the same request again with the <b>same key and body</b>: you get the first answer back, never a second booking or charge. Use a new key for a new action.</p>
        </Section>

        <Section id="prices" title="Price tokens and price check">
          <p>Each offer has a <code>priceToken</code> — our signed price for that room, stay and guests, valid about 15 minutes. Book with the token; we never take a price from your request. Before booking, <code>POST /hotels/offers/price-check</code> tells you <code>OK</code>, <code>PRICE_CHANGED</code> (with the new price — show it to your customer) or <code>SOLD_OUT</code>.</p>
        </Section>

        <Section id="lifecycle" title="Booking lifecycle and cancelling">
          <p><b>HELD</b> (rooms kept for you, pay before the hold ends) → <b>CONFIRMED</b> (paid from your wallet or credit) → <b>COMPLETED</b> after check-out. It can also become <b>CANCELLED</b>, <b>EXPIRED</b> (not paid in time, rooms released) or <b>HOTEL_FAILED</b> (we will contact you and refund or move the guest).</p>
          <p>To cancel: <code>POST /bookings/hotels/&#123;ref&#125;/cancellation-quote</code> shows the charge and refund under the cancellation policy, with a <code>quoteToken</code> valid 5 minutes; then <code>POST /bookings/hotels/&#123;ref&#125;/cancel</code> with that token and an Idempotency-Key. Refunds go back to your wallet.</p>
        </Section>

        <Section id="errors" title="Errors">
          <p>Errors are JSON (<code>application/problem+json</code>). Act on <code>code</code>; show <code>title</code> to people; quote <code>requestId</code> when you contact us.</p>
          <Code>{`HTTP/1.1 409 Conflict
{ "type": "https://musafirbaba.com/problems/price-changed", "title": "…", "status": 409, "code": "PRICE_CHANGED", "requestId": "…" }`}</Code>
          <p>Common codes: <code>API_KEY_INVALID</code> (401), <code>API_KEY_IP_NOT_ALLOWED</code> (403), <code>FORBIDDEN</code> (403, the key lacks a scope), <code>RATE_LIMITED</code> (429, see <code>Retry-After</code>), <code>QUOTA_EXCEEDED</code> (429, plan limit), <code>INSUFFICIENT_WALLET_BALANCE</code>, <code>CREDIT_OVERDUE</code>, <code>PRICE_TOKEN_EXPIRED</code>, <code>SOLD_OUT</code>, <code>PRICE_CHANGED</code>.</p>
        </Section>

        <Section id="limits" title="Limits and usage">
          <p>Up to 600 calls a minute per key (more on request). Searches, offers, price checks and bookings count towards your plan, in the same monthly allowance as your dashboard; you can see the calls of each key in <b>Business → Usage</b>. Don&apos;t poll for status — use webhooks.</p>
        </Section>

        <Section id="webhooks" title="Webhooks">
          <p>Add an HTTPS address in <b>Business → Developers → Webhooks</b> and pick events: <code>booking.confirmed</code>, <code>booking.cancelled</code>, <code>booking.hotel_failed</code>, <code>booking.amended</code>, <code>payment.succeeded</code>, <code>refund.processed</code>, <code>wallet.low_balance</code>, <code>quota.threshold_reached</code>. We POST JSON:</p>
          <Code>{`MB-Signature: t=1764000000,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
MB-Event-Id: evt_3f1c…
{ "id": "evt_3f1c…", "type": "booking.confirmed", "apiVersion": "2026-11-24", "createdAt": "2026-11-24T06:30:00.000Z",
  "data": { "orderRef": "MBO-…", "bookingRefs": ["MBH-…"], "status": "CONFIRMED" } }`}</Code>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Check the signature</b> with your address&apos;s secret (shown once). Reject anything older than 5 minutes. During a secret change the header carries two <code>v1</code> values for 24 hours — accept either.</li>
            <li>Answer <b>2xx within 10 seconds</b>; do the work afterwards. We retry after 1 min, 5 min, 15 min, 1 h, 3 h, 6 h and 12 h. An address failing for 24 hours is switched off and your Owner is emailed.</li>
            <li>The same event can arrive twice and not always in order — <b>ignore an <code>id</code> you have already handled</b>, and fetch the order for its latest state.</li>
            <li>Missed something? Use <b>Send again</b> in the delivery log (same event id), or <b>Send test</b> to try your code.</li>
          </ul>
          <VerifyTabs />
        </Section>
      </main>
    </div>
  );
}
