import React from 'react';
import { PageWrapper, luxuryTheme, getDayImage, parseDescriptionPoints, getPointIcon, formatDescription, PageFooter } from './shared';
import { stripHtml } from '@/lib/utils';
import { Route, Car, Bed, Utensils, Camera, Headset, ShieldCheck, Clock, MapPin } from 'lucide-react';

export const DetailedItineraryPage = ({ itinerary, gallery, img }: any) => {
  // Chunk itinerary by 2 items per page to match reference
  const rawItinerary = itinerary || [];
  const chunkedPages = [];
  for (let i = 0; i < rawItinerary.length; i += 2) {
    chunkedPages.push(rawItinerary.slice(i, i + 2));
  }

  // Use the same 6px border and padding from CoverPage for consistency
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .day-page-container {
          font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
          width: 100%;
          height: 100%;
          border: 6px solid #1b3a5c;
          position: relative;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #ffffff 0%, #f0f6fe 100%);
          color: #1b3a5c;
          overflow: hidden;
        }
        .header-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 60mm;
          background-image: url('${img || ''}');
          background-size: cover;
          background-position: center 30%;
          opacity: 0.15;
          z-index: 0;
          pointer-events: none;
        }
        .header-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, #f0f6fe 0%, rgba(240, 246, 254, 0.6) 40%, #f0f6fe 100%);
        }

        .dp-content-area {
          flex: 1; padding: 0 6mm 32mm 6mm; display: flex; flex-direction: column; gap: 2mm; position: relative; z-index: 1;
        }
        .day-card {
          display: flex; border-radius: 8px; background: #fff; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); min-height: 220px;
        }
        .dc-left {
          width: 75px; display: flex; flex-direction: column; align-items: center; padding: 4mm 2px; color: #fff; position: relative;
        }
        .dc-left-top { font-size: 35px; opacity: 0.3; margin-bottom: auto; }
        .dc-left-num { font-family: 'Playfair Display', serif; font-size: 45px; font-weight: 800; line-height: 1; }
        .dc-left-day { font-size: 25px; font-weight: 700; letter-spacing: 2px; margin-top: 1px; }
        .dc-left-bottom { font-size: 35px; opacity: 0.3; margin-top: auto; }

        .dc-mid {
          flex: 1.2; padding: 2mm 3mm; display: flex; flex-direction: column;
        }
        .dc-title { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 800; color: #1b3a5c; line-height: 1.3; margin-bottom: 1.5mm; }
        .dc-pills { display: flex; gap: 6px; margin-bottom: 2mm; }
        .dc-pill { background: #f4f6f8; border: 1px solid #e5e5e5; border-radius: 12px; padding: 4px 10px; font-size: 9px; font-weight: 700; color: #1b3a5c; display: flex; align-items: center; gap: 4px; }
        .dc-pill svg { width: 12px; height: 12px; color: #4a8c3f; }
        
        .dc-timeline {
          flex: 1; display: flex; flex-direction: column; gap: 2.5mm; position: relative; padding-left: 24px; border-left: 1.5px dashed #c1d5cb; margin-left: 8px; padding-top: 2px; padding-bottom: 2px;
        }
        .dc-point { position: relative; font-size: 11.5px; color: #444; line-height: 1.5; }
        .dc-point-icon { position: absolute; left: -32px; top: 0; width: 16px; height: 16px; border-radius: 50%; background: #4a8c3f; display: flex; align-items: center; justify-content: center; color: #fff; }
        .dc-point-icon svg { width: 10px; height: 10px; }

        .dc-right {
          width: 320px; padding: 2mm; display: flex; flex-direction: column; gap: 2mm; min-height: 0;
        }
        .dc-img-box {
          flex: 1; border-radius: 6px; overflow: hidden; position: relative; background: #ccc; min-height: 0;
        }
        .dc-img-overlay {
          position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,68,57,0.9), rgba(0,68,57,0.4), transparent); padding: 35px 12px 12px; color: #fff;
        }
        .dc-img-title { font-family: 'Yellowtail', cursive; font-size: 24px; line-height: 1; margin-bottom: 4px; }
        .dc-img-desc { font-size: 10px; font-weight: 600; opacity: 0.9; }
        .dc-highlight {
          background: #ffffff; border: 1px solid #e5e5e5; border-radius: 6px; padding: 2.5mm; display: flex; gap: 8px; align-items: flex-start; flex-shrink: 0;
        }
        .dc-highlight-icon { width: 18px; height: 18px; flex-shrink: 0; }
        .dc-highlight-text { font-size: 9px; color: #555; line-height: 1.5; }
        .dc-highlight-title { font-size: 10px; font-weight: 800; color: #004439; margin-bottom: 2px; letter-spacing: 0.5px; }

      `}} />

      {chunkedPages.map((pageItems: any[], pageIndex: number) => (
        <PageWrapper key={pageIndex} style={{ padding: 0, border: 'none', background: 'transparent' }}>
          <div className="day-page-container">
            <div className="header-bg"></div>
            
            <img 
              src="/Itinerary/daywiseheader.png" 
              alt="Day Wise Planner Header" 
              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain', margin: '0 auto 4mm', position: 'relative', zIndex: 1 }} 
            />

            {/* Day Cards */}
            <div className="dp-content-area">
              {pageItems.map((item, i) => {
                const globalIndex = (pageIndex * 2) + i;
                const dayPoints = parseDescriptionPoints(item.description).slice(0, 4);

                let cleanTitle = stripHtml(item.title);
                let badgeVal = '';
                const match = cleanTitle.match(/\(([^)]+)\)/);
                if (match) {
                    badgeVal = match[1].trim();
                    cleanTitle = cleanTitle.replace(/\([^)]+\)/, '').trim();
                }
                cleanTitle = cleanTitle.replace(/^Day\s*\d+:\s*/i, '').trim();
                cleanTitle = cleanTitle.replace(/-/g, '→').replace(/→>/g, '→');

                const isEven = globalIndex % 2 === 0;
                const sidebarBg = isEven ? '#004439' : '#153a5c';
                const sidebarAccent = isEven ? '#f39a2b' : '#8db4f5';
                const highlightColor = isEven ? '#004439' : '#153a5c';

                return (
                  <div className="day-card" key={i} style={{ border: `1px solid ${sidebarBg}` }}>
                    {/* Left Sidebar */}
                    <div className="dc-left" style={{ background: sidebarBg, borderRight: `2px solid ${sidebarAccent}` }}>
                      <div className="dc-left-top">⛰️</div>
                      <div className="dc-left-num">{(globalIndex + 1).toString().padStart(2, '0')}</div>
                      <div className="dc-left-day" style={{ color: sidebarAccent }}>DAY</div>
                      <div className="dc-left-bottom">🏛️</div>
                    </div>

                    {/* Middle Content */}
                    <div className="dc-mid">
                      <div className="dc-title">{cleanTitle}</div>
                      <div className="dc-pills">
                        {badgeVal && badgeVal.split('/').map((d, bIdx) => (
                          <div className="dc-pill" key={bIdx}>
                            {bIdx === 0 ? <Car /> : <Clock />}
                            {d.trim()}
                          </div>
                        ))}
                      </div>
                      
                      <div className="dc-timeline">
                        {dayPoints.length > 0 ? (
                          dayPoints.map((pt, pIdx) => (
                            <div className="dc-point" key={pIdx}>
                              <div className="dc-point-icon">{getPointIcon(pt)}</div>
                              {formatDescription(pt, { fontWeight: 700, color: '#1b3a5c', marginRight: '4px' })}
                            </div>
                          ))
                        ) : (
                          <div className="dc-point">
                            <div className="dc-point-icon"><Route /></div>
                            {stripHtml(item.description) || cleanTitle}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Media */}
                    <div className="dc-right">
                      <div className="dc-img-box">
                        <img 
                          src={item.locationImage?.url || getDayImage(globalIndex, gallery, img)} 
                          alt={cleanTitle} 
                          crossOrigin="anonymous"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                        />
                        <div className="dc-img-overlay">
                          <div className="dc-img-title">{cleanTitle.split('→')[0].trim()} Destination</div>
                          <div className="dc-img-desc">Journey of discovery</div>
                        </div>
                      </div>
                      <div className="dc-highlight">
                        <MapPin className="dc-highlight-icon" style={{ color: highlightColor }} />
                        <div>
                          <div className="dc-highlight-title" style={{ color: highlightColor }}>DIVINE HIGHLIGHT</div>
                          <div className="dc-highlight-text">
                            {item.tip || `Experience the spiritual and natural beauty of ${cleanTitle.split('→')[0].trim()}. A must-visit for every traveler seeking peace.`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Footer */}
            <PageFooter style={{ bottom: 0, left: 0, width: '100%' }} />
          </div>
        </PageWrapper>
      ))}
    </>
  );
};
