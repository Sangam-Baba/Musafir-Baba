# Module: documents

Booking documents (plan Stage 08 §3.8): **voucher**, **GST tax invoice**, **receipt** — printable HTML pages, kept as
issued (SHA-256), never overwritten.

| | |
| --- | --- |
| **Collections** | `doc_documents`, `doc_number_series` |
| **Public interface** | `index.js` only |
| **Permissions** | `documents.admin.read`, `documents.admin.regenerate` (Finance). Buyers read through their order |

## Rules that never change without an ADR

- Every value is escaped; pages carry no scripts and load nothing from elsewhere; served with a strict
  Content-Security-Policy.
- Invoice numbers come from a gap-free series per registration and financial year (`MB/26-27/000123`, ≤ 16 chars),
  reserved by order in the same update that moves the counter — a retry gets the same number.
- No GSTIN set for MusafirBaba's registration → no tax invoice and no number used (voucher and receipt still issued).
- A document is never changed: a correction is a new version; an invoice keeps its number.
- A failure to issue never fails a booking; the retry job tries again and alerts after 5 minutes.
- Templates live in code (versioned with it); the `doc_templates` collection of the plan is not needed yet.
- Server-side PDF (headless Chrome) is deferred — the browser's "Save as PDF" makes the file.
