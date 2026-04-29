# Sitemap Management: Design & Style Guide

This document serves as a technical reference for the visual design implementation of the **Sitemap Management** feature. It outlines the typography, color systems, and component structures to ensure consistency across future feature developments.

## 1. Typography System
We use a high-density typographic scale to maximize data visibility while maintaining professional readability.

| Element | Size | Weight | Color | Case | Spacing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Main Title** | `1.125rem` (18px) | Bold | `Slate-800` | Sentence | Normal |
| **Status Badge** | `0.625rem` (10px) | Black | `Slate-400` | Uppercase | `tracking-widest` |
| **Table Head** | `0.625rem` (10px) | Bold | `Slate-400` | Uppercase | `tracking-wider` |
| **Row Title** | `0.8125rem` (13px) | Semibold | `Slate-700` | Sentence | Tight |
| **Row URL** | `0.625rem` (10px) | Medium | `Slate-400` | Lowercase | Mono |
| **Category Label** | `0.6875rem` (11px) | Medium | `Slate-500` | Capitalize | Normal |
| **Pagination Text**| `0.625rem` (10px) | Black | `Slate-400` | Uppercase | `0.2em` |

---

## 2. Color Palette
The feature utilizes a curated palette of neutral slates combined with high-contrast brand accents.

### Core Brands
- **Primary Accent**: `#FE5300` (Musafir-Baba Orange)
- **Secondary Accent**: `bg-orange-50` (Used for hover states and subtle icons)

### Data Visualization (Type Colors)
| Category | Icon Color | Background (Ref) |
| :--- | :--- | :--- |
| **Holidays** | `Text-Orange-500` | Trip/Package context |
| **WebPages** | `Text-Blue-500` | Core structure |
| **Destinations**| `Text-Green-500` | Geography |
| **Visa** | `Text-Indigo-500` | Legal/Official |
| **Blogs** | `Text-Pink-500` | Editorial Content |
| **News** | `Text-Red-500` | Alerts/Updates |

---

## 3. UI Components & Dimensions
All interactive elements are optimized for a compact, high-efficiency administrative workflow.

### Layout Dimensions
- **Max Content Width**: `1152px` (max-w-6xl)
- **Items Per Page**: `10`
- **Table Row Height**: Fixed compact padding (`py-2`)
- **Action Button**: `28px x 28px` (h-7 w-7)

### Controls (Search & Filter)
- **Input Height**: `32px` (h-8)
- **Input Background**: `Slate-50` (Off-white)
- **Border**: `None` (Shadowless/Flat design)
- **Focus**: `Ring-1 Ring-[#FE5300]`

---

## 4. Interactive States (Micro-interactions)
- **Row Hover**: `bg-slate-50/80`. Title shifts `1px` horizontally to signal interactivity.
- **Link Reveal**: URL path is hidden by default (`opacity-0`) and fades in on row hover.
- **Action Highlight**: External link icon transitions from `opacity-40` to `opacity-100` and scales up `10%` on specific icon hover.
- **Transitions**: Global standard of `300ms` with `ease-in-out` curve.

---

## 5. Implementation Notes
- **Server Component**: The core data processing is handled on the server.
- **URL-Driven**: All state (search, page, category) is persisted in the URL query string.
- **Icons**: Sourced from `lucide-react` at `12px` to `16px` scale.
