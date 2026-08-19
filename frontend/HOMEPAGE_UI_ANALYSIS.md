# Homepage UI & Functionality Analysis (`/`)

Scope: `src/app/(user)/page.tsx` rendered inside `src/app/(user)/layout.tsx`, at `http://localhost:3000/`. Purpose: a complete, traceable inventory of every section/component so the upcoming UI redesign can proceed with **zero risk to existing logic**. No code was changed while producing this document.

---

## 1. Render tree, top to bottom

```
UserLayout (layout.tsx)                         ← SHARED across every (user) page
 ├─ GTMInjector                                  [deferred GTM script]
 ├─ RootProvider (QueryProvider)
 │   ├─ Header                                   [nav, search modal, contact bar]
 │   ├─ <main>
 │   │   └─ HomePage (page.tsx)                  ← HOME-ONLY, starts here
 │   │       ├─ Hero banner (inline JSX, not a component)
 │   │       ├─ VisaHome                         (Suspense)
 │   │       ├─ FeaturedTourSSG                  (Suspense)
 │   │       ├─ DestinationSection
 │   │       ├─ WhyChoose → WhyChooseUS
 │   │       ├─ LazyTestimonial → Testimonial
 │   │       ├─ SectionFive → LazyQueryFormInView → LazyQueryForm
 │   │       ├─ BlogsHome                        (Suspense)
 │   │       ├─ Partners
 │   │       ├─ Faqs
 │   │       ├─ Newslatter
 │   │       └─ LoginAutoOpen                    (Suspense, renders null)
 │   ├─ QueryDailogBox                           [floating "Enquire" button]
 │   ├─ WhatsAppButton                           [desktop-only]
 │   ├─ MobileBottom                             [mobile-only bottom bar]
 │   └─ FloatingButton                           [chatbot widget]
 ├─ LazyAuthDialog                                [login/signup modal, global]
 ├─ Footer
 ├─ Toaster                                       [sonner toasts]
 └─ GTMProvider                                   [pageview tracking on route change]
```

**Key implication for the redesign:** only the middle block (`HomePage`) is home-specific. Header, Footer, WhatsApp button, mobile bottom bar, query dialog, chatbot, auth dialog, and both GTM providers are rendered by the shared layout and appear on **every** page of the site. Any visual change to those is a sitewide change, not a homepage change — treat them as a separate, higher-blast-radius work item.

---

## 2. Home-only sections (in page order)

### 2.1 Hero banner — inline JSX in `page.tsx`, not a separate component
- Full-bleed background image (`/homebannertest1.avif`), `h-[calc(100vh-130px)]`.
- Badge pill ("India's Trusted Travel Partner") with custom CSS keyframe animations injected via a `<style dangerouslySetInnerHTML>` block (blink + breathe effects) — these keyframes are inline in the page, not in `globals.css`, so a redesign that removes this section should also remove the associated `<style>` block or it becomes orphaned dead CSS.
- H1 + subcopy, static text.
- `HeroSearchBox` (client component) — service-type dropdown (All Services / Tour Packages / Visa / Rental Services) + Search button. Purely client-side `useState` + `router.push(selected)`; no API call, no validation.
- 6 filter pills (Mountain treks, Honeymoon, Religious tours, Weekend trips, Family Tours, Group Tour) — static `Link`s to `/holidays/{slug}`. "Religious tours" is hardcoded as the visually "active" pill regardless of real state — likely leftover/placeholder logic worth deciding on.
- Bottom stats banner: 4 stat blocks (24,247 happy travellers / 4.8 Google rating / 500+ tour packages / 180+ visa countries) — all hardcoded numbers, not fed by any API.

