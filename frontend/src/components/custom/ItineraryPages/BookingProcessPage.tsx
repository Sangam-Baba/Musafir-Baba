import React from 'react';
import { PageWrapper, luxuryTheme, PageFooter } from './shared';
import { Shield, Building, CreditCard, User, Check, Scan } from 'lucide-react';

export const BookingProcessPage = () => {
  return (
    <PageWrapper>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${luxuryTheme.gold}33`, paddingBottom: '12px', fontSize: '10.5px', letterSpacing: '0.1em', color: luxuryTheme.gray, fontWeight: 600 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", textTransform: 'uppercase', color: luxuryTheme.dark }}>Secure Payment</span>
        <span>SECTION 08 / PAGE 9</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ color: luxuryTheme.orange, fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Secure Payment</p>
          <h2 style={{ fontSize: '36px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0, lineHeight: 1.2 }}>
            Booking <br/>
            <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Process</span>
          </h2>
          <div style={{ width: '64px', height: '2.5px', backgroundColor: luxuryTheme.orange, margin: '8px 0 12px' }}></div>
        </div>

        <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
          {/* QR Code Section */}
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', padding: '32px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '200px', height: '200px', backgroundColor: '#FFF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '16px' }}>
              {/* Corner Accents */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '24px', height: '24px', borderTop: `4px solid ${luxuryTheme.dark}`, borderLeft: `4px solid ${luxuryTheme.dark}`, borderRadius: '12px 0 0 0' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: '24px', height: '24px', borderTop: `4px solid ${luxuryTheme.dark}`, borderRight: `4px solid ${luxuryTheme.dark}`, borderRadius: '0 12px 0 0' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '24px', height: '24px', borderBottom: `4px solid ${luxuryTheme.dark}`, borderLeft: `4px solid ${luxuryTheme.dark}`, borderRadius: '0 0 0 12px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', borderBottom: `4px solid ${luxuryTheme.dark}`, borderRight: `4px solid ${luxuryTheme.dark}`, borderRadius: '0 0 12px 0' }} />
              
              {/* Fake QR */}
              <div style={{ width: '100%', height: '100%', border: `1px dashed ${luxuryTheme.gray}`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                <Scan size={48} color={luxuryTheme.gray} strokeWidth={1} />
              </div>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: luxuryTheme.dark, marginTop: '24px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scan to Pay</h3>
            <p style={{ fontSize: '11px', color: luxuryTheme.gray, marginTop: '8px', textAlign: 'center' }}>Secure UPI Payment Gateway</p>
          </div>

          {/* Bank Details Section */}
          <div style={{ flex: 1.5, backgroundColor: luxuryTheme.dark, padding: '32px', borderRadius: '12px', color: '#FFF', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.05 }}>
              <Building size={160} strokeWidth={1} />
            </div>

            <div style={{ zIndex: 1 }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: luxuryTheme.orange, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>Direct Transfer</h3>
              <h4 style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", fontWeight: 300, margin: 0 }}>Bank Details</h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', zIndex: 1, marginTop: '8px' }}>
              {[
                { label: "Account Name", value: "Musafirbaba Travels Pvt Ltd", icon: <User size={16} /> },
                { label: "Account No.", value: "50209114000162", icon: <CreditCard size={16} /> },
                { label: "IFSC Code", value: "HDFC0000438", icon: <Building size={16} /> },
                { label: "Account Type", value: "Current", icon: <Check size={16} /> }
              ].map((field, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: luxuryTheme.gold }}>{field.icon}</div>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{field.label}</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFF', letterSpacing: '0.05em' }}>{field.value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'auto', zIndex: 1, paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Shield size={20} color={luxuryTheme.gold} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>All transactions are secure and encrypted.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Steps Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', gap: '16px' }}>
           {[
             { step: "01", title: "Scan & Pay", desc: "Use any UPI app to scan the QR code" },
             { step: "02", title: "Verify Details", desc: "Confirm amount and account name" },
             { step: "03", title: "Share Receipt", desc: "Send payment screenshot to our team" }
           ].map((item, index) => (
             <React.Fragment key={index}>
               <div style={{ flex: 1, display: 'flex', gap: '16px', alignItems: 'center' }}>
                 <div style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", color: luxuryTheme.gold, fontWeight: 300 }}>{item.step}</div>
                 <div>
                   <h5 style={{ fontSize: '12px', fontWeight: 700, color: luxuryTheme.dark, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.title}</h5>
                   <p style={{ fontSize: '10px', color: luxuryTheme.gray, margin: 0 }}>{item.desc}</p>
                 </div>
               </div>
               {index < 2 && <div style={{ width: '32px', height: '1px', backgroundColor: `${luxuryTheme.gold}55` }} />}
             </React.Fragment>
           ))}
        </div>

      </div>

      <PageFooter />
    </PageWrapper>
  );
};
