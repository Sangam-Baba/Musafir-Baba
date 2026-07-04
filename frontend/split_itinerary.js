const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src/components/custom/ItineraryTemplate.tsx');
const destDir = path.join(__dirname, 'src/components/custom/ItineraryPages');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const content = fs.readFileSync(srcPath, 'utf8');

// The file has standard React imports, forwardRef, helpers, and then the return statement with a giant div.
// Inside the return div, it has:
// {/* ========== PAGE 1: COVER IMAGE ========== */}
// ...
// {/* ========== PAGE 13: CONTACT US ========== */}

const pageNames = [
  'CoverPage', // 1
  'OverviewPage', // 2
  'BriefItineraryPage', // 3
  'InclusionsExclusionsPage', // 4
  'WhyTravelWithUsPage', // 5
  'PricingPaymentTermsPage', // 6
  'GroupDeparturePage', // 7
  'BookingProcessPage', // 8
  'TermsConditionsPage', // 9
  'CancellationPolicyPage', // 10
  'RegistrationsPage', // 11
  'TestimonialsPage', // 12
  'ContactUsPage' // 13
];

const splitPages = () => {
  const pageRegex = /\{\/\* ========== PAGE \d+:.+?========== \*\/\}/g;
  let matches = [];
  let match;
  while ((match = pageRegex.exec(content)) !== null) {
    matches.push({ index: match.index, text: match[0] });
  }

  // The very end of the return statement is:
  //       </div>
  //     );
  //   }
  // );
  const endReturnIndex = content.lastIndexOf('</div>\n    );\n  }\n);');

  const importsAndHelpers = content.substring(0, matches[0].index);
  const pagesContents = [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : endReturnIndex;
    let pageCode = content.substring(start, end).trim();
    // Some pages might end with a trailing </div> or have extra whitespace, but we just split at the comment.
    pagesContents.push(pageCode);
  }

  // Now write each page to a file
  pagesContents.forEach((pageCode, idx) => {
    const pageName = pageNames[idx];
    const fileContent = `import React from 'react';
import { MapPin, Clock, Plane, Star, Compass, Trees, Mountain, Utensils, Camera, Home, Bus, Activity, Bed, Headset, Percent, User, ShieldAlert, Shield, Calendar, Handshake, Users, AlertTriangle, Lock, Check, Hourglass, Building, CreditCard, Mail, Phone, Instagram, Globe } from 'lucide-react';
import { ItineraryItem } from '../ItineryDialog';
import { stripHtml } from '@/lib/utils';
import { getCorsBypassedUrl, getDayImage, getDayLocation, parseDescriptionPoints, getPointIcon, formatDescription, getInclusionIcon, getExclusionIcon, A4_WIDTH, A4_HEIGHT } from './shared';

export const ${pageName} = ({ title, description, itinerary, duration, img, highlights, destination, gallery, inclusions, exclusions, batch, topHighlights, itineraryPages }: any) => {
  return (
    <>
      ${pageCode}
    </>
  );
};
`;
    fs.writeFileSync(path.join(destDir, `${pageName}.tsx`), fileContent);
  });

  // Extract shared helpers (dirty but effective regex parsing of the top block)
  // We will just put the known helpers in shared.ts
  const sharedContent = `
import React from 'react';
import { MapPin, Clock, Plane, Star, Compass, Trees, Mountain, Utensils, Camera, Home, Bus, Activity, Bed, Headset, Percent, User, ShieldAlert, Shield, Calendar, Handshake, Users, AlertTriangle, Lock, Check, Hourglass, Building, CreditCard, Mail, Phone, Instagram, Globe } from 'lucide-react';
import { stripHtml } from '@/lib/utils';

export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;

export const getCorsBypassedUrl = (url?: string) => {
  if (!url) return url;
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return url.includes('?') ? \`\${url}&cors=true\` : \`\${url}?cors=true\`;
};

const fallbacks = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=600&auto=format&fit=crop'
];

export const getDayImage = (globalIdx: number, gallery: any) => {
  if (gallery && gallery.length > 0) {
    const imgObj = gallery[globalIdx % gallery.length];
    if (imgObj && imgObj.url) return getCorsBypassedUrl(imgObj.url);
  }
  return fallbacks[globalIdx % fallbacks.length];
};

export const getDayLocation = (titleText: string, defaultDest: string) => {
  let clean = stripHtml(titleText).replace(/^day\\s*\\d+\\s*[:\\-]?\\s*/i, '').trim();
  
  if (clean.toLowerCase().includes(' to ')) {
    const parts = clean.split(/\\s+to\\s+/i);
    clean = parts[parts.length - 1];
  } else if (clean.includes('-')) {
    const parts = clean.split('-');
    clean = parts[parts.length - 1];
  } else if (clean.includes('—')) {
    const parts = clean.split('—');
    clean = parts[parts.length - 1];
  }
  
  clean = clean.replace(/\\b(Arrival|Sightseeing|Departure|Trek|Transfer|Visit|Temple|Journey|Day)\\b/ig, '').trim();
  clean = clean.replace(/[.,\\/#!$%\\^&\\*;:{}=\\-_~()]/g, '').trim();
  
  if (!clean) return defaultDest || 'Travel';
  const words = clean.split(/\\s+/);
  return words.slice(0, 2).join(' ');
};

export const parseDescriptionPoints = (descHtml: string) => {
  if (!descHtml) return [];
  
  let cleaned = descHtml
    .replace(/<\\/p>/gi, '|@|')
    .replace(/<\\/li>/gi, '|@|')
    .replace(/<br\\s*\\/?>/gi, '|@|')
    .replace(/\\n/g, '|@|');
    
  cleaned = stripHtml(cleaned);
  
  const points = cleaned
    .split('|@|')
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 5);
    
  if (points.length <= 1) {
    const sentences = cleaned
      .split(/(?<=[.!?])\\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 5);
    if (sentences.length > 0) return sentences;
  }
  
  return points;
};

export const getPointIcon = (text: string) => {
  const s = text.toLowerCase();
  if (s.includes('pickup') || s.includes('drive') || s.includes('transfer') || s.includes('road') || s.includes('travel') || s.includes('ride') || s.includes('car') || s.includes('bus')) {
    return <Bus size={12} color="#ffffff" />;
  }
  if (s.includes('check-in') || s.includes('hotel') || s.includes('stay') || s.includes('overnight') || s.includes('room') || s.includes('resort')) {
    return <Home size={12} color="#ffffff" />;
  }
  if (s.includes('aarti') || s.includes('temple') || s.includes('witness') || s.includes('darshan') || s.includes('divine') || s.includes('blessing') || s.includes('spiritual')) {
    return <Activity size={12} color="#ffffff" />;
  }
  if (s.includes('dinner') || s.includes('breakfast') || s.includes('lunch') || s.includes('food') || s.includes('meal') || s.includes('restaurant')) {
    return <Utensils size={12} color="#ffffff" />;
  }
  if (s.includes('trek') || s.includes('mountain') || s.includes('hike') || s.includes('walk') || s.includes('climb')) {
    return <Mountain size={12} color="#ffffff" />;
  }
  if (s.includes('scenic') || s.includes('view') || s.includes('photography') || s.includes('photos') || s.includes('camera')) {
    return <Camera size={12} color="#ffffff" />;
  }
  return <Star size={12} color="#ffffff" />;
};

export const formatDescription = (descText: string) => {
  const clean = stripHtml(descText).trim();
  const words = clean.split(/\\s+/);
  if (words.length <= 2) {
    return <strong style={{ color: '#0f2133', fontWeight: 700 }}>{clean}</strong>;
  }
  const boldPart = words.slice(0, 2).join(' ');
  const normalPart = words.slice(2).join(' ');
  return (
    <span>
      <strong style={{ color: '#0f2133', fontWeight: 700 }}>{boldPart} </strong>
      {normalPart}
    </span>
  );
};

export const getInclusionIcon = (text: string) => {
  const s = text.toLowerCase();
  if (s.includes('traveller') || s.includes('tempo') || s.includes('cab') || s.includes('taxi') || s.includes('bus') || s.includes('car') || s.includes('transfer') || s.includes('transport')) {
    return <Bus size={13} color="#ffffff" />;
  }
  if (s.includes('stay') || s.includes('hotel') || s.includes('accommodation') || s.includes('sharing') || s.includes('room') || s.includes('resort')) {
    return <Bed size={13} color="#ffffff" />;
  }
  if (s.includes('meal') || s.includes('breakfast') || s.includes('dinner') || s.includes('lunch') || s.includes('veg') || s.includes('food')) {
    return <Utensils size={13} color="#ffffff" />;
  }
  if (s.includes('parking') || s.includes('toll') || s.includes('driver') || s.includes('charge')) {
    return <Activity size={13} color="#ffffff" />;
  }
  if (s.includes('sightseeing') || s.includes('tour') || s.includes('excursion') || s.includes('itinerary')) {
    return <Camera size={13} color="#ffffff" />;
  }
  if (s.includes('assistance') || s.includes('support') || s.includes('guide') || s.includes('helpline') || s.includes('24/7') || s.includes('throughout')) {
    return <Headset size={13} color="#ffffff" />;
  }
  return <Star size={13} color="#ffffff" />;
};

export const getExclusionIcon = (text: string) => {
  const s = text.toLowerCase();
  if (s.includes('personal') || s.includes('expense') || s.includes('shopping') || s.includes('laundry') || s.includes('tips') || s.includes('phone')) {
    return <User size={13} color="#ffffff" />;
  }
  if (s.includes('pony') || s.includes('doli') || s.includes('helicopter') || s.includes('ride') || s.includes('trek') || s.includes('charges')) {
    return <Activity size={13} color="#ffffff" />;
  }
  if (s.includes('entrance') || s.includes('ticket') || s.includes('fee') || s.includes('monument') || s.includes('temple') || s.includes('museum')) {
    return <Compass size={13} color="#ffffff" />;
  }
  if (s.includes('lunch') || s.includes('extra') || s.includes('meal') || s.includes('food')) {
    return <Utensils size={13} color="#ffffff" />;
  }
  if (s.includes('insurance') || s.includes('medical') || s.includes('hospital') || s.includes('doctor') || s.includes('medicine')) {
    return <ShieldAlert size={13} color="#ffffff" />;
  }
  if (s.includes('gst') || s.includes('tax') || s.includes('percent') || s.includes('%')) {
    return <Percent size={13} color="#ffffff" />;
  }
  return <Star size={13} color="#ffffff" />;
};
`;
  fs.writeFileSync(path.join(destDir, 'shared.tsx'), sharedContent);

  // Now create the new ItineraryTemplate.tsx
  const newTemplateContent = `
"use client";

import React, { forwardRef } from 'react';
import { ItineraryItem } from './ItineryDialog';
import { 
  CoverPage, OverviewPage, BriefItineraryPage, InclusionsExclusionsPage, 
  WhyTravelWithUsPage, PricingPaymentTermsPage, GroupDeparturePage, 
  BookingProcessPage, TermsConditionsPage, CancellationPolicyPage, 
  RegistrationsPage, TestimonialsPage, ContactUsPage 
} from './ItineraryPages';

export interface ItineraryTemplateProps {
  title: string;
  description: string;
  itinerary: ItineraryItem[];
  duration?: string;
  img?: string;
  highlights?: string[];
  destination?: string;
  gallery?: { url: string; alt: string }[];
  inclusions?: string[];
  exclusions?: string[];
  batch?: any[];
}

export const ItineraryTemplate = forwardRef<HTMLDivElement, ItineraryTemplateProps>(
  ({ title, description, itinerary, duration, img, highlights, destination, gallery, inclusions = [], exclusions = [], batch = [] }, ref) => {
    
    // Split itinerary into pages (3 items per page for good spacing)
    const ITEMS_PER_PAGE = 3;
    const itineraryPages: ItineraryItem[][] = [];
    if (itinerary && itinerary.length > 0) {
      for (let i = 0; i < itinerary.length; i += ITEMS_PER_PAGE) {
        itineraryPages.push(itinerary.slice(i, i + ITEMS_PER_PAGE));
      }
    }

    // Take first 4 highlights for the overview page
    const topHighlights = (highlights || []).slice(0, 4);

    const commonProps = {
      title, description, itinerary, duration, img, highlights, destination, gallery, inclusions, exclusions, batch, topHighlights, itineraryPages
    };

    return (
      <div 
        ref={ref} 
        className="handwritten-container"
        style={{ position: 'fixed', top: 0, left: '-9999px', opacity: 0.01, zIndex: -9999, pointerEvents: 'none' }}
      >
        <style dangerouslySetInnerHTML={{ __html: \`
          @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
          /* Increase line height slightly for handwritten cursive */
          .handwritten-container * {
            line-height: 1.4 !important;
          }
        \`}} />
        
        <CoverPage {...commonProps} />
        <OverviewPage {...commonProps} />
        <BriefItineraryPage {...commonProps} />
        <InclusionsExclusionsPage {...commonProps} />
        <WhyTravelWithUsPage {...commonProps} />
        <PricingPaymentTermsPage {...commonProps} />
        <GroupDeparturePage {...commonProps} />
        <BookingProcessPage {...commonProps} />
        <TermsConditionsPage {...commonProps} />
        <CancellationPolicyPage {...commonProps} />
        <RegistrationsPage {...commonProps} />
        <TestimonialsPage {...commonProps} />
        <ContactUsPage {...commonProps} />
        
      </div>
    );
  }
);

ItineraryTemplate.displayName = 'ItineraryTemplate';
`;
  
  fs.writeFileSync(path.join(destDir, 'index.ts'), `
export { CoverPage } from './CoverPage';
export { OverviewPage } from './OverviewPage';
export { BriefItineraryPage } from './BriefItineraryPage';
export { InclusionsExclusionsPage } from './InclusionsExclusionsPage';
export { WhyTravelWithUsPage } from './WhyTravelWithUsPage';
export { PricingPaymentTermsPage } from './PricingPaymentTermsPage';
export { GroupDeparturePage } from './GroupDeparturePage';
export { BookingProcessPage } from './BookingProcessPage';
export { TermsConditionsPage } from './TermsConditionsPage';
export { CancellationPolicyPage } from './CancellationPolicyPage';
export { RegistrationsPage } from './RegistrationsPage';
export { TestimonialsPage } from './TestimonialsPage';
export { ContactUsPage } from './ContactUsPage';
  `);

  // Move the original to a backup
  fs.renameSync(srcPath, srcPath + '.bak');
  // Write the new template
  fs.writeFileSync(srcPath, newTemplateContent);
  console.log("Splitting complete!");
};

splitPages();
