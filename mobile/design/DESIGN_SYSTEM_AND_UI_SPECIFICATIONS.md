# Musafir Baba Mobile App — Design System & UI Specifications

> **Target Directory**: `/Users/jauhari01/Desktop/personal/Musafir-Baba/mobile/design`  
> **Scope**: UI Layouts, Typography Hierarchy, Spacing System, Color Palettes, Line Heights, Shadows, Component Architecture, and Style Standards for the `/mobile` App.

---

## 1. Document Overview & Design Vision

The **Musafir Baba Mobile Partner Application** (`/mobile`) is designed specifically for fleet owners, drivers, and transport partners in India's outstation ride ecosystem. 

### Core Visual Principles:
1. **High Contrast & Direct Visibility**: Outstation drivers rely on phone screens under intense sun or low-light cabin environments. Every typographic element must strictly meet or exceed WCAG AA contrast standards against `#f8fafc` or dark `#081122` backgrounds.
2. **Strict Typographic Hierarchy**: Clear visual distinction between primary metrics (fares, status badges, vehicle registration numbers) and supporting detail (locations, timestamps, dates).
3. **Touch Target Standard (Min 44px)**: All buttons, text input fields, selection pills, and dropdown items guarantee a minimum tap area of `44px x 44px` to eliminate mis-clicks during fast-paced operations.
4. **Card-Based Elevation System**: Clean visual grouping via rounded cards (`borderRadius: 16` to `24`), subtle borders (`#f1f5f9`), soft white surfaces (`#ffffff`), and floating status capsules (`#060d1a`).
5. **Cross-Platform Typography Safety**: Explicit pairing of `fontSize` with `lineHeight` across all screens to guarantee identical layout rendering on iOS, Android, and Web without text clipping or vertical misalignment.

---

## 2. Complete Typography Architecture

### 2.1 Font Scale & Weight Standard

React Native uses standard numerical string weights. The font system uses system font stacks (San Francisco on iOS, Roboto on Android, Inter / system-ui on Web):

```tsx
fontWeight: '400' // Regular: Body captions & subtexts
fontWeight: '500' // Medium: Input text, secondary metadata
fontWeight: '600' // SemiBold: Selection pill labels, subtitles
fontWeight: '700' // Bold: Input labels, section buttons, links
fontWeight: '800' // ExtraBold: Section titles, screen headings, status text
fontWeight: '900' // Black: Primary brand logos, fare metrics, key highlights
```

---

### 2.2 Typography Hierarchy Specification Table

This table defines what typography properties **WE WANT TO HAVE** for every text element type across the app.

| Element Category | Element Name | Font Size (`fontSize`) | Line Height (`lineHeight`) | Font Weight (`fontWeight`) | Color Token | Letter Spacing (`letterSpacing`) | Usage & Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Brand / Display** | Brand Header | `24px` | `30px` | `900` | `#0f172a` / `#FE5300` | `-0.5px` | Main brand title ("MB Connect"). |
| **Screen Title** | Page H1 | `20px` - `22px` | `26px` - `28px` | `800` | `#0f172a` | `-0.5px` | Top-level screen title in header. |
| **Section Heading** | Section H2 | `16px` - `18px` | `22px` - `24px` | `800` | `#0f172a` | `0` | Major dashboard or form section titles. |
| **Card Heading** | Card H3 | `14px` - `15px` | `20px` | `800` | `#0f172a` | `0` | Vehicle name, route title, modal title. |
| **Section Subheading** | Subtitle | `13px` | `18px` | `500` - `600` | `#64748b` | `0` | Context notice below section titles. |
| **Field Label** | Input Label | `12px` - `13px` | `16px` - `18px` | `700` | `#334155` | `0` | Form input labels, field descriptors. |
| **Input / Button Text** | Body Bold | `14px` - `15px` | `20px` | `700` - `800` | `#ffffff` / `#0f172a` | `0.2px` | Primary CTA text, input value text. |
| **Body Standard** | Body Medium | `13px` - `14px` | `18px` - `20px` | `500` | `#334155` | `0` | General paragraph text, modal text. |
| **Metric Large** | Value Highlight | `20px` - `24px` | `26px` - `30px` | `900` | `#ffffff` / `#0f172a` | `0` | Dashboard total earnings, trip fare. |
| **Metric Medium** | Sub-Value | `16px` | `22px` | `900` | `#16a34a` / `#0f172a` | `0` | Base fare amount, distance values. |
| **Status Badge** | Badge Label | `10px` - `11px` | `14px` | `800` | `#ffffff` / Status | `0.2px` | Ongoing, Completed, Scheduled tags. |
| **Pill Selector** | Filter Label | `11px` - `13px` | `16px` | `700` | `#64748b` / `#FE5300` | `0` | Filter pills, tab selector text. |
| **Micro Subtext** | Timestamp / Meta | `9px` - `10px` | `12px` - `14px` | `600` - `800` | `#94a3b8` | `0.5px` - `1.2px` | Brand taglines, notice timestamps. |
| **Link / Action** | Text Action | `12px` - `13px` | `18px` | `700` | `#FE5300` | `0` | "View All", "Forgot Password?", links. |

