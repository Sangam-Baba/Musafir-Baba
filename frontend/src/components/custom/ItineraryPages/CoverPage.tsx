import React from 'react';
import { PageWrapper, getCorsBypassedUrl } from './shared';

const decodeEntities = (html: string) => {
  return html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
};

export const CoverPage = ({ title, description, duration, destination, packageEssentials, img }: any) => {
  const mainTitle = title || 'Premium Journey';
  
  // Extract parsed rows
  const parsedRows: { label: string; value: string }[] = [];
  if (packageEssentials) {
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    let isFirstRow = true;
    while ((trMatch = trRegex.exec(packageEssentials)) !== null) {
      if (isFirstRow) { isFirstRow = false; continue; }
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let tdMatch;
      const tds = [];
      while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
        let cleanText = tdMatch[1].replace(/<[^>]*>?/gm, '').trim();
        cleanText = decodeEntities(cleanText);
        tds.push(cleanText);
      }
      if (tds.length >= 2) parsedRows.push({ label: tds[0], value: tds[1] });
    }
  }

  const getValue = (keywords: string[], fallback = '') => {
    const row = parsedRows.find(r => keywords.some(k => r.label.toLowerCase().includes(k)));
    return row ? row.value : fallback;
  };

  const pDuration = getValue(['duration', 'time'], duration || '10 N / 11 D');
  const pDestination = getValue(['destination', 'region'], destination || 'Char Dham, UK');
  const pIdeal = getValue(['ideal', 'group'], 'Pilgrims, Families, Groups');
  const pDeptCity = 'Delhi';
  const pRoute = getValue(['route', 'itinerary'], 'Delhi → Haridwar → Yamunotri → Gangotri → Kedarnath → Badrinath');
  const pSeason = getValue(['season', 'time to travel'], 'May-Jun & Sep-Oct');
  const pPrice = getValue(['price', 'cost'], 'On Request');
  const cleanDescription = description ? description.replace(/<[^>]*>?/gm, '').trim() : '';
  const priceMatch = pPrice.match(/[\d,]+/);
  const cleanPrice = priceMatch ? priceMatch[0] : pPrice;
  
  const bgImgUrl = img ? getCorsBypassedUrl(img) : 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop';

  return (
    <PageWrapper style={{ padding: 0, border: 'none', background: 'transparent' }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        {/* Full Bleed Background Image - Forced to absolute bounds to prevent flex stretching */}
        <img 
          src="/Itinerary/coverimage.png" 
          alt="Musafir Baba Cover" 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'fill', display: 'block', backgroundColor: '#fdfaf3' }} 
        />
        
        {/* Dynamic Overlay: Trip Duration */}
        <div style={{ 
          position: 'absolute', 
          top: '66.5%',      /* Placed directly beneath the TRIP DURATION title */
          left: '83%',       /* Horizontally centered in the last box */
          transform: 'translateX(-50%)',
          width: '24%',
          textAlign: 'center',
          fontFamily: "'Poppins', sans-serif",
          fontSize: '11px',
          fontWeight: 800,
          color: '#1b3a5c'
        }}>
          {pDuration}
        </div>

        {/* Dynamic Overlay: Price */}
        <div style={{ 
          position: 'absolute', 
          bottom: '12.5%',   /* Vertically centered between the top green label and bottom button */
          left: '20%',       /* Just to the right of the Rupee symbol */
          fontFamily: "'Poppins', sans-serif",
          fontSize: '28px',
          fontWeight: 900,
          color: '#fdfaf3',
          whiteSpace: 'nowrap'
        }}>
          {cleanPrice}
        </div>
      </div>
    </PageWrapper>
  );
};