### 2.2 `VisaHome` — "Popular visa services"
- Server component, async. Fetches `GET {BASE_URL}/visa/?country=` (ISR revalidate 3600s), cross-referenced against a hardcoded 12-country list + icon map.
- Renders a grid of country cards + CTA banner with a WhatsApp deep link (`getWhatsAppLink()` from `@/config/contact`).
- Embeds `PopupQueryForm` (client, lead-capture modal) — **this modal is also used on `about-us`**, so its internals are shared.

### 2.3 `FeaturedTourSSG` — tour package tabs/carousel
- Server component, async. 5 parallel fetches to `GET {BASE_URL}/packages/category/{slug}?limit=12&minimal=true` for `early-bird`, `weekend-getaways`, `backpacking-trips`, `religious-tours`, `mountain-treks` (revalidate 60s, cache tag `packages`).
- Renders `FeaturedTour`, used only here.

### 2.4 `DestinationSection` — "Top destinations" toggle grid
- Client component. `useState` toggles Domestic vs International, animated sliding pill indicator.
- Fully hardcoded destination lists (Domestic: Uttarakhand, Rajasthan, Kerala, Meghalaya, Himachal Pradesh, Kashmir; International: Singapore, Dubai, Bali, Thailand, Japan, Maldives). Images mix local `next/image` static imports and raw Cloudinary/CDN URL strings — inconsistent pattern, worth normalizing in the redesign.
- Markup is duplicated 4× (desktop/mobile × domestic/international) — a good simplification target, but purely a code-structure note, not a functional risk.
- Home-only, no reuse elsewhere.

### 2.5 `WhyChoose` → `WhyChooseUS`
- `WhyChoose` (home-only wrapper, just a heading) renders `WhyChooseUS`.
- **`WhyChooseUS` itself is also used on the rental detail page** (`rental/[vehicleType]/[destination]/[slug]/pageClient.tsx`). Restyling its internals affects that page too.

### 2.6 `LazyTestimonial` (from `LazyCarousels.tsx`) → `Testimonial`
- Fed by a hardcoded `testi` array (5 reviews) defined at the top of `page.tsx`.
- **`Testimonial` is one of the most widely reused components on the site**: about-us, holiday package/detail pages (`SlugClients.tsx`, customised-tour pages), visa detail page, travel-agency page, itinerary templates, and the admin webpage builder. Redesigning its visual API (props, card layout) requires auditing every one of those call sites.
- Note: `page.tsx` also imports `LazyVideoSection` and `LazyImageGallery` from the same barrel file but **never renders them on the homepage** — dead imports (see §4).

### 2.7 `SectionFive` — "Get a free quote" split section
- Server component, static marketing copy + image, embeds `LazyQueryFormInView` → `LazyQueryForm`.
- **`LazyQueryForm` is the site's core lead-capture form**, also used by `QueryDailogBox` and `MobileBottom` (both layout-level, sitewide) and by `PopupQueryForm` (used in `VisaHome` and `about-us`). This is the highest-blast-radius shared component touched by the homepage — any change to its fields/validation/submit behavior ripples across the entire site's enquiry funnel.

### 2.8 `BlogsHome` — "Latest travel trends"
- Server component, async. `GET {BASE_URL}/dashboard/combined-news-blog` (revalidate 360s). Returns `null` if the API returns an empty array (silent empty state — no "no posts" UI).
- **Also directly used on `about-us/page.tsx`** — same component, so any layout change appears there too.

### 2.9 `Partners` — trusted-partner logo strip
- Server component. Fully hardcoded array of 12 partner logos (VFS Global, Paytm, MakeMyTrip, EaseMyTrip, IndiGo, Goibibo, PayU, RedBus, Air India, SpiceJet, Akasa Air, Vistara) served from `cdn.musafirbaba.com`. Home-only.

### 2.10 `Faqs`
- Client component, 2-column accordion (shadcn `Accordion`), fed by a hardcoded 6-item `faqs` array defined in `page.tsx`. Renders answers as HTML via `BlogContent` (no XSS risk today since content is hardcoded, but flag if answers ever become CMS-editable).
- **Reused sitewide**: destinations page, holidays category/detail pages, travel-agency page, membership page, plus its own FAQ JSON-LD schema helper. Only the *content* passed in is home-specific — the component itself is a shared primitive.

