You are a senior-level Next.js performance engineer.

We already attempted basic optimization, but the homepage MOBILE performance is still extremely poor.

Current Lighthouse Mobile issues:
- Performance Score: 36
- LCP: 17s
- TBT: 4600ms
- Speed Index: 9.5s
- Main-thread work: 9.4s
- JS execution time: 5.9s
- Forced reflow detected
- Critical request chains
- Large client JS chunks
- Render-blocking CSS
- Image delivery issues
- Heavy script evaluation/parsing
- GTM consuming CPU time
- Excessive hydration/client-side execution

CRITICAL REQUIREMENTS:
- DO NOT redesign UI.
- DO NOT change spacing, layout, styling, animation appearance, business logic, routing, forms, SEO structure, APIs, or user flows.
- DO NOT break any existing feature.
- DO NOT remove tracking completely.
- DO NOT create hydration mismatch issues.
- DO NOT introduce unstable hacks.
- DO NOT touch unrelated files.
- DO NOT massively refactor the architecture.
- ONLY apply safe, production-grade optimizations.
- Keep every change isolated and reversible.

We need DEEP performance optimization now.

==================================================
PHASE 1 — FIND THE REAL ROOT CAUSE
==================================================

First perform a deep audit and identify:

1. Which components are causing:
   - huge hydration cost
   - forced reflow
   - long JS execution
   - main-thread blocking
   - unnecessary rerenders
   - large client bundles

2. Find:
   - components unnecessarily marked "use client"
   - components that can safely become server components
   - expensive hooks/effects
   - expensive animations
   - oversized DOM trees
   - unnecessary providers/context rerenders
   - heavy carousels/sliders
   - expensive libraries loaded on homepage
   - large icon libraries
   - unnecessary global imports
   - client-side fetched data that should be server-side
   - duplicate requests
   - heavy third-party scripts

3. Generate a ranked bottleneck report:
   - highest impact first
   - include estimated ms savings
   - include risk level
   - explain why fix is safe

==================================================
PHASE 2 — FIX LCP (17s IS CRITICAL)
==================================================

Identify EXACT LCP element.

Apply ONLY safe fixes:
- remove lazy loading from LCP image
- preload hero image correctly
- ensure priority loading
- use proper sizes attribute
- ensure responsive mobile image dimensions
- prevent giant image downloads
- optimize hero rendering path
- remove render delays before hero render
- defer below-fold sections

IMPORTANT:
- keep same visual quality
- preserve exact hero UI appearance
- no visual degradation

==================================================
PHASE 3 — REDUCE JAVASCRIPT EXECUTION
==================================================

The homepage is executing too much JS.

Apply:
- route-level code splitting
- component-level dynamic imports
- lazy load below-fold sections
- defer heavy widgets
- defer non-critical animations
- isolate client-only components
- convert safe components to server components
- remove unnecessary hydration
- memoize only expensive stable components
- prevent cascading rerenders

DO NOT:
- blindly memoize everything
- break state flows
- break animations
- break forms/interactions

==================================================
PHASE 4 — FIX FORCED REFLOWS
==================================================

Lighthouse detected forced reflow.

Audit:
- layout thrashing
- repeated DOM measurements
- bad useEffect patterns
- expensive resize/scroll listeners
- animation libraries causing layout recalculation

Fix using:
- requestAnimationFrame where needed
- passive listeners
- transform-based animations
- batched DOM reads/writes
- memoized layout calculations

WITHOUT changing animation visuals.

==================================================
PHASE 5 — THIRD PARTY SCRIPT OPTIMIZATION
==================================================

Google Tag Manager and analytics are consuming CPU time.

Optimize safely:
- delay GTM until interaction or idle
- use next/script properly
- use strategy="afterInteractive" or lazyOnload appropriately
- ensure tracking still works
- preserve analytics accuracy

DO NOT remove analytics entirely.

==================================================
PHASE 6 — CSS & CRITICAL REQUESTS
==================================================

Fix:
- render-blocking CSS
- critical request chains
- unnecessary global CSS
- oversized Tailwind generation
- duplicate CSS imports

Safely optimize:
- CSS loading order
- remove unused styles safely
- inline only truly critical CSS if needed

WITHOUT changing appearance.

==================================================
PHASE 7 — IMAGE DELIVERY
==================================================

Audit ALL homepage images:
- oversized images
- wrong aspect ratios
- desktop images on mobile
- missing sizes attributes
- excessive quality values
- improper next/image usage

Apply:
- responsive sizes
- correct width/height
- AVIF/WebP
- mobile-specific sizing
- proper lazy loading strategy

Preserve visual quality.

==================================================
PHASE 8 — OUTPUT FORMAT
==================================================

For EVERY optimization provide:

1. Problem
2. Root cause
3. Exact affected files/components
4. Safe fix
5. Exact code change
6. Why it will NOT break UI/features
7. Estimated Lighthouse improvement
8. Rollback path

==================================================
PHASE 9 — IMPORTANT IMPLEMENTATION RULES
==================================================

- Make changes incrementally.
- Validate after every optimization.
- Prioritize HIGH IMPACT + LOW RISK fixes first.
- Do not perform broad rewrites.
- Preserve existing functionality completely.
- Maintain production stability.
- Avoid overengineering.
- Keep code clean and maintainable.

FINAL TARGET:
- Mobile Lighthouse 80+
- LCP under 2.5s
- TBT under 300ms
- Maintain identical UI/UX and functionality.