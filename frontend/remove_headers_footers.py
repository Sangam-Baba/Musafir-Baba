import os
import re

directory = os.path.join("src", "components", "custom", "ItineraryPages")

# Regex to match the Header block
# It starts with the comment and ends with the closing </div> of that block.
# Since it contains nested divs, a simple regex might be tricky. Let's use a robust string extraction or regex that balances tags.
# Actually, the header block is always followed by another block (e.g., Body Content or Title).
header_pattern = re.compile(r'\s*\{\/\* Header Image with clean website logo overlay.*?\*\/\}.*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>', re.DOTALL)

# A safer approach is to read the file and find the exact string if it's consistent, or parse carefully.
# The header structure is:
#           {/* Header Image ... */}
#           <div style={{ width: '100%', height: '175px' ... }}>
#             <img ... />
#             <div ...>
#               <img ... />
#             </div>
#           </div>
# It's exactly 26 lines long in most cases. Let's use a simpler approach:
# We find the index of "{/* Header Image" and the matching closing </div> by counting <div and </div.

def remove_block(content, start_marker):
    start_idx = content.find(start_marker)
    if start_idx == -1:
        return content
    
    # Find the first <div after the comment
    div_start = content.find('<div', start_idx)
    if div_start == -1:
        return content
    
    # Now count divs
    depth = 0
    idx = div_start
    while idx < len(content):
        # We need to find the next <div or </div
        next_open = content.find('<div', idx)
        next_close = content.find('</div', idx)
        
        if next_open != -1 and next_open < next_close:
            depth += 1
            idx = next_open + 4
        elif next_close != -1:
            depth -= 1
            idx = next_close + 6 # length of </div>
            if depth == 0:
                # found the matching closing div!
                # return the content without this block
                return content[:start_idx] + content[idx:]
        else:
            break
            
    return content

for filename in os.listdir(directory):
    if not filename.endswith('.tsx'):
        continue
    
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    
    # Remove headers (there might be multiple if it's BriefItineraryPage which has multiple pages in a loop)
    while True:
        prev = content
        content = remove_block(content, '{/* Header Image with clean website logo overlay')
        if content == prev:
            break

    # Remove footers
    # Footers are simpler:
    #           {/* Footer Image */}
    #           <div style={{ width: '100%', height: '72px', flexShrink: 0 }}>
    #             <img 
    #               src="/Itinerary/footer.png" 
    #               alt="Footer" 
    #               style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
    #             />
    #           </div>
    while True:
        prev = content
        content = remove_block(content, '{/* Footer Image */}')
        if content == prev:
            break
            
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filename}")
