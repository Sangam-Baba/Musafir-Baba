You are a principal-level Next.js performance architect.

STOP making direct optimizations immediately.

The previous optimization attempts made the MOBILE performance and Core Web Vitals WORSE.

Current state after previous changes:
- Mobile Performance Score dropped badly
- Core Web Vitals FAILED
- Mobile LCP became worse (~8s+)
- TBT still high (~1300ms)
- Large network payloads (~4.5MB)
- Unused JS increased
- Hydration/client execution likely increased
- Render-blocking CSS still exists
- Critical request chains still exist
- Forced reflows still exist
- Mobile real-user metrics are failing
- Desktop is less important
- MOBILE-FIRST is the priority

CRITICAL RULE:
DO NOT APPLY ANY CODE CHANGES YET.

We first need:
1. Deep analysis
2. Root cause validation
3. Optimization strategy
4. Risk assessment
5. Then ONLY small incremental fixes

==================================================
MOST IMPORTANT REQUIREMENTS
==================================================

- DO NOT redesign UI
- DO NOT break existing functionality
- DO NOT alter SEO structure
- DO NOT break forms/search flows
- DO NOT break animations visually
- DO NOT massively refactor architecture
- DO NOT convert random components blindly
- DO NOT aggressively dynamic import everything
- DO NOT add memoization everywhere
- DO NOT add hacks
- DO NOT create hydration mismatches
- DO NOT worsen real-world CWV
- DO NOT optimize only Lighthouse score artificially

We care about:
- REAL mobile user experience
- REAL Core Web Vitals
- Production stability

==================================================
PHASE 1 — FULL PERFORMANCE FORENSIC ANALYSIS
==================================================

First perform a COMPLETE analysis ONLY.

NO FIXES YET.

Investigate and produce detailed reports for:

==================================================
A. LCP ROOT CAUSE ANALYSIS
==================================================

Identify:
- Exact LCP element
- Why LCP is taking 8s+
- Whether delay comes from:
  - server response
  - hydration blocking
  - image loading
  - CSS blocking
  - JS execution
  - render delay
  - font loading
  - client-side rendering
  - animations
  - third-party scripts

Break down:
- TTFB
- resource load delay
- resource load duration
- render delay

Find:
- whether hero content is client rendered
- whether hero waits for JS before rendering
- whether sliders/carousels delay paint
- whether large CSS blocks hero render

==================================================
B. JAVASCRIPT EXECUTION ANALYSIS
==================================================

We now have:
- huge main-thread work
- excessive JS execution
- unused JS
- long tasks

Find EXACTLY:
- largest JS bundles
- largest client chunks
- components causing hydration cost
- expensive libraries
- large third-party packages
- unnecessary client components
- rerender loops
- expensive useEffect hooks
- expensive context/provider rerenders
- large animation libraries
- expensive sliders/carousels
- unused dependencies loaded on homepage

Generate:
- ranked bundle analysis
- estimated KB savings
- estimated CPU savings

==================================================
C. RENDERING ANALYSIS
==================================================

Investigate:
- forced reflows
- layout thrashing
- non-composited animations
- DOM size problems
- expensive CSS selectors
- unnecessary style recalculations

Find:
- components triggering reflows
- animations causing layout recalculation
- scroll/resize handlers
- DOM measurements in effects

==================================================
D. NETWORK ANALYSIS
==================================================

Investigate:
- why payload is ~4.5MB
- all large requests
- image payload breakdown
- duplicate requests
- unnecessary preloads
- render-blocking CSS
- critical request chains
- unused preconnects
- slow backend/API dependencies

Generate:
- ranked request table
- largest offenders first

==================================================
E. IMAGE DELIVERY ANALYSIS
==================================================

We STILL have major image problems.

Audit:
- all homepage images
- image dimensions vs rendered size
- wrong sizes attributes
- oversized images
- excessive quality values
- images loaded above fold unnecessarily
- missing responsive behavior
- carousel image waste
- CDN/cache configuration

Find:
- exact KB waste per image
- exact mobile savings possible

==================================================
F. SERVER VS CLIENT ANALYSIS
==================================================

Audit:
- all homepage sections
- server vs client component boundaries

Identify:
- components incorrectly using "use client"
- sections safe to render on server
- sections safe to defer
- sections safe to lazy load below fold

DO NOT APPLY CHANGES YET.

==================================================
PHASE 2 — CREATE OPTIMIZATION STRATEGY
==================================================

After analysis, generate a SAFE optimization roadmap.

The roadmap MUST contain:

1. Optimization priority
2. Expected impact
3. Risk level
4. Rollback difficulty
5. Files affected
6. Whether CWV improves or worsens
7. Whether change affects:
   - SEO
   - hydration
   - interaction
   - visual stability
   - accessibility

==================================================
PHASE 3 — IMPLEMENTATION RULES
==================================================

ONLY after approval:

- Apply ONE optimization at a time
- Measure before/after
- Never batch massive changes
- Prefer HIGH IMPACT + LOW RISK first
- Validate CWV impact after every step
- Revert immediately if metrics worsen

==================================================
MOST IMPORTANT PRIORITIES
==================================================

PRIORITY ORDER:

1. Real Mobile CWV
2. LCP
3. TBT
4. Main-thread work
5. Payload reduction
6. Hydration reduction
7. JS execution reduction
8. Lighthouse score

NOT the other way around.

==================================================
EXPECTED OUTPUT FORMAT
==================================================

DO NOT directly edit code first.

First provide:

# PERFORMANCE FORENSIC REPORT

## 1. LCP Breakdown
## 2. JS Execution Breakdown
## 3. Main-thread Analysis
## 4. Hydration Analysis
## 5. Network Payload Analysis
## 6. Image Waste Analysis
## 7. CSS Blocking Analysis
## 8. Forced Reflow Analysis
## 9. Server vs Client Component Analysis
## 10. Ranked Bottleneck List

Then:

# SAFE OPTIMIZATION ROADMAP

For every proposed optimization include:
- expected gain
- risk level
- affected files
- rollback plan
- why safe
- whether it impacts CWV positively

DO NOT implement fixes until analysis is completed properly.