---

### 2.3 Section Heading & Subheading Guidelines (Target Standards)

#### A. Screen-Level Header Block
```tsx
<View style={styles.sectionHeaderRow}>
  <Text style={styles.screenTitle}>Add New Vehicle</Text>
  <Text style={styles.screenSubtitle}>Complete 3 simple steps to list your vehicle</Text>
</View>

// StyleSheet Standards:
screenTitle: {
  fontSize: 20,
  fontWeight: '800',
  color: '#0f172a',
  letterSpacing: -0.5,
  marginBottom: 4,
},
screenSubtitle: {
  fontSize: 13,
  fontWeight: '500',
  color: '#64748b',
  lineHeight: 18,
}
```

#### B. Dashboard / Card Section Title
```tsx
<View style={styles.sectionHeaderRow}>
  <Text style={styles.sectionTitle}>Live Opportunities</Text>
  <TouchableOpacity onPress={onViewAll}>
    <Text style={styles.viewAllText}>View All →</Text>
  </TouchableOpacity>
</View>

// StyleSheet Standards:
sectionHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
},
sectionTitle: {
  fontSize: 16,
  fontWeight: '800',
  color: '#0f172a',
  lineHeight: 22,
},
viewAllText: {
  fontSize: 12,
  fontWeight: '700',
  color: '#FE5300',
}
```

#### C. Card Sub-Section Title & Label
```tsx
<Text style={styles.fieldLabel}>Vehicle Registration Number</Text>

// StyleSheet Standards:
fieldLabel: {
  fontSize: 12,
  fontWeight: '700',
  color: '#334155',
  marginBottom: 6,
  marginTop: 10,
  lineHeight: 16,
}
```

---

## 3. Complete Color Palette & Token System

### 3.1 Primary Brand Tokens
```ts
export const colors = {
  primary: '#FE5300',             // Musafir Baba Signature Saffron-Orange
  primaryGradientStart: '#e84118', // Warm Saffron Gradient Start
  primaryGradientEnd: '#f39c12',   // Golden Orange Gradient End
  primarySoftBg: '#fff7ed',        // Light Orange Tint (Orange-50) for Active Pills
  primaryPromoBg: '#fff4ed',       // Light Orange Banner Background
  primaryPromoBorder: '#ffe3d1',   // Light Orange Banner Border
};
```

### 3.2 Neutral Palette (Slate Scale)
| Token Name | Hex Code | Usage & Application |
| :--- | :--- | :--- |
| **`slate-950`** | `#060d1a` | Floating capsule dark background, dark mode root. |
| **`slate-900`** | `#0f172a` | Dark metric card background, primary text color, modal handles. |
| **`slate-800`** | `#1e293b` | Dark card border, floating capsule border. |
| **`slate-700`** | `#334155` | Secondary text, input label color, guideline body text. |
| **`slate-600`** | `#475569` | Secondary icons, inactive tab icon tint. |
| **`slate-500`** | `#64748b` | Subtitles, date metadata, placeholder labels. |
| **`slate-400`** | `#94a3b8` | Muted timestamps, search placeholder text. |
| **`slate-300`** | `#cbd5e1` | Disabled button background, line dividers, drag handles. |
| **`slate-200`** | `#e2e8f0` | Input field borders, button secondary borders. |
| **`slate-100`** | `#f1f5f9` | Card borders, header bottom divider, step line inactive. |
| **`slate-50`** | `#f8fafc` | Default app screen background, input field background. |
| **`white`** | `#ffffff` | Primary card surface, white text on primary CTA buttons. |