### 2.11 `Newslatter` (sic — filename has a typo)
- Client component. `POST {BASE_URL}/newsletter` with `{email}`. Success toast via `sonner`; **failure path only logs to console, no user-facing error toast** — a real UX gap, not just cosmetic, worth fixing alongside any redesign. Solid `#FE5300` background band. Home-only.

### 2.12 `LoginAutoOpen`
- Renders nothing visually (`return null`). Watches `?auth=login` in the URL and opens the shared login dialog (`useAuthDialogStore`, the same store `LazyAuthDialog` in the layout reads). Functional glue only — don't remove without checking the post-login-redirect flow.

---

## 3. SEO / structured data (no visual footprint)

`page.tsx` injects three JSON-LD `<Script>` blocks at the bottom: `getOrganizationSchema()`, `getLocalSchema()`, `getBreadcrumbSchema("/")` from `src/lib/schema/*.ts`. Purely static SEO metadata — safe to leave completely untouched during a visual redesign.

---

## 4. Dead code / already-disabled features found on the homepage

These currently have **zero effect on what's rendered** — decide per-item whether to delete, revive, or leave alone before the redesign touches this area, so nobody spends time "fixing" something that was already intentionally off:

| Item | Status |
|---|---|
| `SecondSectionServer` | Imported in `page.tsx`, never rendered anywhere in the JSX. Not used on any other page either. Fully dead. |
| `SevenSection` | Imported, never rendered on the homepage. Contains ~150 lines of commented-out legacy carousel code referencing a removed API (`getBestSeller`). |
| `LazyVideoSection`, `LazyImageGallery` | Imported from `LazyCarousels.tsx` in `page.tsx`, never actually rendered (only `LazyTestimonial` from that same barrel is used). Both underlying components (`VideoSection`, `ImageGallery`) *are* used elsewhere (holidays pages), so don't delete the source files — just note the home page doesn't currently use them. |
| `PopupBanner` | Disabled twice over: the JSX call is commented out in `page.tsx` (`{/* <PopupBanner /> */}`), **and** the component's own body starts with a hardcoded `return null;` before its hooks/fetch/Dialog logic — so even if someone uncomments the JSX call, nothing will show up until that early return is also removed. |
| "Religious tours" filter pill | Hardcoded as the visually "active" pill in the hero, independent of any real selection state. |

---

## 5. Shared/layout-level components (rendered on every page, not just home)

Touching these is a **sitewide** change — flagging separately from the homepage-only work above so scope stays clear:

- `Header` (nav, search modal, contact bar, mobile sidebar) — includes a static "Pay Now" link to a hardcoded PayU invoice URL, worth double-checking it's still valid.
- `Footer`
- `WhatsappButton` (desktop only)
- `MobileBottom` (mobile bottom nav, opens `LazyQueryForm`)
- `QueryDailogBox` (floating "Enquire Now" button, desktop only, opens `LazyQueryForm`)
- `FloatingButton` (chatbot) — **defaults to open (`useState(true)`) on every page load**, i.e. the chat widget pops open automatically on first visit to any page including home; worth a deliberate UX decision during redesign, not just a visual tweak.
- `LazyAuthDialog` (login/signup modal)
- `RootProvider` (React Query provider) — has a typo'd `"use-client"` directive (hyphen instead of space); currently harmless (no client hooks in that file) but worth fixing for correctness.
- `GTMProvider`, `GTMInjector` — analytics only, no visual footprint; GTM script is deferred until first interaction or a 5s timeout as a deliberate perf optimization — don't reintroduce eager loading during redesign.

---

## 6. Design tokens observed repeatedly (candidates for formalizing into a design system)

