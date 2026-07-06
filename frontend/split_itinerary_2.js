const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src/components/custom/ItineraryTemplate.tsx');
const destDir = path.join(__dirname, 'src/components/custom/ItineraryPages');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

let content = fs.readFileSync(srcPath, 'utf8');

const pageNames = [
  'CoverPage', 'OverviewPage', 'BriefItineraryPage', 'InclusionsExclusionsPage', 
  'WhyTravelWithUsPage', 'PricingPaymentTermsPage', 'GroupDeparturePage', 
  'BookingProcessPage', 'TermsConditionsPage', 'CancellationPolicyPage', 
  'RegistrationsPage', 'TestimonialsPage', 'ContactUsPage'
];

const pageRegex = new RegExp("\\\\{\\\\/\\\\* ========== PAGE \\\\d+:.+?========== \\\\*\\\\/\\\\}", "g");
let matches = [];
let match;
while ((match = pageRegex.exec(content)) !== null) {
  matches.push({ index: match.index, text: match[0] });
}

const endReturnIndex = content.lastIndexOf('</div>\\n    );\\n  }\\n);');

const pagesContents = [];
for (let i = 0; i < matches.length; i++) {
  const start = matches[i].index;
  const end = i < matches.length - 1 ? matches[i + 1].index : endReturnIndex;
  pagesContents.push(content.substring(start, end).trim());
}

pagesContents.forEach((pageCode, idx) => {
  const pageName = pageNames[idx];
  const fileContent = "import React from 'react';\\n" +
  "import { MapPin, Clock, Plane, Star, Compass, Trees, Mountain, Utensils, Camera, Home, Bus, Activity, Bed, Headset, Percent, User, ShieldAlert, Shield, Calendar, Handshake, Users, AlertTriangle, Lock, Check, Hourglass, Building, CreditCard, Mail, Phone, Instagram, Globe } from 'lucide-react';\\n" +
  "import { ItineraryItem } from '../ItineryDialog';\\n" +
  "import { stripHtml } from '@/lib/utils';\\n" +
  "import { getCorsBypassedUrl, getDayImage, getDayLocation, parseDescriptionPoints, getPointIcon, formatDescription, getInclusionIcon, getExclusionIcon, A4_WIDTH, A4_HEIGHT } from './shared';\\n\\n" +
  "export const " + pageName + " = ({ title, description, itinerary, duration, img, highlights, destination, gallery, inclusions, exclusions, batch, topHighlights, itineraryPages }: any) => {\\n" +
  "  return (\\n" +
  "    <>\\n" +
  "      " + pageCode + "\\n" +
  "    </>\\n" +
  "  );\\n" +
  "};\\n";
  fs.writeFileSync(path.join(destDir, pageName + '.tsx'), fileContent);
});

// extract imports and helpers dynamically from the original file up to the first match
const topBlock = content.substring(0, matches[0].index);
// Find all exports and consts and put them in shared.tsx, removing the ItineraryTemplate definition
const startHelpers = topBlock.indexOf('const A4_WIDTH = 794;');
const endHelpers = topBlock.indexOf('export const ItineraryTemplate');
let helpers = "";
if (startHelpers !== -1 && endHelpers !== -1) {
    helpers = topBlock.substring(startHelpers, endHelpers);
}

const sharedContent = "import React from 'react';\\n" +
"import { MapPin, Clock, Plane, Star, Compass, Trees, Mountain, Utensils, Camera, Home, Bus, Activity, Bed, Headset, Percent, User, ShieldAlert, Shield, Calendar, Handshake, Users, AlertTriangle, Lock, Check, Hourglass, Building, CreditCard, Mail, Phone, Instagram, Globe } from 'lucide-react';\\n" +
"import { stripHtml } from '@/lib/utils';\\n\\n" +
"export " + helpers.replace(/const getDayImage/g, 'export const getDayImage')
  .replace(/const getDayLocation/g, 'export const getDayLocation')
  .replace(/const parseDescriptionPoints/g, 'export const parseDescriptionPoints')
  .replace(/const getPointIcon/g, 'export const getPointIcon')
  .replace(/const formatDescription/g, 'export const formatDescription')
  .replace(/const getInclusionIcon/g, 'export const getInclusionIcon')
  .replace(/const getExclusionIcon/g, 'export const getExclusionIcon')
  .replace(/const fallbacks/g, 'export const fallbacks');

fs.writeFileSync(path.join(destDir, 'shared.tsx'), sharedContent);

let indexTs = "";
pageNames.forEach(pn => {
  indexTs += "export { " + pn + " } from './" + pn + "';\\n";
});
fs.writeFileSync(path.join(destDir, 'index.ts'), indexTs);

const newTemplateContent = '"use client";\\n\\n' +
"import React, { forwardRef } from 'react';\\n" +
"import { ItineraryItem } from './ItineryDialog';\\n" +
"import { " + pageNames.join(', ') + " } from './ItineraryPages';\\n\\n" +
"export interface ItineraryTemplateProps {\\n" +
"  title: string;\\n" +
"  description: string;\\n" +
"  itinerary: ItineraryItem[];\\n" +
"  duration?: string;\\n" +
"  img?: string;\\n" +
"  highlights?: string[];\\n" +
"  destination?: string;\\n" +
"  gallery?: { url: string; alt: string }[];\\n" +
"  inclusions?: string[];\\n" +
"  exclusions?: string[];\\n" +
"  batch?: any[];\\n" +
"}\\n\\n" +
"export const ItineraryTemplate = forwardRef<HTMLDivElement, ItineraryTemplateProps>(\\n" +
"  ({ title, description, itinerary, duration, img, highlights, destination, gallery, inclusions = [], exclusions = [], batch = [] }, ref) => {\\n" +
"    const ITEMS_PER_PAGE = 3;\\n" +
"    const itineraryPages: ItineraryItem[][] = [];\\n" +
"    if (itinerary && itinerary.length > 0) {\\n" +
"      for (let i = 0; i < itinerary.length; i += ITEMS_PER_PAGE) {\\n" +
"        itineraryPages.push(itinerary.slice(i, i + ITEMS_PER_PAGE));\\n" +
"      }\\n" +
"    }\\n" +
"    const topHighlights = (highlights || []).slice(0, 4);\\n" +
"    const commonProps = { title, description, itinerary, duration, img, highlights, destination, gallery, inclusions, exclusions, batch, topHighlights, itineraryPages };\\n\\n" +
"    return (\\n" +
'      <div ref={ref} className="handwritten-container" style={{ position: \\'fixed\\', top: 0, left: \\'-9999px\\', opacity: 0.01, zIndex: -9999, pointerEvents: \\'none\\' }}>\\n' +
"        <style dangerouslySetInnerHTML={{ __html: \\\"@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap'); .handwritten-container * { line-height: 1.4 !important; }\\\" }} />\\n" +
pageNames.map(pn => "        <" + pn + " {...commonProps} />").join("\\n") + "\\n" +
"      </div>\\n" +
"    );\\n" +
"  }\\n" +
");\\n\\n" +
"ItineraryTemplate.displayName = 'ItineraryTemplate';\\n";

if (!fs.existsSync(srcPath + '.bak')) {
    fs.renameSync(srcPath, srcPath + '.bak');
}
fs.writeFileSync(srcPath, newTemplateContent);
console.log("Splitting complete!");
