# Visa Details Page Design Specification

> [!NOTE]
> This document outlines the typography, spacing, and styling conventions extracted from the detailed Visa Page (`VisaClient.tsx`). It is intended to serve as a design reference for standardizing other pages across the platform.

## Typography

### Font Families
- **Headings & Titles:** `font-heading`
- **Body & General Text:** Default Sans-Serif (Tailwind's sans)

### Font Weights
- **Normal Text:** `font-medium` (500)
- **Labels & Subtitles:** `font-semibold` (600)
- **Headings & Important Values:** `font-bold` (700)
- **Emphasized Values:** `font-extrabold` (800)
- **Hero/Price/Badges:** `font-black` (900)

---

## Font Sizing (Web vs Mobile)

### Headings (Section Titles)
- **Web & Mobile:** `text-xl` (20px) 
- *Styling:* `font-bold font-heading text-black` with an underline accent (`w-12 h-1 bg-[#FE5300]`).

### Body Text (Prose & Content)
- **Web:** `text-base` (16px), occasionally `text-[13px]` or `text-[14px]` inside cards/lists.
- **Mobile:** `text-base` (16px), occasionally `text-[12px]` or `text-[13px]` inside cards/lists.
- *Styling:* `text-gray-500` or `text-black` with `leading-relaxed` (line-height).

### Prices & Fees
- **Web:** `text-2xl` (24px) `font-black text-[#FE5300]`
- **Mobile:** `text-xl` (20px) `font-black text-[#FE5300]`

### Badges, Labels & Chips
- **Web:** `text-[10px]` (Badges/Labels), `text-xs` (12px) (Chips)
- **Mobile:** `text-[9px]` or `text-[10px]` (Badges/Labels), `text-[12px]` (Chips)
- *Styling:* Badges often use `uppercase tracking-wider font-black`.

### Navigation Tabs
- **Web:** `text-sm` (14px)
- **Mobile:** `text-xs` (12px)

---

## Layout & Spacing

### Page Container
- **Max Width:** `max-w-7xl`
- **Global Background:** `bg-slate-50/60`
- **Horizontal Padding (Page Level):** 
  - Mobile: `px-4`
  - Tablet: `sm:px-6`
  - Desktop: `lg:px-8`

### Section Spacing
- **Bottom Margin (between sections):** `mb-8`
- **Bottom Padding (within sections):** `pb-8`
- **Section Dividers:** `border-b border-gray-200`
- **Scroll Margin (for sticky header offsets):** `scroll-mt-40`

### Grid & Flex Gaps
- **Main Layout (Content vs Sidebar):** `gap-8`
- **Two-Column Sections (Highlights vs Quick Answers):** Mobile `gap-12`, Desktop `gap-20`
- **Inner Component Gaps:** `gap-1.5`, `gap-2`, `gap-3`, or `gap-4` depending on proximity.

---

## Component-Specific Specifications

### 1. Visa Cards
- **Container Styling:** `bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-300`
- **Internal Padding:**
  - Web: `px-5 py-4`
  - Mobile: `px-4 py-4`
- **Card Badges (Purpose):** `bg-[#FE5300]/10 text-[#FE5300] px-2 py-0.5 rounded text-[10px] uppercase font-black`

### 2. Sticky Tab Navigation
- **Container:** `sticky top-0 z-40 bg-white border-b border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]`
- **Tab Height:** Mobile `h-8`, Web `h-9`
- **Tab Padding:** Mobile `px-3`, Web `px-4`
- **Tab States:**
  - Active: `bg-[#FE5300] text-white`
  - Inactive: `bg-white text-black border border-[#FE5300] hover:bg-gray-50`

### 3. Modals & Popovers
- **Overlay:** `bg-black/60 backdrop-blur-xs` (or `backdrop-blur-sm`)
- **Container:** `bg-white rounded-2xl p-6 shadow-2xl`
- **Animation:** `animate-in fade-in zoom-in-95 duration-200`

### 4. Color Palette
- **Primary Brand / Accents:** `#FE5300` (Orange)
- **Primary Text:** `text-gray-900` or `text-black`
- **Secondary Text:** `text-gray-500` or `text-gray-600`
- **Subtle Backgrounds:** `bg-slate-50/60`, `bg-gray-50`, `bg-gray-100`
- **Borders:** `border-gray-100`, `border-gray-200`
- **Semantic Colors:** Green `#87E87F` (success accents), Red `red-600` / `red-50` (warnings/rejections), Emerald `emerald-500` (tips).

> [!TIP]
> When applying these styles to new components, always use standard Tailwind responsive prefixes (`md:`, `lg:`) to ensure seamless transitions between the defined Mobile and Web specifications.
