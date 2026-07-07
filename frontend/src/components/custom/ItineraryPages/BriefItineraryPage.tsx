import React from 'react';
import { PageWrapper, luxuryTheme, PageFooter, getCorsBypassedUrl } from './shared';
import { stripHtml } from '@/lib/utils';
import { Shield, Clock, Map, Route, Activity, Mountain, Plane, Car, Home, Compass, Camera, Trees, MapPin } from 'lucide-react';

export const BriefItineraryPage = ({ title, itinerary, img, gallery = [] }: any) => {

  const cleanRoute = (t: string) => {
    let clean = t.replace(/^day\s*\d+\s*[:\-]?\s*/i, '').trim();
    clean = stripHtml(clean);
    return clean;
  };

  const getSubTitle = (idx: number, len: number) => {
    if (idx === 0) return 'Arrival & Welcome • Briefing & Premium Check-in';
    if (idx === len - 1) return 'Final Breakfast • Departure Transit';
    return 'Premium Transit • Darshan & Sightseeing';
  };

  const getBadgeIcon = (val: string) => {
    const s = val.toLowerCase();
    if (s.includes('hr') || s.includes('min') || s.includes('day')) return <Clock size={8} />;
    if (s.includes('trek') || s.includes('walk')) return <Activity size={8} />;
    return <Route size={8} />;
  };

  // Determine images to use for postcards
  const postcardImg1 = img || (gallery.length > 0 ? gallery[0].url : 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop');
  const postcardImg2 = gallery.length > 1 ? gallery[1].url : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop';
  const postcardImg3 = gallery.length > 2 ? gallery[2].url : 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop';

  return (
    <PageWrapper style={{ backgroundColor: '#FFFDFB', padding: '32px 48px' }}>
      


      {/* Page Title Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', paddingBottom: '12px', borderBottom: `1px dashed ${luxuryTheme.gold}55`, marginTop: '32px' }}>
          <div>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.2em', color: luxuryTheme.orange, display: 'block', marginBottom: '4px' }}>JOURNEY AT A GLANCE</span>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '28px', color: luxuryTheme.dark, margin: '0 0 8px 0', lineHeight: 1 }}>Day Wise Planner</h2>
              <div style={{ width: '64px', height: '2.5px', backgroundColor: luxuryTheme.orange, borderRadius: '2px' }}></div>
          </div>
          <div style={{ textAlign: 'right', maxWidth: '300px' }}>
              <p style={{ fontSize: '12px', color: luxuryTheme.gray, fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
                  "A curated summary of your day-by-day group transit and scenic explorations across the majestic landscape."
              </p>
          </div>
      </div>

      {/* Split Two-Column Layout */}
      <div style={{ display: 'flex', gap: '32px', marginTop: '24px', flex: 1, overflow: 'hidden' }}>
          
          {/* Left Column: Agenda Timeline (Takes ~58% width) */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '18px', flex: '0 0 58%', paddingLeft: '4px', overflowY: 'hidden' }}>
              
              {/* Continuous track line */}
              <div style={{ position: 'absolute', top: '20px', bottom: '20px', left: '22px', width: '1.5px', background: `linear-gradient(to bottom, ${luxuryTheme.orange}40 0%, ${luxuryTheme.orange} 50%, ${luxuryTheme.orange}40 100%)`, zIndex: 0 }}></div>

              {itinerary.slice(0, 11).map((item: any, idx: number) => {
                let clean = cleanRoute(item.title);
                let badgeVal = '';
                const match = clean.match(/\(([^)]+)\)/);
                if (match) {
                    badgeVal = match[1].trim();
                    clean = clean.replace(/\([^)]+\)/, '').trim();
                }

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative', zIndex: 10 }}>
                      
                      {/* Left Node */}
                      <div style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#FFFDFB', border: `2px solid ${luxuryTheme.orange}33`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative', zIndex: 20 }}>
                          <span style={{ fontSize: '6px', color: luxuryTheme.gray, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.05em', lineHeight: 1 }}>DAY</span>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: luxuryTheme.orange, fontFamily: "'Playfair Display', serif", lineHeight: 1, marginTop: '2px' }}>{(idx + 1).toString().padStart(2, '0')}</span>
                      </div>

                      {/* Center Panel */}
                      <div style={{ flexGrow: 1, backgroundColor: '#FFF', border: `1px solid ${luxuryTheme.gold}33`, borderRadius: '12px', padding: '16px 20px', boxShadow: '0 4px 20px -4px rgba(224, 90, 54, 0.04), 0 2px 10px -2px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                              <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: luxuryTheme.dark, margin: 0, lineHeight: 1.3, flex: 1 }}>
                                  {clean}
                              </h4>
                              {badgeVal && (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0, maxWidth: '55%' }}>
                                    {badgeVal.split('/').map((d, i) => {
                                        const innerVal = d.trim();
                                        return (
                                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '7.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: `${luxuryTheme.orange}0D`, color: luxuryTheme.orange, border: `1px solid ${luxuryTheme.orange}1A`, padding: '4px 8px', borderRadius: '999px', flexShrink: 0, whiteSpace: 'nowrap', marginTop: '2px' }}>
                                                {getBadgeIcon(innerVal)}
                                                {innerVal}
                                            </span>
                                        );
                                    })}
                                </div>
                              )}
                          </div>

                      </div>
                  </div>
                );
              })}
          </div>

          {/* Right Column: Postcards (Takes ~42% width) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: '1', paddingTop: '4px' }}>
              
              {/* Postcard 1 */}
              <div style={{ backgroundColor: '#FFF', padding: '8px 8px 14px 8px', borderRadius: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', border: `1px solid ${luxuryTheme.gold}22`, transform: 'rotate(-2deg)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-8px', left: '30%', width: '60px', height: '20px', backgroundColor: `${luxuryTheme.orange}33`, backdropFilter: 'blur(2px)', transform: 'rotate(-3deg)', zIndex: 20 }}></div>
                  
                  <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/9', backgroundColor: '#F5F5F5', borderRadius: '2px', marginBottom: '8px' }}>
                      <img src={getCorsBypassedUrl(postcardImg1)} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Memories" />
                      <div style={{ position: 'absolute', top: '6px', right: '6px', width: '32px', height: '32px', borderRadius: '50%', border: `2px dashed ${luxuryTheme.orange}CC`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', transform: 'rotate(12deg)' }}>
                          <span style={{ fontSize: '5px', fontWeight: 800, color: luxuryTheme.orange }}>VERIFIED</span>
                          <span style={{ fontSize: '3px', color: luxuryTheme.orange }}>HIGHLANDS</span>
                      </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Caveat', 'Brush Script MT', cursive", fontSize: '16px', color: '#444', margin: 0, lineHeight: 1.2 }}>
                          Designing our dream customized route with style!
                      </p>
                  </div>
              </div>

              {/* Postcard 2 */}
              <div style={{ backgroundColor: '#FFF', padding: '8px 8px 14px 8px', borderRadius: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: `1px solid ${luxuryTheme.gold}22`, transform: 'rotate(3deg)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-8px', left: '30%', width: '60px', height: '20px', backgroundColor: `${luxuryTheme.orange}33`, backdropFilter: 'blur(2px)', transform: 'rotate(-3deg)', zIndex: 20 }}></div>
                  <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/9', backgroundColor: '#F5F5F5', borderRadius: '2px', marginBottom: '8px' }}>
                      <img src={getCorsBypassedUrl(postcardImg2)} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(0.1) contrast(1.05)' }} alt="Memories 2" />
                      <div style={{ position: 'absolute', top: '6px', right: '6px', width: '32px', height: '32px', borderRadius: '50%', border: `2px dashed ${luxuryTheme.orange}CC`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', transform: 'rotate(-10deg)' }}>
                          <span style={{ fontSize: '4px', fontWeight: 800, color: luxuryTheme.orange }}>PREMIUM</span>
                          <span style={{ fontSize: '3px', color: luxuryTheme.orange }}>TRANSIT</span>
                      </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Caveat', 'Brush Script MT', cursive", fontSize: '16px', color: '#444', margin: 0, lineHeight: 1.2 }}>
                          A journey to remember!
                      </p>
                  </div>
              </div>

              {/* Postcard 3 */}
              <div style={{ backgroundColor: '#FFF', padding: '8px 8px 14px 8px', borderRadius: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.03)', border: `1px solid ${luxuryTheme.gold}22`, transform: 'rotate(-1deg)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-8px', left: '30%', width: '60px', height: '20px', backgroundColor: `${luxuryTheme.orange}33`, backdropFilter: 'blur(2px)', transform: 'rotate(-3deg)', zIndex: 20 }}></div>
                  <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/9', backgroundColor: '#F5F5F5', borderRadius: '2px', marginBottom: '8px' }}>
                      <img src={getCorsBypassedUrl(postcardImg3)} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.1)' }} alt="Memories 3" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Caveat', 'Brush Script MT', cursive", fontSize: '16px', color: '#444', margin: 0, lineHeight: 1.2 }}>
                          Unforgettable views...
                      </p>
                  </div>
              </div>

              {/* Decorative Travel Stamp Block */}
              <div style={{ marginTop: 'auto', border: `1px dashed ${luxuryTheme.orange}40`, backgroundColor: `${luxuryTheme.orange}0D`, padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px dashed ${luxuryTheme.orange}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: luxuryTheme.orange, flexShrink: 0 }}>
                      <Shield size={18} />
                  </div>
                  <div>
                      <span style={{ display: 'block', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: luxuryTheme.orange, marginBottom: '2px' }}>Maximum Safety Guarantee</span>
                      <span style={{ display: 'block', fontSize: '10px', color: luxuryTheme.gray, lineHeight: 1.3 }}>Every group package includes round-the-clock ground backup, certified drivers, and premium vetted hotels.</span>
                  </div>
              </div>
              
          </div>

      </div>

      <PageFooter />
    </PageWrapper>
  );
};