- Brand orange `#FE5300` — text, borders, icon fills, CTA backgrounds (hover shades around `#e04800`).
- WhatsApp green `#25D366` (hover `#20bd5a`).
- Card radius: `rounded-2xl` used consistently across cards.
- Section container pattern: `max-w-7xl mx-auto px-4 md:px-10`.
- Section dividers: `border-t border-gray-100`.

These appear across nearly every section on the page and most shared components — a redesign should either keep these as the base tokens or do a deliberate, tracked rename/replace across all the files listed above (not just the homepage) to avoid visual inconsistency between the new home page and the rest of the site.

---

## 7. Risk map for the upcoming redesign

**Safe to redesign with home-page-only impact** (no other page reads these): Hero banner block, `VisaHome`'s card layout (but not `PopupQueryForm` internals), `FeaturedTourSSG`'s layout (but not `FeaturedTour`'s internals — unverified, see note below), `DestinationSection`, `Partners`, `Newslatter`, `LoginAutoOpen`, `HeroSearchBox`.

**Requires cross-page regression check before changing internals** (component is imported by other pages too, even though the *wrapper* around it is home-only):
- `WhyChooseUS` → also on rental detail page.
- `Testimonial` → about-us, holiday/visa/travel-agency pages, itinerary templates, admin webpage builder.
- `LazyQueryForm` → `QueryDailogBox`, `MobileBottom`, `PopupQueryForm` (i.e. the whole site's lead-capture funnel).
- `BlogsHome` → also on `about-us`.
- `Faqs` (component, not its home-specific content array) → destinations, holidays, travel-agency, membership pages.

**Sitewide, not homepage scope, but visible on `/` because of the layout:** `Header`, `Footer`, `WhatsappButton`, `MobileBottom`, `QueryDailogBox`, `FloatingButton`, `LazyAuthDialog`.

**Not yet traced (one level deeper, only worth reading if redesign touches them directly):** `FeaturedTour` (child of `FeaturedTourSSG`), `PopupQueryForm` (child of `VisaHome`), `HomeVideoBanner` (child of dead `SevenSection`), `LazyQueryFormInView`/`LazyQueryForm` internals, `Header`'s `Navbar`/`Sidebar`/`GlobalSearch` internals, `Footer`'s `FooterItem`/`LowerFooter` internals.

---

## 8. Recommended approach for a zero-risk redesign

1. Treat "homepage redesign" and "shared component redesign" as two separate, sequenced workstreams — don't restyle `WhyChooseUS`, `Testimonial`, `LazyQueryForm`, `Faqs`, `BlogsHome`, or any layout component as a side effect of a homepage pass; if their look needs to change, do that as its own reviewed step with the other pages checked.
2. For components that are homepage-only (Hero, `VisaHome`'s grid, `DestinationSection`, `Partners`, `Newslatter`, `HeroSearchBox`, `FeaturedTourSSG`'s wrapper), it's safe to restyle or restructure markup freely as long as the data-fetching calls (API endpoints, revalidate windows, cache tags) are left untouched — the risk is almost entirely in the visual/markup layer, not the logic layer, for these.
3. Resolve the dead-code items in §4 as an explicit, separate decision (delete vs. revive) before or after the visual work, so the redesign diff doesn't get tangled up with unrelated cleanup.
4. Any change to `LazyQueryForm` (the lead form) should get the most scrutiny of all, since it's the site's primary conversion mechanism and is embedded in 4+ places including 2 sitewide layout components.
5. Keep the JSON-LD `<Script>` blocks and the `getOrganizationSchema`/`getLocalSchema`/`getBreadcrumbSchema` calls exactly as-is — purely SEO, no visual coupling, easy to accidentally break by refactoring `page.tsx`'s structure carelessly.

---

*No files were modified to produce this document. Next step, on your go-ahead: propose the new design direction section-by-section against this map, then implement homepage-only sections first, and only touch shared components as explicitly separate, reviewed changes.*
