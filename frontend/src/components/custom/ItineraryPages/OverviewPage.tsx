import React from 'react';
import { Mountain, Compass, Star, Bus, Bed, Utensils, Shield, Activity, Camera, Home, Calendar } from 'lucide-react';
import { PageWrapper, luxuryTheme, getCorsBypassedUrl, PageFooter } from './shared';
import { stripHtml } from '@/lib/utils';

export const OverviewPage = ({ title, description, duration, img, destination, packageEssentials }: any) => {
  // Extract parsed rows from packageEssentials
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
        tds.push(cleanText);
      }
      if (tds.length >= 2) parsedRows.push({ label: tds[0], value: tds[1] });
    }
  }

  const getValue = (keywords: string[], fallback: string | null = null) => {
    const row = parsedRows.find(r => keywords.some(k => r.label.toLowerCase().includes(k)));
    return row ? row.value : fallback;
  };

  const pDuration = getValue(['duration', 'time'], duration);
  const pState = getValue(['state', 'destination', 'region'], destination);
  const pTravelMode = getValue(['mode of travel']);
  const pAltitude = getValue(['altitude', 'elevation']);

  return (
    <PageWrapper>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0 }}>Package Overview</h2>
          <div style={{ width: '64px', height: '2.5px', backgroundColor: luxuryTheme.gold, margin: '2px 0 6px' }}></div>
          
          {/* Framed Image Segment - Enlarged and borders updated */}
          {img && (
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '250px', width: '100%', border: `1px solid ${luxuryTheme.orange}`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <img src={getCorsBypassedUrl(img)} alt="Overview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
            </div>
          )}

          <p style={{ fontSize: '15.5px', color: '#333', lineHeight: 1.7, maxWidth: '100%', margin: 0, textAlign: 'justify', display: '-webkit-box', WebkitLineClamp: 9, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {(() => {
              const baseText = stripHtml(description);
              const fullText = baseText.length < 150 
                ? baseText + " We believe that an exceptional, unforgettable expedition begins long before you arrive at your destination. It begins as a spark of wanderlust, and our lifelong passion is turning that unique dream into a beautifully polished, completely effortless reality. At Musafirbaba, we understand that no two travellers share the same perspective, and no single path defines a 'perfect' getaway. We co-create with you, matching your unique requirements with pristine boutique lodging and premium private transit setups to provide complete, unmatched peace of mind."
                : baseText;
              return fullText;
            })()}
          </p>
          <div style={{ marginTop: '2px' }}>
            <a href="https://musafirbaba.com" target="_blank" rel="noreferrer" style={{ fontSize: '13.5px', color: luxuryTheme.orange, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', display: 'inline-block' }}>read more</a>
          </div>
        </div>



        {/* Key Meta Information */}
        {/* Key Meta Information - Centered Redesign */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
          {pDuration && (
            <div style={{ padding: '24px 16px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}66`, backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', minHeight: '130px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: `${luxuryTheme.gold}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={20} color={luxuryTheme.orange} strokeWidth={2.5} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: luxuryTheme.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Duration</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: luxuryTheme.dark, whiteSpace: 'nowrap', textAlign: 'center' }}>{pDuration}</span>
              </div>
            </div>
          )}
          {pState && (
            <div style={{ padding: '24px 16px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}66`, backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', minHeight: '130px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: `${luxuryTheme.gold}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Compass size={20} color={luxuryTheme.orange} strokeWidth={2.5} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: luxuryTheme.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>State / Region</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: luxuryTheme.dark, whiteSpace: 'nowrap', textAlign: 'center' }}>{pState}</span>
              </div>
            </div>
          )}
          {pTravelMode && (
            <div style={{ padding: '24px 16px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}66`, backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', minHeight: '130px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: `${luxuryTheme.gold}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bus size={20} color={luxuryTheme.orange} strokeWidth={2.5} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: luxuryTheme.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Mode of Travel</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: luxuryTheme.dark, whiteSpace: 'nowrap', textAlign: 'center' }}>{pTravelMode}</span>
              </div>
            </div>
          )}
          {pAltitude && (
            <div style={{ padding: '24px 16px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}66`, backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', minHeight: '130px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: `${luxuryTheme.gold}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mountain size={20} color={luxuryTheme.orange} strokeWidth={2.5} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: luxuryTheme.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Altitude</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: luxuryTheme.dark, whiteSpace: 'nowrap', textAlign: 'center' }}>{pAltitude}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <PageFooter />
    </PageWrapper>
  );
};
