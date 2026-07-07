import React from 'react';
import { PageWrapper, luxuryTheme, PageFooter } from './shared';
import { User, Building, Check, ShieldAlert } from 'lucide-react';

export const CancellationPolicyPage = () => {
  return (
    <PageWrapper>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '42px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0, lineHeight: 1.2 }}>
            Cancellation & <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Refund Policy</span>
          </h2>
          <div style={{ width: '64px', height: '2.5px', backgroundColor: luxuryTheme.orange, margin: '8px 0 12px' }}></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '8px' }}>
          
          {/* Customer Cancellation Card */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '32px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: luxuryTheme.dark, color: luxuryTheme.gold, width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Cancellation by Customer</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '8px' }}>
              {[
                { days: "30+ Days", desc: "₹1,999 deducted. Balance refunded." },
                { days: "15-30 Days", desc: "50% of total tour cost deducted." },
                { days: "7-14 Days", desc: "75% of total tour cost deducted." },
                { days: "<7 Days", desc: "100% deducted. No show." }
              ].map((option, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px', backgroundColor: '#FFF', borderRadius: '8px', border: `1px solid ${luxuryTheme.gold}22`, boxShadow: '0 4px 6px rgba(0,0,0,0.03)', textAlign: 'center' }}>
                  <span style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: luxuryTheme.dark }}>{option.days}</span>
                  <span style={{ fontSize: '13px', color: luxuryTheme.gray, lineHeight: 1.5 }}>{option.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', flex: 1 }}>
            {/* Company Cancellation Card */}
            <div style={{ backgroundColor: luxuryTheme.dark, color: '#FFF', padding: '32px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: luxuryTheme.gold, width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building size={24} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: luxuryTheme.orange, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Cancellation by Company</h3>
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: '0 0 8px 0', lineHeight: 1.6 }}>
                If the tour is cancelled by MusafirBaba due to operational reasons or insufficient group size, the customer will be offered:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  "An alternate departure date",
                  "A full refund of the amount paid"
                ].map((text, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: luxuryTheme.gold }}><Check size={18} /></div>
                    <span style={{ fontSize: '14px', color: '#FFF', fontWeight: 600 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Notes Card */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '32px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <div style={{ backgroundColor: '#fffbeb', color: '#d97706', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={24} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Important Notes</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  "Refunds processed within 10–15 working days.",
                  "No refund for unused services or Early Arrival/Departures.",
                  "Advance booking amount is non-refundable.",
                  "Cancellations accepted via email or WhatsApp only."
                ].map((note, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ color: luxuryTheme.orange, marginTop: '2px' }}><Check size={16} /></div>
                    <span style={{ fontSize: '14px', color: luxuryTheme.gray, fontWeight: 600, lineHeight: 1.5 }}>{note}</span>
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
