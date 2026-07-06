import React from 'react';
import { PageWrapper, luxuryTheme } from './shared';
import { Compass } from 'lucide-react';

export const ThankYouPage = () => {
  return (
    <PageWrapper style={{ backgroundColor: '#FAF8F5' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', padding: '32px 64px', flex: 1 }}>
        
        {/* Centered Logo Block */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: `1px solid ${luxuryTheme.gold}33`, paddingBottom: '24px', width: '100%', marginBottom: '40px' }}>
          <img src="/Itinerary/highqualitylogo.png" alt="Musafir Baba" style={{ height: '42px', objectFit: 'contain', marginBottom: '12px' }} />
          <span style={{ fontSize: '8px', fontWeight: 700, color: luxuryTheme.gray, textTransform: 'uppercase', letterSpacing: '0.25em', whiteSpace: 'nowrap' }}>Exclusive Custom Travel Ledger</span>
        </div>

        {/* Heading */}
        <h1 style={{ 
          fontFamily: "'Playfair Display', serif", 
          fontStyle: 'italic', 
          fontSize: '44px', 
          color: luxuryTheme.orange, 
          lineHeight: 1.2, 
          marginBottom: '32px',
          fontWeight: 500,
          textAlign: 'center'
        }}>
          Thank you for choosing<br/>Musafirbaba
        </h1>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: luxuryTheme.gray, fontSize: '11px', lineHeight: 1.8, fontFamily: "'Playfair Display', serif", textAlign: 'center', maxWidth: '90%' }}>
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

        {/* Flexible Spacer to push signature down */}
        <div style={{ flexGrow: 1 }} />

        {/* Signature & Award Block */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '48px', width: '100%', marginBottom: '40px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '120px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="100%" height="100%" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.85, transform: 'rotate(-2deg)' }}>
                <path d="M 30,45 C 20,40 10,25 25,15 C 40,5 50,30 35,45 C 30,50 45,35 60,20 C 65,15 70,25 65,35 C 60,45 80,25 90,20 C 100,15 95,35 90,45 C 85,55 110,20 125,10 C 140,0 130,30 115,45 C 110,50 140,25 150,20 C 160,15 155,35 150,45 C 145,55 180,30 190,25" stroke={luxuryTheme.dark} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M 20,25 L 50,20" stroke={luxuryTheme.dark} strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 125,50 L 135,45" stroke={luxuryTheme.dark} strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ borderLeft: `1px solid ${luxuryTheme.gold}55`, paddingLeft: '16px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 800, color: luxuryTheme.dark, fontSize: '13px' }}>Ashutosh Rai</div>
              <div style={{ fontWeight: 700, color: luxuryTheme.gray, fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>Founder,<br/>Musafirbaba</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#FFFDFB', border: `1px solid ${luxuryTheme.orange}22`, padding: '12px 20px', borderRadius: '12px' }}>
            <div style={{ backgroundColor: `${luxuryTheme.orange}1a`, padding: '8px', borderRadius: '50%' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={luxuryTheme.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15l-3 3-3-3m6-6l-3-3-3 3M2 12h20"></path></svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '7px', fontWeight: 800, color: luxuryTheme.orange, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Awarded Brand</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: luxuryTheme.dark, fontFamily: "'Playfair Display', serif" }}>The Best Premium Custom<br/>Travel Operator</span>
            </div>
          </div>

        </div>

        {/* Badges Block */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', width: '100%', marginBottom: '24px' }}>
          
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

        </div>

      </div>
      
      {/* Footer Banner */}
      <div style={{ borderTop: `1px solid ${luxuryTheme.gold}33`, padding: '16px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={luxuryTheme.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span style={{ fontSize: '10px', fontWeight: 700, color: luxuryTheme.gray, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Fully Verified Visas</span>
        </div>
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: luxuryTheme.gray, opacity: 0.3 }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={luxuryTheme.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          <span style={{ fontSize: '10px', fontWeight: 700, color: luxuryTheme.gray, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Trusted By Celebrities</span>
        </div>
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: luxuryTheme.gray, opacity: 0.3 }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={luxuryTheme.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span style={{ fontSize: '10px', fontWeight: 700, color: luxuryTheme.gray, textTransform: 'uppercase', letterSpacing: '0.15em' }}>100% Customized Trips</span>
        </div>
      </div>
    </PageWrapper>
  );
};
