# Support replies and ops training — B2B + hotel system

## Support replies (copy, fill in the blanks)

**Booking confirmed but guest says the hotel has no record**
> Hello {name}, thank you for letting us know. Your booking {MBH-ref} is confirmed with {hotel}. We are calling the hotel now and will update you within 30 minutes. Please keep this voucher handy at check-in.

**Refund status**
> Hello {name}, your refund of ₹{amount} for {MBO-ref} was sent on {date}. Card / UPI refunds reach your account in 5–7 working days; wallet refunds (business accounts) appear at once in your wallet statement.

**Price changed at checkout**
> Prices are live and can change while you book. The price you pay is always the one shown on the final step — you were never charged the old price.

**Hotel: when will I be paid?**
> Bookings become ready to pay after the guest checks out. Payouts go out weekly by bank transfer; you can see each payout and its bookings in Business → Payouts, and question any amount there.

**Client: our API key stopped working**
> Please check Business → Developers: the key may have been revoked, rotated more than 24 hours ago, or limited to other IP addresses. Your company's Owner can make a new key. The error code in our answer (`API_KEY_INVALID`, `API_KEY_IP_NOT_ALLOWED`, `API_NOT_ENABLED`) tells which.

**Client: searching is paused**
> Your plan's invoice {S-number} is unpaid, so searching and new bookings are paused (existing bookings are not affected). It switches back on as soon as it is paid — from your wallet or by card in Business → Plan & Billing.

## Ops training (one session each, with the real admin panel on staging)

| Topic | Where | They must be able to |
| --- | --- | --- |
| KYC review | Admin → Verification | Approve / reject with a reason; open documents; know what to check on PAN, GSTIN, bank |
| Listings | Admin → Listings | Approve, request changes, suspend |
| Orders and timelines | Admin → Orders | Find any booking; read its timeline; resend a voucher |
| Change requests and no-shows | Admin → Operations | Answer, resolve, decide a no-show dispute |
| Hotel failures | Admin → Operations | Move or refund a guest |
| Cancellations and refunds | Admin → Finance → Payments | Refund with a reason; follow until done |
| Offline bookings | Admin → Orders → offline | Book for a client who phoned |
| Wallets and credit | Admin → Wallets | Approve a bank-transfer top-up; propose / approve credit (two people) |
| Hotel payouts | Admin → Finance → Hotel payouts | Prepare a run, approve (someone else), bank file, mark paid; answer a statement question |
| GST and reports | Admin → Finance → GST register / Reports | Download the month's register; lock a filed month; run reports |
| System health and alerts | Admin → Finance → System health, `docs/go-live/runbooks/alerts.md` | Say what each alert means and who to call |