### 3.3 Semantic & Functional Matrix

| Status | Background | Border | Text / Icon | Application Example |
| :--- | :--- | :--- | :--- | :--- |
| **Success** | `#f0fdf4` / `#e6f4ea` | `#dcfce7` | `#16a34a` / `#137333` | Active vehicle badge, verified partner status, completed trip. |
| **Error** | `#fef2f2` | `#fecaca` | `#ef4444` / `#dc2626` | Error alerts, form validation failure, missing document alert. |
| **Warning** | `#fffbebf` | `#fef3c7` | `#d97706` | Pending admin approval, incomplete profile alert. |
| **Info** | `#f4f7ff` / `#eff6ff` | `#dbeafe` | `#2563eb` / `#1e40af` | Upcoming ride notice, round-trip trip type badge. |

---

## 4. Spacing, Layout & Grid System

### 4.1 Spacing Tokens (4px Grid Base)

- **`space-0.5` (`2px`)**: Micro inline offset, small dot margins.
- **`space-1` (`4px`)**: Label-to-input gap, icon-to-text micro gap.
- **`space-1.5` (`6px`)**: Selection pill internal vertical padding, badge vertical gap.
- **`space-2` (`8px`)**: Section title bottom margin, step indicator gap, badge horizontal gap.
- **`space-2.5` (`10px`)**: Input field vertical padding, header bar bottom padding.
- **`space-3` (`12px`)**: Card internal padding (small), list item gap, section gap.
- **`space-3.5` (`14px`)**: Input field horizontal padding, button vertical padding.
- **`space-4` (`16px`)**: Standard screen horizontal padding (`padding: 16`), card padding (`padding: 16`).
- **`space-5` (`20px`)**: Modal sheet inner padding (`padding: 20`), form card margin bottom.
- **`space-6` (`24px`)**: Login screen card padding (`padding: 24`), section vertical gap.
- **`space-8` (`32px`)**: Hero container top padding, large modal sheet bottom padding.
- **`space-10` (`40px`)**: Scroll view bottom content padding (`paddingBottom: 40`).
- **`space-12` (`48px`)**: Fixed header top status bar padding (`paddingTop: 48`).

---

### 4.2 Standard Layout Container Patterns

#### Screen Container Pattern
```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
});
```

#### Fixed Top Navigation Header Pattern
```tsx
const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
});
```

---

## 5. Border Radius & Shadow Profile Matrix

### 5.1 Border Radius Token Scale
- **`radius-sm` (`6px` - `8px`)**: Micro badges, tag pill corners, thumbnail image corners.
- **`radius-md` (`10px` - `12px`)**: Form inputs, action buttons, progress step dots.
- **`radius-lg` (`14px` - `16px`)**: Standard input wrappers, action pills, modal inner boxes.
- **`radius-xl` (`18px` - `20px`)**: Standard white form cards, dark metric dashboard cards.
- **`radius-2xl` (`24px` - `28px`)**: Login screen cards, modal sheet top corners.
- **`radius-full` (`30px` - `9999px`)**: Floating operational capsule, filter pills, round toggle switches.

---

### 5.2 Shadow & Elevation Profiles

```tsx
// 1. Subtle White Card Shadow
cardShadow: {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,
}

// 2. Primary Saffron Button Glow
primaryButtonGlow: {
  shadowColor: '#FE5300',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 4,
}

// 3. Dark Overview Hero Card Shadow
darkCardShadow: {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 14,
  elevation: 5,
}

// 4. Floating Operational Capsule Shadow
floatingCapsuleShadow: {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
  elevation: 8,
}
```

---

## 6. Detailed Component UI & Styling Specifications

### 6.1 Buttons & Interactive Controls

