// "How it works" — the B2B + hotel system explained with one worked example (real default numbers: ₹150 / ₹250 per
// night margin, 5 % GST up to ₹7,500 a night). Used by the admin guide (all sections) and the business area (what a
// hotel or client needs). Plain text — no data is loaded.
import type { ReactNode } from "react";

type Audience = "admin" | "business";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-[16px] font-semibold text-slate-900">{title}</h2>
      <div className="space-y-2 text-[14px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="bg-slate-50 text-left text-slate-500"><tr>{head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-3 py-2 align-top">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
const Step = ({ n, who, where, children }: { n: number; who: string; where: string; children: ReactNode }) => (
  <li className="flex gap-3">
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FE5300] text-[12px] font-semibold text-white">{n}</span>
    <span>
      <span className="font-medium text-slate-900">{children}</span>
      <span className="block text-[12px] text-slate-500">{who} · {where}</span>
    </span>
  </li>
);

export function HowItWorks({ audience }: { audience: Audience }) {
  const admin = audience === "admin";
  return (
    <div className="space-y-4">
      <Section title="The idea in one line">
        <p>Hotels sell rooms to MusafirBaba at a <b>net price</b>; MusafirBaba sells them on — to <b>website customers</b> and to <b>B2B clients</b> (travel agents, companies) — adding its <b>margin</b> and <b>GST</b>; after the stay MusafirBaba pays the hotel its net price.</p>
      </Section>

      <Section title="Who is who">
        <Table
          head={["Who", "What they do", "Where"]}
          rows={[
            ["Hotel (partner)", "Registers, passes KYC, lists properties, sets rooms and net prices, confirms bookings, gets paid weekly", "Business area — Properties, Rooms & rates, Bookings, Statement, Payouts"],
            ["B2B client (travel agent / company)", "Registers, passes KYC, searches at B2B prices, books with its wallet or credit, can add its own markup, its own logo on vouchers, connect its software (API)", "Business area — Search Hotels, My Bookings, Wallet, Plan, Reports, Developers"],
            ["Website customer", "Searches and books hotels on musafirbaba.com, pays by PayU", "Website — /hotels"],
            ["MusafirBaba staff", "Verify partners, approve listings, set margins and GST, handle bookings and problems, pay hotels, file GST", "Admin → B2B admin (Partners · Services · Control)"],
          ]}
        />
      </Section>

      <Section title="A worked example — from sign-up to payout">
        <p className="text-[13px] text-slate-500">Sea Breeze Hotel (Goa) and Wanderlust Travels (a travel agency). One Deluxe room, one night.</p>
        <ol className="space-y-3">
          <Step n={1} who="Hotel" where="musafirbaba.com/business → Register as a hotel">Sea Breeze registers, uploads PAN / GST / bank details and submits KYC.</Step>
          <Step n={2} who="MusafirBaba staff" where="Admin → Partners → Verification">Staff check the documents and approve. The hotel can now list.</Step>
          <Step n={3} who="Hotel" where="Business → My Properties → Rooms & rates">Sea Breeze adds “Deluxe” at a <b>net price of ₹4,500</b> a night, 10 rooms for the next 90 days, free cancellation up to 2 days before.</Step>
          <Step n={4} who="MusafirBaba staff" where="Admin → Partners → Hotel listings">Staff approve the listing — it goes live for B2B clients (and the website if allowed).</Step>
          <Step n={5} who="B2B client" where="Business → Register as a client → KYC">Wanderlust Travels registers and is verified (Admin → Partners → Verification also handles clients). It tops up its wallet with ₹50,000 by PayU or bank transfer (Admin → Services → Wallets & credit approves bank transfers).</Step>
          <Step n={6} who="B2B client" where="Business → Search Hotels → Goa">Wanderlust searches Goa and sees Sea Breeze at <b>₹4,882.50</b> (see the price breakdown below). It has set a 10 % markup, so it also sees its own selling price, ₹5,347.50, to quote its customer.</Step>
          <Step n={7} who="B2B client" where="Hotel page → Book">It books for its guest. The room is held, ₹4,882.50 is taken from the wallet, the booking is <b>CONFIRMED</b>; a voucher (with Wanderlust’s own logo), tax invoice and receipt are made.</Step>
          <Step n={8} who="Hotel" where="Business → Bookings (bell + email)">Sea Breeze is alerted and acknowledges the booking (if it doesn’t within 15 / 30 / 60 minutes, it is reminded, its owners are told, then MusafirBaba ops call).</Step>
          <Step n={9} who="Guest / hotel" where="—">The guest stays. After check-out the booking is <b>COMPLETED</b> and ₹4,500 becomes <b>ready to pay</b> to the hotel.</Step>
          <Step n={10} who="MusafirBaba finance (two people)" where="Admin → Control → Finance → Hotel payouts">The weekly payout run: one person prepares it, another approves; 1 % TDS (if the CA sets it) is deducted → <b>₹4,455</b> goes by bank transfer; the hotel sees it in Business → Payouts.</Step>
          <Step n={11} who="MusafirBaba finance" where="Admin → Control → Finance → GST register">The tax invoice appears in the month’s GST register; after filing the return the month is locked.</Step>
        </ol>
      </Section>

      <Section title="Where the money goes (one night, Deluxe, ₹4,500 net)">
        <Table
          head={["", "B2B client", "Website customer"]}
          rows={[
            ["Hotel’s net price", "₹4,500.00", "₹4,500.00"],
            ["MusafirBaba margin (default, per night)", "+ ₹150.00", "+ ₹250.00"],
            ["Price before tax", "₹4,650.00", "₹4,750.00"],
            ["GST 5 % (rooms up to ₹7,500 a night; 18 % above)", "+ ₹232.50", "+ ₹237.50"],
            [<b key="t">Customer pays</b>, <b key="b">₹4,882.50</b>, <b key="w">₹4,987.50</b>],
            ["Client’s own markup (10 %, optional — the client keeps it)", "₹465.00 → quotes ₹5,347.50", "—"],
            ["Hotel is paid (after the stay, minus TDS if set)", "₹4,500.00 (₹4,455 after 1 % TDS)", "₹4,500.00"],
          ]}
        />
        <p className="text-[13px] text-slate-500">Margins are rules in Admin → Services → Pricing (per channel, client category, city, hotel, dates); a change needs a second admin to approve. GST rates come from the CA.</p>
      </Section>

      <Section title="After the booking">
        <Table
          head={["What happens", "How it works", "Where"]}
          rows={[
            ["Cancel", "The client asks for a quote (charge and refund under the policy, valid 5 minutes), then cancels; the rooms go back; the refund goes to the wallet (website: to the card / UPI); a credit note is made", "Business → My Bookings · Admin → Services → Operations"],
            ["Change (dates, guests)", "A change request goes to MusafirBaba ops, who arrange it with the hotel", "Admin → Services → Operations"],
            ["No-show", "The hotel marks it; the client can dispute within 72 hours; ops decide", "Admin → Services → Operations"],
            ["Hotel can’t honour it", "The hotel raises a failure; ops move the guest or refund", "Admin → Services → Operations"],
            ["Client phones in a booking", "Staff book on the client’s behalf (offline booking), same prices and wallet", "Admin → Services → Orders"],
            ["Client asks us to arrange a stay", "A booking request; staff confirm it with a hotel confirmation number", "Admin → Services → Booking requests"],
          ]}
        />
      </Section>

      <Section title="Plans, usage and the API (for B2B clients)">
        <p><b>Usage</b>: every search, room-price look-up, price check and booking a client makes is counted (Business → Usage).</p>
        <p><b>Plans</b> (when switched on): e.g. Plan A ₹2,999 a month for 4,000 searches (stops at the limit), Plan B ₹3,499 for 5,000 then ₹1 each — numbers are placeholders until the owner confirms them. Plan invoices (+18 % GST) are paid from the wallet; unpaid for 10 days → searching pauses (bookings already made are not affected).</p>
        <p><b>API</b> (when switched on): a client’s Owner creates a key in Business → Developers; their own software then searches, books and cancels at the same prices, counted in the same plan; booking updates are sent to their server (webhooks), signed. Guide: /business/developers/docs.</p>
      </Section>

      {admin && (
        <Section title="Where things are in admin">
          <Table
            head={["Area", "Use it for"]}
            rows={[
              [<b key="p">Partners</b>, "Hotels and clients we work with: verification (KYC), hotel listings, companies (suspend / categories), their people, activity"],
              [<b key="s">Services</b>, "What we provide: orders, operations (cancellations, changes, no-shows, hotel failures), booking requests, pricing (margins, GST), catalogue lists, client wallets & credit, plans, usage"],
              [<b key="c">Control</b>, "Our back office: finance (ledger, PayU payments and refunds, reconciliation, hotel payouts, GST register, reports, system health), privacy (data requests), staff access"],
            ]}
          />
        </Section>
      )}

      {admin && (
        <Section title="What is switched on">
          <Table
            head={["Switch (server setting)", "When on"]}
            rows={[
              [<code key="1">B2B_ENABLED</code>, "The whole B2B + hotel system (on)"],
              [<code key="2">B2B_ORDERS_ENABLED</code>, "Online booking (website and B2B)"],
              [<code key="3">B2B_WALLET_ENABLED</code>, "Client wallets and credit"],
              [<code key="4">B2B_BILLING_ENABLED</code>, "Plans, plan invoices, limits"],
              [<code key="5">B2B_API_ENABLED</code>, "API keys and webhooks"],
              [<code key="6">B2B_PILOT_ORGS</code>, "Only the listed client companies get the switched-on features (gradual launch)"],
              [<code key="7">NEXT_PUBLIC_FEATURE_HOTEL_BOOKING</code>, "Hotel booking on musafirbaba.com (website)"],
            ]}
          />
          <p className="text-[13px] text-slate-500">Runbooks for problems, the go-live checklist and the disaster-recovery drill: <code>docs/go-live/runbooks/</code>.</p>
        </Section>
      )}
    </div>
  );
}
