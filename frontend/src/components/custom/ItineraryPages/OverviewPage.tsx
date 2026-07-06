import React from 'react';
import { Mountain, Compass, Star, Bus, Bed, Utensils, Shield, Activity, Camera, Home, Calendar } from 'lucide-react';
import { PageWrapper, luxuryTheme, getCorsBypassedUrl, PageFooter } from './shared';
import { stripHtml } from '@/lib/utils';

export const OverviewPage = ({ title, description, duration, img, destination }: any) => {
  return (
    <PageWrapper>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${luxuryTheme.gold}33`, paddingBottom: '12px', fontSize: '10.5px', letterSpacing: '0.1em', color: luxuryTheme.gray, fontWeight: 600 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", textTransform: 'uppercase', color: luxuryTheme.dark }}>{title}</span>
        <span>SECTION 01 / PAGE 2</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ color: luxuryTheme.orange, fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Divine Introduction</p>
          <h2 style={{ fontSize: '30px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0 }}>The Complete Overview</h2>
          <div style={{ width: '64px', height: '2.5px', backgroundColor: luxuryTheme.gold, margin: '2px 0 6px' }}></div>
          <p style={{ fontSize: '13px', color: '#57534e', lineHeight: 1.6, maxWidth: '672px', margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {stripHtml(description)}
            {stripHtml(description).length < 150 ? " We believe that an exceptional, unforgettable expedition begins long before you arrive at your destination. It begins as a spark of wanderlust, and our lifelong passion is turning that unique dream into a beautifully polished, completely effortless reality. At Musafirbaba, we understand that no two travellers share the same perspective, and no single path defines a 'perfect' getaway. We co-create with you, matching your unique requirements with pristine boutique lodging and premium private transit setups to provide complete, unmatched peace of mind." : ""}
          </p>
          <div style={{ marginTop: '4px' }}>
            <a href="https://musafirbaba.com" target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: luxuryTheme.orange, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', display: 'inline-block' }}>Read the full overview at musafirbaba.com</a>
          </div>
        </div>

        {/* Framed Image Segment */}
        {img && (
          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '140px', width: '100%', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <img src={getCorsBypassedUrl(img)} alt="Overview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(to top, ${luxuryTheme.dark}bf, transparent, transparent)` }}></div>
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', color: '#FFF' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: luxuryTheme.gold, margin: '0 0 4px' }}>Pristine Destination</p>
              <h3 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", fontWeight: 300, margin: 0 }}>{destination || 'Beautiful Sacred Valley'}</h3>
            </div>
          </div>
        )}

        {/* Key Meta Information */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, backgroundColor: `${luxuryTheme.lightGold}80`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '9.5px', color: luxuryTheme.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Duration</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: luxuryTheme.dark }}>{duration || 'Multi-Day'}</span>
            <p style={{ fontSize: '11px', color: '#57534e', lineHeight: 1.4, margin: 0 }}>An immersive experience designed to cover all key attractions and ensure complete comfort throughout.</p>
          </div>
          <div style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, backgroundColor: `${luxuryTheme.lightGold}80`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '9.5px', color: luxuryTheme.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Primary Destination</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: luxuryTheme.dark }}>{destination || 'Premium Route'}</span>
            <p style={{ fontSize: '12px', color: '#57534e', lineHeight: 1.5, margin: 0 }}>Dedicated logistics management coordinates all transits, ensuring a seamless and fully supported journey.</p>
          </div>
        </div>

        {/* Premium Values List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0px' }}>
          <h4 style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: luxuryTheme.dark, borderBottom: `1px solid ${luxuryTheme.gold}33`, paddingBottom: '4px', margin: 0 }}>Premium Advantages</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px', color: '#44403c' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Compass color={luxuryTheme.orange} size={14} style={{ marginTop: '2px' }} />
              <div><strong style={{ color: luxuryTheme.dark, fontWeight: 700 }}>Seamless Transit:</strong> Optimized routes bypassing heavy congestion and fatigue.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Star color={luxuryTheme.orange} size={14} style={{ marginTop: '2px' }} />
              <div><strong style={{ color: luxuryTheme.dark, fontWeight: 700 }}>Exclusive Priority:</strong> Pre-arranged assisted access to bypass long waiting lines.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Bed color={luxuryTheme.orange} size={14} style={{ marginTop: '2px' }} />
              <div><strong style={{ color: luxuryTheme.dark, fontWeight: 700 }}>Elite Stays:</strong> Relax in handpicked premium hotels with warm hospitality and clean facilities.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Utensils color={luxuryTheme.orange} size={14} style={{ marginTop: '2px' }} />
              <div><strong style={{ color: luxuryTheme.dark, fontWeight: 700 }}>Gourmet Dining:</strong> Enjoy hot, delicious morning breakfasts and comforting evening meals.</div>
            </div>
          </div>
        </div>
      </div>

      <PageFooter />
    </PageWrapper>
  );
};