#### A. Primary Saffron CTA Button (`Button.tsx` / `primaryBtn`)
- **Container**: `backgroundColor: '#FE5300'`, `paddingVertical: 14` to `16`, `paddingHorizontal: 22`, `borderRadius: 14` to `16`, `alignItems: 'center'`, `justifyContent: 'center'`, `flexDirection: 'row'`.
- **Text**: `color: '#ffffff'`, `fontSize: 14` to `15`, `fontWeight: '800'`, `letterSpacing: 0.2`.
- **Shadow**: `shadowColor: '#FE5300'`, `shadowOffset: { width: 0, height: 4 }`, `shadowOpacity: 0.25`, `shadowRadius: 8`, `elevation: 4`.
- **Disabled State**: `backgroundColor: '#cbd5e1'`, `borderColor: '#cbd5e1'`, `shadowOpacity: 0`, `elevation: 0`, `opacity: 0.75`.

#### B. Secondary White Button (`secondaryBtn`)
- **Container**: `backgroundColor: '#ffffff'`, `borderWidth: 1`, `borderColor: '#e2e8f0'`, `borderRadius: 16`, `paddingVertical: 14`, `paddingHorizontal: 16`, `alignItems: 'center'`, `justifyContent: 'center'`.
- **Text**: `color: '#0f172a'`, `fontSize: 13`, `fontWeight: '800'`.

#### C. Outline Saffron Button (`outlineButton`)
- **Container**: `backgroundColor: '#ffffff'`, `borderWidth: 1.5`, `borderColor: '#FE5300'`, `borderRadius: 14`, `paddingVertical: 14`.
- **Text**: `color: '#FE5300'`, `fontSize: 15`, `fontWeight: '700'`.

---

### 6.2 Form Inputs & Selection Dropdowns

#### A. Input Field Wrapper (`InputField.tsx` / `textInput`)
- **Label**: `fontSize: 13`, `fontWeight: '700'`, `color: '#334155'`, `marginBottom: 6`.
- **Input Wrapper**: `backgroundColor: '#f8fafc'`, `borderWidth: 1.5`, `borderColor: '#e2e8f0'`, `borderRadius: 14`, `paddingHorizontal: 14`, `paddingVertical: 12`, `fontSize: 14` to `15`, `color: '#0f172a'`, `fontWeight: '500'`.
- **Focus State**: `borderColor: '#FE5300'`, `backgroundColor: '#ffffff'`.
- **Error State**: `borderColor: '#ef4444'`, `backgroundColor: '#fef2f2'`, error message text `color: '#dc2626'`, `fontSize: 12`, `fontWeight: '500'`, `marginTop: 4`.

#### B. Select Dropdown Pill Selector (`selectPill`)
- **Unselected State**: `backgroundColor: '#f8fafc'`, `borderRadius: 12`, `paddingHorizontal: 10`, `paddingVertical: 6`, `borderWidth: 1`, `borderColor: '#e2e8f0'`, text `color: '#64748b'`, `fontSize: 11`, `fontWeight: '700'`.
- **Selected State**: `backgroundColor: '#fff7ed'`, `borderColor: '#FE5300'`, text `color: '#FE5300'`, `fontWeight: '800'`.

---

### 6.3 Cards & Layout Modules

#### A. Standard Light Form Card (`formCard` / `card`)
- **Container**: `backgroundColor: '#ffffff'`, `borderRadius: 20`, `padding: 16`, `borderWidth: 1`, `borderColor: '#f1f5f9'`, `marginBottom: 16`.
- **Shadow**: `shadowColor: '#0f172a'`, `shadowOffset: { width: 0, height: 4 }`, `shadowOpacity: 0.04`, `shadowRadius: 10`, `elevation: 2`.

#### B. Dark Overview Hero Card (`darkOverviewCard`)
- **Container**: `backgroundColor: '#081122'`, `borderRadius: 20`, `padding: 16`, `marginBottom: 16`.
- **Metric Value Text**: `fontSize: 20`, `fontWeight: '900'`, `color: '#ffffff'`.
- **Metric Label Text**: `fontSize: 10`, `fontWeight: '500'`, `color: '#94a3b8'`, `marginTop: 2`.
- **Growth Indicator**: `fontSize: 10`, `fontWeight: '700'`, `color: '#4ade80'`.

#### C. Guideline Notice Box (`guidelinesCard`)
- **Container**: `backgroundColor: '#f4fbf7'`, `borderRadius: 16`, `padding: 14`, `borderWidth: 1`, `borderColor: '#dcfce7'`, `marginBottom: 16`.
- **Notice Title**: `fontSize: 13`, `fontWeight: '800'`, `color: '#16a34a'`, `marginBottom: 4`.
- **Notice Text**: `fontSize: 11`, `color: '#334155'`, `lineHeight: 16`.

