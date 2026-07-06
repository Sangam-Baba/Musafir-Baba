import React from 'react';
import { PageWrapper, luxuryTheme, getCorsBypassedUrl, getDayImage, parseDescriptionPoints, getPointIcon, formatDescription, PageFooter } from './shared';
import { stripHtml } from '@/lib/utils';
import { Route } from 'lucide-react';

export const DetailedItineraryPage = ({ itineraryPages, gallery, img }: any) => {

  return (
    <>
      {itineraryPages.map((pageItems: any[], pageIndex: number) => (
        <PageWrapper key={pageIndex}>
          {/* Page Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(229,231,235,0.6)', paddingBottom: '12px', fontSize: '10px', letterSpacing: '0.25em', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>
            <span>Detailed Path</span>
            <span>SECTION 03 / PAGE {4 + pageIndex}</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
            {pageItems.map((item, i) => {
              const ITEMS_PER_PAGE = 1;
              const globalIndex = (pageIndex * ITEMS_PER_PAGE) + i;
              const dayPoints = parseDescriptionPoints(item.description).slice(0, 4);

              let cleanTitle = stripHtml(item.title);
              let badgeVal = '';
              const match = cleanTitle.match(/\(([^)]+)\)/);
              if (match) {
                  badgeVal = match[1].trim();
                  cleanTitle = cleanTitle.replace(/\([^)]+\)/, '').trim();
              }
              // Strip "Day X:" prefix
              cleanTitle = cleanTitle.replace(/^Day\s*\d+:\s*/i, '').trim();
              // Make sure arrows look nice if they used text arrows
              cleanTitle = cleanTitle.replace(/-/g, '→').replace(/→>/g, '→');

              return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
                  
                  {/* Curved Main Destination Banner Box */}
                  <div style={{ position: 'relative', width: '100%', height: '260px', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(254,223,206,0.5)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
                    <img 
                      src={getDayImage(globalIndex, gallery, img)} 
                      alt={cleanTitle} 
                      crossOrigin="anonymous"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Bottom Subtle Vignette Overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent, transparent)' }}></div>
                  </div>

                  {/* Content Row Section */}
                  <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flex: 1 }}>
                    
                    {/* Left Side-Node Display Badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: luxuryTheme.dark, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFF', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', flexShrink: 0 }}>
                            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.025em' }}>
                                {(globalIndex + 1).toString().padStart(2, '0')}
                            </span>
                            <span style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: luxuryTheme.orange, marginTop: '4px' }}>
                                DAY
                            </span>
                        </div>
                    </div>

                    {/* Right Side Detailed Path Description Container */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        
                        {/* Main Header Title */}
                        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: luxuryTheme.dark, lineHeight: 1.3, letterSpacing: '-0.025em', margin: '0 0 8px 0' }}>
                            {cleanTitle}
                        </h1>

                        {/* Distance and Logistics Pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px' }}>
                            {badgeVal && badgeVal.split('/').map((d, bIdx) => {
                                const innerVal = d.trim();
                                return (
                                    <div key={bIdx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', backgroundColor: '#FFF3E8', border: '1px solid rgba(254,223,206,1)', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, color: luxuryTheme.orange, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <Route size={10} style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                                        <span>{innerVal}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Connected Timeline List */}
                        <div style={{ position: 'relative', paddingLeft: '32px', borderLeft: `2px solid rgba(254,223,206,0.8)`, marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '8px', paddingTop: '8px' }}>
                            
                            {dayPoints.length > 0 ? (
                                dayPoints.map((pt, pIdx) => (
                                    <div key={pIdx} style={{ position: 'relative' }}>
                                        {/* Left Node Icon */}
                                        <div style={{ position: 'absolute', left: '-47px', top: '2px', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FFF3E8', border: `1px solid rgba(254,223,206,1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', color: luxuryTheme.orange }}>
                                            {getPointIcon(pt)}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#4B5563', lineHeight: 1.6 }}>
                                            {formatDescription(pt, { fontWeight: 700, color: luxuryTheme.dark, marginRight: '6px' })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    {/* Left Node Icon */}
                                    <div style={{ position: 'absolute', left: '-47px', top: '2px', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FFF3E8', border: `1px solid rgba(254,223,206,1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', color: luxuryTheme.orange }}>
                                        <Route size={12} />
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#4B5563', lineHeight: 1.6 }}>
                                        {stripHtml(item.description) || cleanTitle}
                                    </div>
                                </div>
                            )}

                        </div>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          <PageFooter />
        </PageWrapper>
      ))}
    </>
  );
};
