import os
import re

directories = ["src/components/custom/ItineraryPages", "src/components/custom"]

old_color = re.compile(r'#e28325', re.IGNORECASE)
new_color = "#fe5300"

for directory in directories:
    if not os.path.exists(directory):
        continue
    for filename in os.listdir(directory):
        if not filename.endswith('.tsx'):
            continue
        
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if old_color.search(content):
            content = old_color.sub(new_color, content)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated colors in {filename}")
