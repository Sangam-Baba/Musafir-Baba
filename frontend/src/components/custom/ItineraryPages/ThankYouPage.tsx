import React from 'react';
import { PageWrapper, PageFooter, luxuryTheme } from './shared';
import { Compass } from 'lucide-react';

export const ThankYouPage = () => {
  return (
    <PageWrapper style={{ backgroundColor: '#FAF8F5' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', padding: '32px 64px', flex: 1 }}>
        
        {/* Centered Logo Block */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: `1px solid ${luxuryTheme.gold}33`, paddingBottom: '16px', width: '100%', marginBottom: '16px' }}>
          <img src="/Itinerary/highqualitylogo.png" alt="Musafir Baba" style={{ height: '42px', objectFit: 'contain' }} />
        </div>

        {/* Heading */}
        <h1 style={{ 
          fontFamily: "'Playfair Display', serif", 
          fontStyle: 'italic', 
          fontSize: '44px', 
          color: luxuryTheme.orange, 
          lineHeight: 1.2, 
          marginBottom: '16px',
          fontWeight: 500,
          textAlign: 'center'
        }}>
          Thank you for choosing<br/>Musafirbaba
        </h1>



        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: luxuryTheme.gray, fontSize: '11px', lineHeight: 1.8, fontFamily: "'Playfair Display', serif", textAlign: 'center', maxWidth: '90%' }}>
          <p>
            We believe that an exceptional, unforgettable expedition begins long before you arrive at your destination. It begins as a spark of wanderlust, and our lifelong passion is turning that unique dream into a beautifully polished, completely effortless reality.
          </p>
          <p>
            At Musafirbaba, we understand that no two travellers share the same perspective, and no single path defines a 'perfect' getaway. We co-create with you, matching your unique requirements with pristine boutique lodging and premium private transit setups to provide complete, unmatched peace of mind.
          </p>
          <p style={{ fontStyle: 'italic', color: luxuryTheme.dark, opacity: 0.8 }}>
            "Your trust is our greatest badge of honor. For the journeys that change you — not just your map."
          </p>
        </div>

        {/* Team Image (Wide Format) */}
        <div style={{ margin: '16px auto 0', width: '100%', maxWidth: '600px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          <img src="/Itinerary/employees.png" alt="Musafirbaba Team" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>

        {/* Flexible Spacer to push signature down */}
        <div style={{ flexGrow: 1 }} />



        {/* Badges Block */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', width: '100%', marginBottom: '24px' }}>
          
          {/* Google */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', backgroundColor: '#FFF', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, width: '260px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#4285F4', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', fontFamily: 'sans-serif' }}>G</div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: luxuryTheme.dark }}>4.8/5</span>
                <div style={{ display: 'flex', gap: '2px', color: '#FBBF24', fontSize: '12px' }}>
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <div style={{ fontSize: '7px', fontWeight: 700, color: luxuryTheme.gray, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>12,400+ Google Reviews</div>
            </div>
          </div>

          {/* Facebook */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', backgroundColor: '#FFF', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, width: '260px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: '#1877F2', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', fontFamily: 'serif' }}>f</div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: luxuryTheme.dark }}>4.9/5</span>
                <div style={{ display: 'flex', gap: '2px', color: '#FBBF24', fontSize: '12px' }}>
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <div style={{ fontSize: '7px', fontWeight: 700, color: luxuryTheme.gray, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>2,100+ FB Recommendations</div>
            </div>
          </div>

          {/* JD Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', backgroundColor: '#FFF', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, width: '260px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: '#FF7A00', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '9px', fontFamily: 'sans-serif' }}>JD</div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: luxuryTheme.dark }}>4.8/5</span>
                <div style={{ display: 'flex', gap: '2px', color: '#FBBF24', fontSize: '12px' }}>
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <div style={{ fontSize: '7px', fontWeight: 700, color: luxuryTheme.gray, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>8,500+ JD Reviews</div>
            </div>
          </div>

          {/* TripAdvisor Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', backgroundColor: '#FFF', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, width: '260px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: '#00AA6C', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '9px', fontFamily: 'sans-serif' }}>TA</div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: luxuryTheme.dark }}>5.0/5</span>
                <div style={{ display: 'flex', gap: '2px', color: '#FBBF24', fontSize: '12px' }}>
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <div style={{ fontSize: '7px', fontWeight: 700, color: luxuryTheme.gray, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>4,200+ Tripadvisor Reviews</div>
            </div>
          </div>

          {/* Trustpilot Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', backgroundColor: '#FFF', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, width: '260px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: '#00B67A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', fontFamily: 'sans-serif' }}>★</div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: luxuryTheme.dark }}>4.9/5</span>
                <div style={{ display: 'flex', gap: '2px', color: '#FBBF24', fontSize: '12px' }}>
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <div style={{ fontSize: '7px', fontWeight: 700, color: luxuryTheme.gray, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>3,100+ Trustpilot Reviews</div>
            </div>
          </div>

        </div>

      </div>
      <PageFooter />
    </PageWrapper>
  );
};
