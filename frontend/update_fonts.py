import os

pages_dir = os.path.join("src", "components", "custom", "ItineraryPages")
template_file = os.path.join("src", "components", "custom", "ItineraryTemplate.tsx")

# 1. Update ItineraryPages font families
old_font = "fontFamily: \"'Caveat', cursive, system-ui, -apple-system, sans-serif\""
new_font = "fontFamily: \"'Inter', sans-serif\""

for filename in os.listdir(pages_dir):
    if not filename.endswith('.tsx'):
        continue
    
    filepath = os.path.join(pages_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if old_font in content:
        content = content.replace(old_font, new_font)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated font in {filename}")

# 2. Update ItineraryTemplate.tsx font import
with open(template_file, 'r', encoding='utf-8') as f:
    template_content = f.read()

old_import = "@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');"
new_import = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');"

if old_import in template_content:
    template_content = template_content.replace(old_import, new_import)
    # Also adjust line-height if it's 1.4 !important to 1.5
    template_content = template_content.replace("line-height: 1.4 !important;", "line-height: 1.5 !important;")
    with open(template_file, 'w', encoding='utf-8') as f:
        f.write(template_content)
    print("Updated font import in ItineraryTemplate.tsx")