---

### 6.4 Status Badges & Pill Indicators

```tsx
// 1. Active / Ongoing Badge (Green)
statusBadgeActive: {
  backgroundColor: '#e6f4ea',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 8,
},
statusTextActive: {
  fontSize: 11,
  fontWeight: '800',
  color: '#137333',
}

// 2. Scheduled Ride Badge (Blue)
statusBadgeScheduled: {
  backgroundColor: '#eff6ff',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 8,
},
statusTextScheduled: {
  fontSize: 11,
  fontWeight: '800',
  color: '#2563eb',
}

// 3. Round Trip Tag (Indigo)
roundTripBadge: {
  backgroundColor: '#2563eb',
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 6,
},
roundTripText: {
  fontSize: 9,
  fontWeight: '800',
  color: '#ffffff',
}
```

---

### 6.5 Modal Sheets & Floating Containers

#### A. Bottom Sheet Modal Overlay (`modalSheet`)
- **Backdrop Overlay**: `backgroundColor: 'rgba(15, 23, 42, 0.6)'`, `justifyContent: 'flex-end'`.
- **Sheet Body**: `backgroundColor: '#ffffff'`, `borderTopLeftRadius: 28`, `borderTopRightRadius: 28`, `padding: 20`, `paddingBottom: 36`.
- **Drag Handle Bar**: `width: 40`, `height: 4`, `borderRadius: 2`, `backgroundColor: '#cbd5e1'`, `alignSelf: 'center'`, `marginBottom: 14`.
- **Modal Title**: `fontSize: 18`, `fontWeight: '800'`, `color: '#0f172a'`.

#### B. Floating Operational Status Capsule (`floatingCapsule`)
- **Container**: `backgroundColor: '#060d1a'`, `borderRadius: 30`, `padding: 8`, `paddingLeft: 16`, `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`, `borderWidth: 1`, `borderColor: '#1e293b'`.
- **Shadow**: `shadowColor: '#000000'`, `shadowOffset: { width: 0, height: 6 }`, `shadowOpacity: 0.3`, `shadowRadius: 10`, `elevation: 8`.
- **Status Title**: `fontSize: 12`, `fontWeight: '800'`, `color: '#ffffff'`.
- **Status Subtext**: `fontSize: 9`, `color: '#94a3b8'`, `marginTop: 1`.

---

## 7. Screen-by-Screen UI Blueprint

```
/mobile/src/screens
 ├── HomeScreen.tsx                 --> Dark Overview + Live Opportunity + Floating Capsule
 ├── LoginScreen.tsx                --> Hero Card Overlay + High-contrast Form
 ├── RegisterScreen.tsx             --> Account Creation + OTP Step Verification
 ├── AddVehicleScreen.tsx           --> Multi-step Progress Bar + Photo Upload Grid
 ├── BookingsScreen.tsx             --> Filter Pills Scroll + Trip Card List + Fare Highlights
 ├── FleetRegistryScreen.tsx        --> Fleet Count Summary + Vehicle Cards + Action Buttons
 ├── ServiceAreaPricingScreen.tsx   --> Location Group Badges + Vehicle Rate Config Cards
 └── PersonalDetailsScreen.tsx      --> Form Inputs + Document Upload Slots + Submit CTA
```

---

## 8. Development Rules & Anti-Pattern Avoidance

1. **Rule #1: Always specify explicit `lineHeight` for `Text` components**. Never rely on default system line heights to avoid vertical font cutting on Android devices.
2. **Rule #2: Enforce min 44px touch areas**. Always use `paddingVertical: 12` or higher on buttons and clickable rows.
3. **Rule #3: Maintain strict color contrast**. Dark cards (`#081122`) require white (`#ffffff`) or light slate (`#94a3b8`) text. Light cards (`#ffffff`) require dark slate (`#0f172a` / `#334155`) text.
4. **Rule #4: Do not introduce third-party styling frameworks**. Use standard React Native `StyleSheet.create` for maximum performance and predictable cross-platform behavior.

---
*Created and maintained inside `/mobile/design/DESIGN_SYSTEM_AND_UI_SPECIFICATIONS.md` for Musafir Baba Mobile codebase.*
