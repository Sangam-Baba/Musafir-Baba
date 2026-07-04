import os
import re

src_path = os.path.join("src", "components", "custom", "ItineraryTemplate.tsx")
dest_dir = os.path.join("src", "components", "custom", "ItineraryPages")
os.makedirs(dest_dir, exist_ok=True)

with open(src_path, "r", encoding="utf-8") as f:
    content = f.read()

page_names = [
    'CoverPage', 'OverviewPage', 'BriefItineraryPage', 'InclusionsExclusionsPage',
    'WhyTravelWithUsPage', 'PricingPaymentTermsPage', 'GroupDeparturePage',
    'BookingProcessPage', 'TermsConditionsPage', 'CancellationPolicyPage',
    'RegistrationsPage', 'TestimonialsPage', 'ContactUsPage'
]

pattern = re.compile(r'\{\/\* ========== PAGE \d+:.+?========== \*\/\}')
matches = [m for m in pattern.finditer(content)]
end_return_index = content.rfind('</div>\n    );\n  }\n);')

pages_contents = []
for i in range(len(matches)):
    start = matches[i].start()
    end = matches[i+1].start() if i < len(matches) - 1 else end_return_index
    pages_contents.append(content[start:end].strip())

imports = "import React from 'react';\n"
imports += "import { MapPin, Clock, Plane, Star, Compass, Trees, Mountain, Utensils, Camera, Home, Bus, Activity, Bed, Headset, Percent, User, ShieldAlert, Shield, Calendar, Handshake, Users, AlertTriangle, Lock, Check, Hourglass, Building, CreditCard, Mail, Phone, Instagram, Globe } from 'lucide-react';\n"
imports += "import { ItineraryItem } from '../ItineryDialog';\n"
imports += "import { stripHtml } from '@/lib/utils';\n"
imports += "import { getCorsBypassedUrl, getDayImage, getDayLocation, parseDescriptionPoints, getPointIcon, formatDescription, getInclusionIcon, getExclusionIcon, A4_WIDTH, A4_HEIGHT } from './shared';\n\n"

for idx, page_code in enumerate(pages_contents):
    page_name = page_names[idx]
    file_content = imports + "export const " + page_name + " = ({ title, description, itinerary, duration, img, highlights, destination, gallery, inclusions, exclusions, batch, topHighlights, itineraryPages }: any) => {\n"
    file_content += "  return (\n    <>\n      " + page_code + "\n    </>\n  );\n};\n"
    with open(os.path.join(dest_dir, f"{page_name}.tsx"), "w", encoding="utf-8") as f:
        f.write(file_content)

top_block = content[:matches[0].start()]
start_helpers = top_block.find('const A4_WIDTH = 794;')
end_helpers = top_block.find('export const ItineraryTemplate')

helpers = top_block[start_helpers:end_helpers] if start_helpers != -1 else ""
helpers = helpers.replace('const getDayImage', 'export const getDayImage')
helpers = helpers.replace('const getDayLocation', 'export const getDayLocation')
helpers = helpers.replace('const parseDescriptionPoints', 'export const parseDescriptionPoints')
helpers = helpers.replace('const getPointIcon', 'export const getPointIcon')
helpers = helpers.replace('const formatDescription', 'export const formatDescription')
helpers = helpers.replace('const getInclusionIcon', 'export const getInclusionIcon')
helpers = helpers.replace('const getExclusionIcon', 'export const getExclusionIcon')
helpers = helpers.replace('const fallbacks', 'export const fallbacks')

shared_content = "import React from 'react';\n"
shared_content += "import { MapPin, Clock, Plane, Star, Compass, Trees, Mountain, Utensils, Camera, Home, Bus, Activity, Bed, Headset, Percent, User, ShieldAlert, Shield, Calendar, Handshake, Users, AlertTriangle, Lock, Check, Hourglass, Building, CreditCard, Mail, Phone, Instagram, Globe } from 'lucide-react';\n"
shared_content += "import { stripHtml } from '@/lib/utils';\n\n"
shared_content += "export " + helpers

with open(os.path.join(dest_dir, "shared.tsx"), "w", encoding="utf-8") as f:
    f.write(shared_content)

with open(os.path.join(dest_dir, "index.ts"), "w", encoding="utf-8") as f:
    for pn in page_names:
        f.write(f"export {{ {pn} }} from './{pn}';\n")

import_string = ", ".join(page_names)
components_string = "\n".join(["        <" + pn + " {...commonProps} />" for pn in page_names])

new_template_content = '"use client";\n\n'
new_template_content += "import React, { forwardRef } from 'react';\n"
new_template_content += "import { ItineraryItem } from './ItineryDialog';\n"
new_template_content += "import { " + import_string + " } from './ItineraryPages';\n\n"
new_template_content += "export interface ItineraryTemplateProps {\n"
new_template_content += "  title: string;\n  description: string;\n  itinerary: ItineraryItem[];\n  duration?: string;\n  img?: string;\n  highlights?: string[];\n  destination?: string;\n  gallery?: { url: string; alt: string }[];\n  inclusions?: string[];\n  exclusions?: string[];\n  batch?: any[];\n}\n\n"
new_template_content += "export const ItineraryTemplate = forwardRef<HTMLDivElement, ItineraryTemplateProps>(\n"
new_template_content += "  ({ title, description, itinerary, duration, img, highlights, destination, gallery, inclusions = [], exclusions = [], batch = [] }, ref) => {\n"
new_template_content += "    const ITEMS_PER_PAGE = 3;\n"
new_template_content += "    const itineraryPages: ItineraryItem[][] = [];\n"
new_template_content += "    if (itinerary && itinerary.length > 0) {\n"
new_template_content += "      for (let i = 0; i < itinerary.length; i += ITEMS_PER_PAGE) {\n"
new_template_content += "        itineraryPages.push(itinerary.slice(i, i + ITEMS_PER_PAGE));\n"
new_template_content += "      }\n    }\n"
new_template_content += "    const topHighlights = (highlights || []).slice(0, 4);\n"
new_template_content += "    const commonProps = { title, description, itinerary, duration, img, highlights, destination, gallery, inclusions, exclusions, batch, topHighlights, itineraryPages };\n\n"
new_template_content += "    return (\n"
new_template_content += "      <div ref={ref} className=\"handwritten-container\" style={{ position: 'fixed', top: 0, left: '-9999px', opacity: 0.01, zIndex: -9999, pointerEvents: 'none' }}>\n"
new_template_content += '        <style dangerouslySetInnerHTML={{ __html: "@import url(\'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap\'); .handwritten-container * { line-height: 1.4 !important; }" }} />\n'
new_template_content += components_string + "\n"
new_template_content += "      </div>\n    );\n  }\n);\n\n"
new_template_content += "ItineraryTemplate.displayName = 'ItineraryTemplate';\n"

if not os.path.exists(src_path + '.bak'):
    import shutil
    shutil.move(src_path, src_path + '.bak')
with open(src_path, "w", encoding="utf-8") as f:
    f.write(new_template_content)

print("Split completed successfully.")
