import React from 'react';
import { PageWrapper, luxuryTheme, PageFooter } from './shared';

export const RegistrationsPage = () => {
  return (
    <PageWrapper>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${luxuryTheme.gold}33`, paddingBottom: '12px', fontSize: '10.5px', letterSpacing: '0.1em', color: luxuryTheme.gray, fontWeight: 600 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", textTransform: 'uppercase', color: luxuryTheme.dark }}>Recognized Excellence</span>
        <span>SECTION 11 / PAGE 12</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ color: luxuryTheme.orange, fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Recognized Excellence</p>
          <h2 style={{ fontSize: '36px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0, lineHeight: 1.2 }}>
            Accreditations & <br/>
            <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Certifications</span>
          </h2>
          <div style={{ width: '64px', height: '2.5px', backgroundColor: luxuryTheme.orange, margin: '8px 0 12px' }}></div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '16px', marginBottom: '32px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '24px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src="/Itinerary/musafirbabacertificates.png" 
              alt="Registrations & Certifications" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            />
          </div>
        </div>
      </div>

      <PageFooter />
    </PageWrapper>
  );
};
