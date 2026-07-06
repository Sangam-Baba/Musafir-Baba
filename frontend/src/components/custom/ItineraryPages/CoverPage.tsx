import React from 'react';
import { Plane, Compass, Star, Mountain, Activity, Shield, Clock, MapPin, CreditCard, Utensils, Bed, Home, User, BriefcaseMedical, Bus, Car, Camera, Users, Sliders, Calendar, CheckCircle2, Phone, Mail, Globe } from 'lucide-react';
import { PageWrapper, luxuryTheme, getCorsBypassedUrl } from './shared';

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

  // Find specific values
  const getValue = (keywords: string[], fallback = '') => {
    const row = parsedRows.find(r => keywords.some(k => r.label.toLowerCase().includes(k)));
    return row ? row.value : fallback;
  };

  const pDuration = getValue(['duration', 'time'], duration || '10 N / 11 D');
  const pDestination = getValue(['destination', 'region'], destination || 'Char Dham, UK');
  const pLodging = getValue(['accommodation', 'hotel', 'stay'], '');
  const pMeals = getValue(['meal', 'food'], '');
  const pTransfers = getValue(['transfer', 'transport', 'drop'], '');
  const pSightseeing = getValue(['sightseeing', 'tour'], '');
  const pGuide = getValue(['guide'], '');
  
  const pPax = '20';
  const pDeptCity = 'Delhi';
  const pIdeal = getValue(['ideal', 'group'], 'Pilgrims, Families, Groups');
  
  const pRoute = getValue(['route', 'itinerary'], 'Delhi → Haridwar → Yamunotri → Gangotri → Kedarnath → Badrinath');
  const pSeason = getValue(['season', 'time to travel'], 'May-Jun & Sep-Oct');
  const pFlexibility = 'Group & Private';
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
    <PageWrapper style={{ 
      padding: '12px',
      background: `linear-gradient(135deg, ${luxuryTheme.orange}, #ff9868)`
    }}>
      <div style={{
        width: '100%', height: '100%', backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '24px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
      }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.stone100}`, paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/Itinerary/highqualitylogo.png" alt="Musafir Baba" style={{ height: '36px', objectFit: 'contain' }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              {/* Badge removed per request */}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: colors.stone900, fontFamily: "'Playfair Display', serif", margin: '0 auto', maxWidth: '640px', lineHeight: 1.35 }}>{mainTitle}</h1>
          </div>

          {/* Banner Image */}
          {img && (
            <div style={{ margin: '2px auto', width: '100%', maxWidth: '640px', height: '280px', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${colors.stone200}`, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', position: 'relative' }}>
              <img src={getCorsBypassedUrl(img)} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
            </div>
          )}

          {/* Balanced Capsule Row */}
          <div style={{ margin: '8px 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
            {[
              { icon: <Bus size={14} color={colors.terracotta500} />, text: pTransfers ? 'Transport' : '' },
              { icon: <Utensils size={14} color={colors.terracotta500} />, text: pMeals ? 'Meal' : '' },
              { icon: <Home size={14} color={colors.terracotta500} />, text: pLodging ? 'Stay' : '' },
              { icon: <User size={14} color={colors.terracotta500} />, text: pGuide ? 'Guide' : '' },
              { icon: <Camera size={14} color={colors.terracotta500} />, text: pSightseeing ? 'Sightseeing' : '' },
              { icon: <BriefcaseMedical size={14} color={colors.terracotta500} />, text: 'Medkit' }
            ].filter(cap => cap.text).map((cap, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#FFF', border: `1px solid ${colors.stone200}`, borderRadius: '999px', fontSize: '13px', fontWeight: 600, color: colors.stone700, boxShadow: '0 4px 20px -2px rgba(139, 92, 26, 0.05)' }}>
                {cap.icon}
                <span>{cap.text}</span>
              </div>
            ))}
          </div>

          {/* Structured Metadata Block */}
          <div style={{ backgroundColor: '#FFF', border: `1px solid ${colors.stone200}`, borderRadius: '12px', padding: '14px', margin: '8px 0', boxShadow: '0 4px 20px -2px rgba(139, 92, 26, 0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center' }}>
              <div style={{ borderRight: `1px solid ${colors.stone100}` }}>
                <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: colors.stone400, letterSpacing: '0.1em', marginBottom: '6px' }}>No of Pax</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: colors.stone700 }}>{pPax}</span>
              </div>
              <div style={{ borderRight: `1px solid ${colors.stone100}` }}>
                <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: colors.stone400, letterSpacing: '0.1em', marginBottom: '6px' }}>Dept City</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: colors.stone700, backgroundColor: colors.amberHighlight, padding: '4px 10px', borderRadius: '4px' }}>{pDeptCity}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: colors.stone400, letterSpacing: '0.1em', marginBottom: '6px' }}>Ideal For</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: colors.stone700 }}>{pIdeal}</span>
              </div>
            </div>
          </div>

          {/* Destination Route Block */}
          <div style={{ textAlign: 'center', padding: '10px 0', borderTop: `1px dashed ${colors.stone200}`, borderBottom: `1px dashed ${colors.stone200}`, margin: '8px 0' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: colors.stone400, letterSpacing: '0.25em', display: 'block', marginBottom: '6px' }}>Route Framework</span>
            <p style={{ fontSize: '13px', fontWeight: 600, color: colors.stone700, letterSpacing: '0.05em', margin: 0 }}>{pRoute}</p>
          </div>

          {/* Extra Parameters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', textAlign: 'center', paddingBottom: '6px', margin: '8px 0' }}>
            <div style={{ borderRight: `1px solid ${colors.stone100}` }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: colors.stone400, letterSpacing: '0.1em', display: 'block', marginBottom: '6px' }}>Best Time to Travel</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: colors.stone800 }}>{pSeason}</span>
            </div>
            <div>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: colors.stone400, letterSpacing: '0.1em', display: 'block', marginBottom: '6px' }}>Availability</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: colors.terracotta500 }}>{pFlexibility}</span>
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
              <div style={{ marginTop: '12px' }}>
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
