import os

directory = "src/components/custom/ItineraryPages"

# Skip CoverPage.tsx
skip_files = ["CoverPage.tsx", "shared.tsx"]

replacements = [
    # 1. Global Page Background
    (
        "backgroundColor: '#fdfbf7', padding: '40px', boxSizing: 'border-box',",
        "background: 'linear-gradient(135deg, #fdfbf7 0%, #fff1e6 100%)', padding: '44px', boxSizing: 'border-box',"
    ),
    (
        'backgroundColor: "#fdfbf7", padding: "40px", boxSizing: "border-box",',
        'background: "linear-gradient(135deg, #fdfbf7 0%, #fff1e6 100%)", padding: "44px", boxSizing: "border-box",'
    ),
    # 2. Modernize Card Borders to Soft Shadows
    (
        "border: '1px solid #dce3eb'",
        "border: '1px solid rgba(254,83,0,0.08)', boxShadow: '0 12px 35px rgba(0,0,0,0.04)'"
    ),
    (
        "border: '1px solid #e2e8f0'",
        "border: '1px solid rgba(254,83,0,0.08)', boxShadow: '0 12px 35px rgba(0,0,0,0.04)'"
    ),
    # 3. Premium Navy Gradients for Headers
    (
        "backgroundColor: '#0f2133'",
        "background: 'linear-gradient(90deg, #0f2133 0%, #1e3a5f 100%)'"
    ),
    # 4. Premium Orange Gradients for Badges/Icons
    (
        "backgroundColor: '#fe5300'",
        "background: 'linear-gradient(135deg, #fe5300 0%, #ff8243 100%)'"
    ),
    # 5. Standardize Title colors to Navy instead of dark green
    (
        "color: '#0a422d'",
        "color: '#0f2133'"
    ),
    # 6. Change hard borders on polaroids/images to elegant glow/shadows
    (
        "border: '2px solid #fe5300'",
        "border: '2px solid #ffffff', boxShadow: '0 8px 25px rgba(254,83,0,0.2)'"
    ),
    (
        "border: '2px double #fe5300'",
        "border: '1px solid rgba(254,83,0,0.15)', boxShadow: '0 8px 25px rgba(254,83,0,0.15)'"
    ),
    # 7. Make the Day badge in Itinerary rounder
    (
        "borderRadius: '6px'",
        "borderRadius: '8px'"
    ),
    # 8. Soften text colors slightly for better contrast
    (
        "color: '#555'",
        "color: '#475569'"
    )
]

for filename in os.listdir(directory):
    if not filename.endswith('.tsx') or filename in skip_files:
        continue
    
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    
    for old_str, new_str in replacements:
        content = content.replace(old_str, new_str)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Redesigned {filename}")
