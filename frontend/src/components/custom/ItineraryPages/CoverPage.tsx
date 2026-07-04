import React from 'react';
import { Plane, Compass, Star, Mountain, Activity, Shield, Clock, MapPin, CreditCard, Utensils, Bed, Car, Camera, Users, Sliders, Calendar, CheckCircle2, Phone, Mail, Globe } from 'lucide-react';
import { PageWrapper, luxuryTheme, getCorsBypassedUrl } from './shared';

const decodeEntities = (html: string) => {
  return html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
};

export const CoverPage = ({ title, description, duration, destination, packageEssentials, img }: any) => {
  const parts = title ? title.split(/(?<=\b)(in|by|for)\b/i) : [];
  const mainTitle = parts[0] || title || 'Premium Journey';
  const subTitle = parts.length > 1 ? parts.slice(1).join('') : '';
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const cleanDescription = description ? description.replace(/<[^>]*>?/gm, '').trim() : "An elite, spiritually enriching transit across India's most breathtaking landscapes, crafted exclusively for your ultimate comfort.";
  
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

  // Find specific values
  const getValue = (keywords: string[], fallback = '') => {
    const row = parsedRows.find(r => keywords.some(k => r.label.toLowerCase().includes(k)));
    return row ? row.value : fallback;
  };

  const pDuration = getValue(['duration', 'time'], duration || '10 N / 11 D');
  const pDestination = getValue(['destination', 'region'], destination || 'Char Dham, UK');
  const pLodging = getValue(['accommodation', 'hotel', 'stay'], 'Premium 3★ Stay');
  const pMeals = getValue(['meal', 'food'], 'Breakfast & Dinner');
  const pTransfers = getValue(['transfer', 'transport', 'drop'], 'Private Sedan');
  const pSightseeing = getValue(['sightseeing', 'tour'], 'Local Passes');
  
  const pPax = getValue(['pax', 'guest', 'people', 'ideal'], '2 Adults Base');
  const pDeptCity = getValue(['departure', 'start'], 'New Delhi');
  const pIdeal = getValue(['ideal', 'group'], 'Pilgrims & Families');
  
  const pRoute = getValue(['route', 'itinerary'], 'Haridwar → Yamunotri → Gangotri → Kedarnath → Badrinath');
  const pSeason = getValue(['season', 'time to travel'], 'May-Jun & Sep-Oct');
  const pFlexibility = getValue(['customization', 'flexible'], 'Customizations Allowed');
  const pPrice = getValue(['price', 'cost'], 'On Request');

  // Colors based on the provided HTML
  const colors = {
    bg: '#FAF8F5',
    containerBg: '#FFFFFF',
    terracotta500: luxuryTheme.orange,
    terracotta600: '#E04A00',
    terracotta50: `${luxuryTheme.orange}0D`,
    terracotta100: `${luxuryTheme.orange}26`,
    stone900: luxuryTheme.dark,
    stone800: luxuryTheme.dark,
    stone700: '#374151',
    stone500: luxuryTheme.gray,
    stone400: '#9CA3AF',
    stone200: `${luxuryTheme.gold}4D`,
    stone100: `${luxuryTheme.gold}26`,
    amberHighlight: `${luxuryTheme.orange}1A`
  };

  return (
    <PageWrapper style={{ backgroundColor: '#FFFFFF' }}>
      <div style={{
        width: '100%', height: '100%', backgroundColor: '#FFFFFF',
        padding: '24px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
      }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.stone100}`, paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/Itinerary/highqualitylogo.png" alt="Musafir Baba" style={{ height: '36px', objectFit: 'contain' }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '9px', letterSpacing: '0.1em', color: '#FFF', backgroundColor: luxuryTheme.orange, padding: '4px 10px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Premium Collective</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: colors.terracotta500, textTransform: 'uppercase', letterSpacing: '0.25em', display: 'block', marginBottom: '6px' }}>{subTitle || 'Bespoke Expedition'}</span>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: colors.stone900, fontFamily: "'Playfair Display', serif", margin: '0 auto', maxWidth: '600px', lineHeight: 1.3 }}>{mainTitle}</h1>
            <p style={{ fontSize: '12px', color: colors.stone500, fontStyle: 'italic', fontFamily: "'Playfair Display', serif", margin: '6px auto 0', maxWidth: '500px', lineHeight: 1.4 }}>
              {cleanDescription}
            </p>
          </div>

          {/* Banner Image */}
          {img && (
            <div style={{ margin: '2px auto', width: '100%', maxWidth: '600px', height: '170px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${colors.stone200}`, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', position: 'relative' }}>
              <img src={getCorsBypassedUrl(img)} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
              <div style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: `${luxuryTheme.dark}E6`, border: `1px solid ${luxuryTheme.gold}4d`, borderRadius: '6px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(4px)' }}>
                <Star color={luxuryTheme.orange} size={12} />
                <span style={{ fontSize: '9px', color: '#FFF', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Exclusive Itinerary</span>
              </div>
            </div>
          )}

          {/* Balanced Capsule Row */}
          <div style={{ margin: '4px 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            {[
              { icon: <Clock size={12} color={colors.terracotta500} />, text: pDuration },
              { icon: <MapPin size={12} color={colors.terracotta500} />, text: pDestination },
              { icon: <Bed size={12} color={colors.terracotta500} />, text: pLodging },
              { icon: <Utensils size={12} color={colors.terracotta500} />, text: pMeals },
              { icon: <Car size={12} color={colors.terracotta500} />, text: pTransfers },
              { icon: <Camera size={12} color={colors.terracotta500} />, text: pSightseeing }
            ].map((cap, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#FFF', border: `1px solid ${colors.stone200}`, borderRadius: '999px', fontSize: '11px', fontWeight: 500, color: colors.stone700, boxShadow: '0 4px 20px -2px rgba(139, 92, 26, 0.05)' }}>
                {cap.icon}
                <span>{cap.text}</span>
              </div>
            ))}
          </div>

          {/* Structured Metadata Block */}
          <div style={{ backgroundColor: '#FFF', border: `1px solid ${colors.stone200}`, borderRadius: '10px', padding: '10px', margin: '2px 0', boxShadow: '0 4px 20px -2px rgba(139, 92, 26, 0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center' }}>
              <div style={{ borderRight: `1px solid ${colors.stone100}` }}>
                <span style={{ display: 'block', fontSize: '8px', textTransform: 'uppercase', fontWeight: 700, color: colors.stone400, letterSpacing: '0.1em', marginBottom: '2px' }}>No of Pax</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: colors.stone700 }}>{pPax}</span>
              </div>
              <div style={{ borderRight: `1px solid ${colors.stone100}` }}>
                <span style={{ display: 'block', fontSize: '8px', textTransform: 'uppercase', fontWeight: 700, color: colors.stone400, letterSpacing: '0.1em', marginBottom: '2px' }}>Dept City</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: colors.stone700, backgroundColor: colors.amberHighlight, padding: '2px 8px', borderRadius: '4px' }}>{pDeptCity}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '8px', textTransform: 'uppercase', fontWeight: 700, color: colors.stone400, letterSpacing: '0.1em', marginBottom: '2px' }}>Ideal For</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: colors.stone700 }}>{pIdeal}</span>
              </div>
            </div>
          </div>

          {/* Destination Route Block */}
          <div style={{ textAlign: 'center', padding: '6px 0', borderTop: `1px dashed ${colors.stone200}`, borderBottom: `1px dashed ${colors.stone200}`, margin: '2px 0' }}>
            <span style={{ fontSize: '8px', textTransform: 'uppercase', fontWeight: 700, color: colors.stone400, letterSpacing: '0.25em', display: 'block', marginBottom: '2px' }}>Route Framework</span>
            <p style={{ fontSize: '11px', fontWeight: 600, color: colors.stone700, letterSpacing: '0.05em', margin: 0 }}>{pRoute}</p>
          </div>

          {/* Extra Parameters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', textAlign: 'center', paddingBottom: '2px' }}>
            <div style={{ borderRight: `1px solid ${colors.stone100}` }}>
              <span style={{ fontSize: '8px', textTransform: 'uppercase', fontWeight: 700, color: colors.stone400, letterSpacing: '0.1em', display: 'block', marginBottom: '2px' }}>Best Time to Travel</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: colors.stone800 }}>{pSeason}</span>
            </div>
            <div>
              <span style={{ fontSize: '8px', textTransform: 'uppercase', fontWeight: 700, color: colors.stone400, letterSpacing: '0.1em', display: 'block', marginBottom: '2px' }}>Flexibility Rules</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: colors.terracotta500 }}>{pFlexibility}</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ marginTop: '12px', borderTop: `1px solid ${colors.stone100}`, paddingTop: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '12px' }}>
            
            {/* Pricing Side */}
            <div style={{ backgroundColor: colors.terracotta50, border: `1px solid ${colors.terracotta100}`, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '8px', textTransform: 'uppercase', fontWeight: 700, color: colors.terracotta600, letterSpacing: '0.25em', display: 'block', marginBottom: '4px' }}>Estimated Investment</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: colors.terracotta600, letterSpacing: '-0.02em' }}>{pPrice}</span>
                </div>
              </div>
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${colors.terracotta100}` }}>
                <p style={{ fontSize: '8.5px', color: colors.stone500, fontWeight: 500, margin: 0, lineHeight: 1.4 }}>
                  *Includes domestic travel taxes, localized luxury lodging duties, and active regional tourist transit permits.
                </p>
              </div>
            </div>

            {/* Contact Side */}
            <div style={{ backgroundColor: '#FFF', border: `1px solid ${colors.stone200}`, borderRadius: '12px', padding: '12px', boxShadow: '0 4px 20px -2px rgba(139, 92, 26, 0.05)' }}>
              <span style={{ fontSize: '8px', textTransform: 'uppercase', fontWeight: 800, color: colors.stone400, letterSpacing: '0.25em', display: 'block', marginBottom: '8px' }}>Lead Concierge & Support</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '8px', columnGap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', backgroundColor: colors.terracotta50, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone size={10} color={colors.terracotta500} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '7px', fontWeight: 600, color: colors.stone400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Concierge Line</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: colors.stone700 }}>+91 92896 02447</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', backgroundColor: colors.terracotta50, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mail size={10} color={colors.terracotta500} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '7px', fontWeight: 600, color: colors.stone400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Direct Email Desk</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: colors.stone700 }}>care@musafirbaba.com</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', backgroundColor: colors.terracotta50, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Globe size={10} color={colors.terracotta500} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '7px', fontWeight: 600, color: colors.stone400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Online Portal</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: colors.stone700 }}>www.musafirbaba.com</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', backgroundColor: colors.terracotta50, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={10} color={colors.terracotta500} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '7px', fontWeight: 600, color: colors.stone400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>HQ Location</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: colors.stone700 }}>Najafgarh, Delhi</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Trust Badge */}
          <div style={{ marginTop: '12px', borderTop: `1px solid ${colors.stone100}`, paddingTop: '8px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', fontSize: '8px', fontWeight: 700, color: colors.stone400, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Shield size={10} color={colors.terracotta500} /> 24x7 Concierge Support</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={10} color={colors.terracotta500} /> 98.5% Success Rate</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={10} color={colors.terracotta500} /> 1,50,000+ Travellers</span>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
};
