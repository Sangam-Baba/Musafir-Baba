import os

directory = os.path.join("src", "components", "custom", "ItineraryPages")

for filename in os.listdir(directory):
    if not filename.endswith('.tsx'):
        continue
    
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    
    # We replace the backgroundColor line with itself plus padding and boxSizing
    # Some pages might have a trailing comma, some might not. It's usually `backgroundColor: '#fdfbf7',`
    content = content.replace("backgroundColor: '#fdfbf7',", "backgroundColor: '#fdfbf7', padding: '40px', boxSizing: 'border-box',")
    content = content.replace('backgroundColor: "#fdfbf7",', 'backgroundColor: "#fdfbf7", padding: "40px", boxSizing: "border-box",')
            
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filename}")
