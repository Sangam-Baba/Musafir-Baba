# MBGO Mobile UI - Typography & Styling System Documentation

This document contains the authoritative typography scale, styling rules, component dimensions, and asset integration standards established for the MBGO React Native application. 

Use this reference guide when developing or refactoring UI for remaining mobile user screens (Profile, Wallet, Settings, Help & Support, Booking Summary, My Trips, etc.) to ensure 100% visual consistency and a cohesive premium experience across the app.

---

## 1. Core Typography Scale & Token Matrix

| UI Role | `fontSize` | `fontWeight` | `lineHeight` | `letterSpacing` | Color (`Hex`) | Key Use Cases |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth Hero Title** | `23` | `'600'` (SemiBold)| `30` | Standard | `#0B1E3D` / `#FF5500` | Auth hero titles ("Your Journey, Our Priority.") |
| **Hero Greeting Title** | `18` | `'500'` (Medium) | `25` | `-0.2` | `#0F172A` (Slate 900) | Top greeting ("Where would you like to go today?") |
| **Sub-Greeting Tag** | `12` | `'500'` (Medium) | Auto | Standard | `#FF4500` (Brand Orange) | Pre-heading greeting ("Hello,") |
| **Section Headings** | `14` | `'600'` (SemiBold)| Auto | Standard | `#111827` (Gray 900) | Section titles ("Popular Services", "Why travel with MBGO?") |
| **Card Title (Primary)** | `13` | `'700'` (Bold) | `17` | Standard | `#0F172A` (Slate 900) | Banner card headings ("Travel with comfort at the best prices") |
| **Card Subtitle / Badges**| `10` | `'600'` (SemiBold)| Auto | Standard | `#334155` (Slate 700) | Feature tags ("Safe \| Reliable \| On-time") |
| **Main Button Label** | `13` | `'600'` (SemiBold)| Auto | Standard | `#FFFFFF` (White) | Primary action buttons ("Search Cabs") |
| **Secondary Button Label**| `10` | `'600'` (SemiBold)| Auto | Standard | `#FFFFFF` (White) | Compact action buttons ("Book Now") |
| **Service Grid Label** | `11` | `'500'` (Medium) | `13` | Standard | `#111827` (Gray 900) | Grid item titles ("Airport Transfer", "Outstation Trips") |
| **Micro Feature Label** | `9.5` | `'500'` (Medium) | `12` | Standard | `#111827` (Gray 900) | 4-column benefit cards ("Verified Partners", "24x7 Support") |

---

## 2. Standardized Component Specifications

### 2.1 Hero Header & Branding Area
- **Brand Logo Asset (`mbgoLogo.png`)**:
  - `width`: `220`
  - `height`: `72`
  - `resizeMode`: `'contain'`
- **Hero Greeting Text Block**:
  ```tsx
  <Text style={{ fontSize: 12, fontWeight: '500', color: '#FF4500', marginBottom: 2 }}>Hello,</Text>
  <Text style={{ fontSize: 18, fontWeight: '500', color: '#0F172A', lineHeight: 25, letterSpacing: -0.2 }}>
    Where would you{'\n'}like to go today?
  </Text>
  ```

---

### 2.2 Section Headings
- **Design Rule**: Keep headings slim and readable using `fontSize: 14` with `'600'` weight to maintain a modern, uncluttered look.
  ```tsx
  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
    Popular Services
  </Text>
  ```

---

### 2.3 Action Buttons

#### Primary Action Button ("Search Cabs")
- **Container Height**: `38px`
- **Border Radius**: `10px`
- **Background Color**: `#FF3B00`
- **Code Reference**:
  ```tsx
  <TouchableOpacity
    onPress={handleSearchCabs}
    disabled={isSearching}
    style={{ 
      width: '100%', 
      height: 38, 
      backgroundColor: '#FF3B00', 
      borderRadius: 10, 
      flexDirection: 'row', 
      alignItems: 'center', 
      justify: 'center', 
      marginTop: 4 
    }}
  >
    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13, textAlign: 'center' }}>
      {isSearching ? 'Searching...' : 'Search Cabs'}
    </Text>
  </TouchableOpacity>
  ```

#### Secondary Action Button ("Book Now")
- **Background Color**: `#FF3B00`
- **Border Radius**: `8px`
- **Padding**: `paddingHorizontal: 14, paddingVertical: 6`
- **Code Reference**:
  ```tsx
  <TouchableOpacity 
    onPress={handleBookNow}
    style={{ backgroundColor: '#FF3B00', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 }}
  >
    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>Book Now</Text>
  </TouchableOpacity>
  ```

---

### 2.4 Promotional Banner Card & Image Blending

#### Color Palette & Blend Strategy
- **Card Background**: `#FDEDEA` (Soft Warm Peach matching graphic tone)
- **Card Border**: `#FCD7C8` (Subtle Peach Border)
- **Card Radius**: `16px`
- **Image Edge Fading Technique**:
  - Image Asset: `secondbannerImage.png`
  - Image Positioning: `width: '110%'`, `height: '100%'`, `marginLeft: '-5%'`, `resizeMode: 'contain'`.
  - Soft Feather Blur Overlay: `<View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 30, backgroundColor: '#FDEDEA', opacity: 0.75, zIndex: 1 }} />`.

#### Full Code Implementation
```tsx
<View style={{ backgroundColor: '#FDEDEA', borderWidth: 1, borderColor: '#FCD7C8', borderRadius: 16, minHeight: 115, justifyContent: 'center', marginTop: 4, position: 'relative', overflow: 'hidden', padding: 14 }}>
  {/* Right Side Illustration - Soft Feathered Blend & Margin Crop */}
  <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '62%', height: '100%', overflow: 'hidden', justifyContent: 'center', alignItems: 'flex-end' }}>
    <Image 
      source={SECOND_BANNER_IMAGE} 
      style={{ width: '110%', height: '100%', marginLeft: '-5%' }} 
      resizeMode="contain" 
    />
    {/* Soft Feather Blur Overlay on Left Image Edge */}
    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 30, backgroundColor: '#FDEDEA', opacity: 0.75, zIndex: 1 }} />
  </View>

  {/* Left Content Overlay - High Contrast Typography */}
  <View style={{ gap: 4, width: '46%', zIndex: 2 }}>
    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', lineHeight: 17 }}>
      Travel with comfort{'\n'}at the best prices
    </Text>
    <Text style={{ fontSize: 10, color: '#334155', fontWeight: '600' }}>Safe | Reliable | On-time</Text>
    <TouchableOpacity 
      onPress={handleBookNow}
      style={{ backgroundColor: '#FF3B00', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>Book Now</Text>
    </TouchableOpacity>
  </View>
</View>
```

---

## 3. General Layout & Spacing Rules

- **Main Container Gap**: `16px` between top-level screen sections (`View style={{ padding: 14, gap: 16 }}`).
- **Section Heading Padding**: `paddingTop: 8`, `gap: 10` above horizontal list / grid blocks.
- **Card Padding**: `14px` standard inner padding for interactive cards.
- **Zero Logic Impact**: All visual styling, typography props, and layout changes must be applied strictly to wrapper views and `Text`/`TouchableOpacity` style objects without touching hooks, handlers, or state logic.
