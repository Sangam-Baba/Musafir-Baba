# Visa Module Extension — Multiple Visa Cards per Country Page

Add a new `visas` array field to the existing Visa schema so that a single visa page (e.g. "Thailand Visa") can contain multiple visa configurations (Tourist, Business, Express, Transit, etc.), each with its own pricing, documents, process steps, and master-data-driven dropdowns.

## User Review Required

> [!IMPORTANT]
> **Zero-risk to existing data**: The entire change is **additive**. No existing fields are removed, renamed, or modified. Old records without the `visas` array will continue to render exactly as they do today. The new `visas` field defaults to `[]` (empty array), so existing documents are unaffected.

> [!IMPORTANT]
> **Old fields kept intact**: The existing top-level `cost`, `duration`, `visaType`, `visaProcessed` fields remain in the schema and the admin forms. They continue to serve as the "legacy" / "headline" values for backward compatibility and for user-facing pages that haven't been migrated yet.

## Open Questions

> [!IMPORTANT]
> **Visa Purpose master data reuse**: Your master data section currently stores "Visa Purpose" under the `visa-type` API endpoint. The new `visaPurpose` dropdown in each visa card will fetch from this same `/master-data/visa-type` endpoint. Is that correct, or would you prefer a separate endpoint?

> [!NOTE]
> **User-facing rendering**: This plan covers the **admin panel** (create/edit forms) and the **backend schema/APIs**. User-facing pages (`/visa/[slug]`) will continue rendering old data as-is. If you want the user-facing pages to also render the new visa cards, that would be a follow-up task — should I include it now?

---

## Proposed Changes

### Backend — Mongoose Schema

#### [MODIFY] [Visa.js](file:///Users/jauhari01/Desktop/personal/Musafir-Baba/backend/src/models/Visa.js)

Add a new `visas` array field to the existing schema. This is purely additive — no existing fields are touched.

```js
// New nested sub-document added AFTER the existing `childUrl` field:
visas: [
  {
    visaPurpose: { type: String },          // from master data
    visaType: { type: String },             // text/select (E-Visa, DAC, etc.)
    governmentFee: { type: Number, default: 0 },
    serviceCharges: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    gstTypeOrPercentageText: { type: String },  // "18%", "Inclusive", etc.
    documents: { type: String },            // rich text HTML
    processSteps: { type: String },         // rich text HTML
    visaValidity: { type: String },         // from master data (formatted label)
    visaDuration: { type: String },         // from master data (formatted label)
    isExpress: { type: Boolean, default: false },
    expressVisaDuration: { type: String },
    expressGovernmentFee: { type: Number, default: 0 },
    expressServiceCharges: { type: Number, default: 0 },
  }
]
```

**Key design decisions:**
- `visaPurpose`, `visaValidity`, `visaDuration` store the **display string** from master data (e.g. "Tourist", "1 Year 0 Months 0 Days"), not ObjectId refs. This avoids coupling and keeps old data safe.
- `documents` and `processSteps` are rich text (HTML string) to support formatting.
- Express fields are always present but only meaningful when `isExpress = true`.

---

### Backend — Controller

#### [MODIFY] [visa.controller.js](file:///Users/jauhari01/Desktop/personal/Musafir-Baba/backend/src/controllers/visa.controller.js)

- **`createVisa`**: Continue accepting existing fields. Also accept optional `visas` array in the body. No validation changes needed since Mongoose handles the sub-document schema.
- **`updateVisa`**: Already uses `req.body` spread, so `visas` array will be saved automatically.
- **`getVisaById`**: Already returns full document — `visas` will be included.
- **`getVisaBySlug`**: Already returns full document — `visas` will be included.
- **No other controller changes needed** — the existing pass-through pattern handles this.

The only change: Relax the `createVisa` required-field check so `cost`, `duration`, `visaType` are not mandatory when `visas` array is provided (since pricing moves into the cards).

---

### Frontend — New UI Component (Switch)

#### [NEW] [switch.tsx](file:///Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/ui/switch.tsx)

Install the Radix Switch primitive and create a shadcn-style Switch component for the Express toggle.

---

### Frontend — Admin Create Visa Page

#### [MODIFY] [page.tsx](file:///Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/app/admin/visa/new/page.tsx)

Add a new **"Visas"** tab to the existing Tabs layout (making it 6 tabs total):

```
Basic Detail | Content | Visas | Media | SEO & Docs | FAQs & Review
```

The "Visas" tab will contain:
1. **"+ Add Visa Card"** button
2. Dynamic list of collapsible visa cards
3. Each card contains all 11 fields + conditional express fields
4. Master data dropdowns fetched via `useQuery` from `/master-data/visa-type`, `/master-data/visa-validity`, `/master-data/visa-duration`
5. `useFieldArray` for managing the `visas` array
6. Rich text editors (`SmallEditor`) for documents and processSteps
7. Card header shows visa purpose/type as summary with collapse/expand + delete button

**Existing tabs remain completely unchanged.**

---

### Frontend — Admin Edit Visa Page

#### [MODIFY] [page.tsx](file:///Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/app/admin/visa/edit/[id]/page.tsx)

Mirror the exact same "Visas" tab from the create page. On load, the `visas` array from the API response populates the form. If old visa records have no `visas` field, it defaults to `[]` and the tab shows "No visa cards added yet."

---

### Frontend — TypeScript Interface

#### [MODIFY] [page.tsx (new)](file:///Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/app/admin/visa/new/page.tsx)

Extend the existing `Visa` interface:

```ts
interface VisaCard {
  visaPurpose: string;
  visaType: string;
  governmentFee: number;
  serviceCharges: number;
  gst: number;
  gstTypeOrPercentageText: string;
  documents: string;
  processSteps: string;
  visaValidity: string;
  visaDuration: string;
  isExpress: boolean;
  expressVisaDuration: string;
  expressGovernmentFee: number;
  expressServiceCharges: number;
}

export interface Visa {
  // ... all existing fields unchanged ...
  visas?: VisaCard[];  // NEW - optional for backward compat
}
```

---

## File Change Summary

| Layer | File | Action | Risk |
|-------|------|--------|------|
| Backend Model | `Visa.js` | Add `visas` array field | ✅ Zero — additive only |
| Backend Controller | `visa.controller.js` | Relax required check | ✅ Minimal — backward compatible |
| Frontend UI | `switch.tsx` | New component | ✅ Zero — new file |
| Frontend Create | `admin/visa/new/page.tsx` | Add "Visas" tab + interface | ✅ Low — existing tabs untouched |
| Frontend Edit | `admin/visa/edit/[id]/page.tsx` | Add "Visas" tab | ✅ Low — existing tabs untouched |

**Files NOT modified:**
- Master data models/routes/controllers (already working)
- User-facing pages (backward compatible, render old data as-is)
- Navigation config
- Any other module

---

## Verification Plan

### Automated Tests
1. Start backend dev server → verify no startup errors
2. Start frontend dev server → verify no compilation errors
3. Create a new visa with visa cards → verify data saves to MongoDB
4. Edit existing visa → verify old fields load correctly AND new visas tab shows empty state
5. Edit visa with visa cards → verify cards load with correct data

### Manual Verification
1. Open existing visa in edit mode → confirm all old fields are intact
2. Add visa cards with express toggle → verify conditional fields show/hide
3. Save and reload → verify persistence
4. Check user-facing `/visa/[slug]` page → confirm it still renders correctly with old data
