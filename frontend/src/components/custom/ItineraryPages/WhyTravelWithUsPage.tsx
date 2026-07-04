import React from 'react';
import { PageWrapper, luxuryTheme, PageFooter } from './shared';
import { Shield, Star, UserCheck, Headset } from 'lucide-react';

export const WhyTravelWithUsPage = () => {
  return (
    <PageWrapper>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${luxuryTheme.gold}33`, paddingBottom: '12px', fontSize: '10.5px', letterSpacing: '0.1em', color: luxuryTheme.gray, fontWeight: 600 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", textTransform: 'uppercase', color: luxuryTheme.dark }}>The Musafir Baba Advantage</span>
        <span>SECTION 05 / PAGE 6</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ color: luxuryTheme.orange, fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>The Musafir Baba Advantage</p>
          <h2 style={{ fontSize: '36px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0, lineHeight: 1.2 }}>
            Why Travel <br/>
            <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>With Us</span>
          </h2>
          <div style={{ width: '64px', height: '2.5px', backgroundColor: luxuryTheme.orange, margin: '8px 0 12px' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 48px', marginTop: '16px' }}>
          
          {/* Advantage 1 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ color: luxuryTheme.gold, marginTop: '4px' }}>
              <Shield size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginTop: 0 }}>Trusted & Safe</h4>
              <p style={{ fontSize: '13px', color: luxuryTheme.gray, lineHeight: 1.6, margin: 0 }}>
                Over 16,000+ travelers have trusted us with their spiritual journeys. Your safety and peace of mind are our paramount concern.
              </p>
            </div>
          </div>

          {/* Advantage 2 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ color: luxuryTheme.gold, marginTop: '4px' }}>
              <Star size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginTop: 0 }}>Premium Experience</h4>
              <p style={{ fontSize: '13px', color: luxuryTheme.gray, lineHeight: 1.6, margin: 0 }}>
                From carefully vetted boutique hotels to private luxury transport, we ensure every touchpoint feels exclusive.
              </p>
            </div>
          </div>

          {/* Advantage 3 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ color: luxuryTheme.gold, marginTop: '4px' }}>
              <UserCheck size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginTop: 0 }}>Expert Guides</h4>
              <p style={{ fontSize: '13px', color: luxuryTheme.gray, lineHeight: 1.6, margin: 0 }}>
                Our local guides aren't just knowledgeable; they are passionate storytellers who bring the destination's rich history to life.
              </p>
            </div>
          </div>

          {/* Advantage 4 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ color: luxuryTheme.gold, marginTop: '4px' }}>
              <Headset size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginTop: 0 }}>24/7 Concierge</h4>
              <p style={{ fontSize: '13px', color: luxuryTheme.gray, lineHeight: 1.6, margin: 0 }}>
                A dedicated travel concierge is available around the clock to assist you with any request, no matter how small.
              </p>
            </div>
          </div>

        </div>
      </div>

      <PageFooter />
    </PageWrapper>
  );
};
