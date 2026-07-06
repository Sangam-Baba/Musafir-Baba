import React from 'react';
import { PageWrapper, luxuryTheme, PageFooter } from './shared';
import { User, Building, Check, ShieldAlert } from 'lucide-react';

export const CancellationPolicyPage = () => {
  return (
    <PageWrapper>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${luxuryTheme.gold}33`, paddingBottom: '12px', fontSize: '10.5px', letterSpacing: '0.1em', color: luxuryTheme.gray, fontWeight: 600 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", textTransform: 'uppercase', color: luxuryTheme.dark }}>Peace of Mind</span>
        <span>SECTION 10 / PAGE 11</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ color: luxuryTheme.orange, fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Peace of Mind</p>
          <h2 style={{ fontSize: '36px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0, lineHeight: 1.2 }}>
            Cancellation & <br/>
            <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Refund Policy</span>
          </h2>
          <div style={{ width: '64px', height: '2.5px', backgroundColor: luxuryTheme.orange, margin: '8px 0 12px' }}></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '8px' }}>
          
          {/* Customer Cancellation Card */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '24px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ backgroundColor: luxuryTheme.dark, color: luxuryTheme.gold, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={18} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Cancellation by Customer</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '8px' }}>
              {[
                { days: "30+ Days", desc: "₹1,999 deducted. Balance refunded." },
                { days: "15-30 Days", desc: "50% of total tour cost deducted." },
                { days: "7-14 Days", desc: "75% of total tour cost deducted." },
                { days: "<7 Days", desc: "100% deducted. No show." }
              ].map((option, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', backgroundColor: '#FFF', borderRadius: '8px', border: `1px solid ${luxuryTheme.gold}22`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', textAlign: 'center' }}>
                  <span style={{ fontSize: '14px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: luxuryTheme.dark }}>{option.days}</span>
                  <span style={{ fontSize: '10px', color: luxuryTheme.gray, lineHeight: 1.4 }}>{option.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Company Cancellation Card */}
            <div style={{ backgroundColor: luxuryTheme.dark, color: '#FFF', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: luxuryTheme.gold, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building size={18} />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: luxuryTheme.orange, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Cancellation by Company</h3>
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                If the tour is cancelled by MusafirBaba due to operational reasons or insufficient group size, the customer will be offered:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  "An alternate departure date",
                  "A full refund of the amount paid"
                ].map((text, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: luxuryTheme.gold }}><Check size={14} /></div>
                    <span style={{ fontSize: '11px', color: '#FFF', fontWeight: 600 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Notes Card */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '24px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ backgroundColor: '#fffbeb', color: '#d97706', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={18} />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Important Notes</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  "Refunds processed within 10–15 working days.",
                  "No refund for unused services or early departure.",
                  "Advance booking amount is non-refundable.",
                  "Cancellations accepted via email or WhatsApp only."
                ].map((note, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ color: luxuryTheme.orange, marginTop: '2px' }}><Check size={12} /></div>
                    <span style={{ fontSize: '11px', color: luxuryTheme.gray, fontWeight: 600, lineHeight: 1.4 }}>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      <PageFooter />
    </PageWrapper>
  );
};
