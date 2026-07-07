import React from 'react';
import { PageWrapper, luxuryTheme, PageFooter } from './shared';
import { User, CreditCard, Building, Check, Scan } from 'lucide-react';

export const PricingPaymentTermsPage = ({ batch }: any) => {
  const activeBatch = batch && batch.length > 0 ? batch[0] : null;
  const quadPrice = activeBatch?.quad ? `₹${activeBatch.quad.toLocaleString()}/-` : '₹26,999/-';
  const triplePrice = activeBatch?.triple ? `₹${activeBatch.triple.toLocaleString()}/-` : '₹27,999/-';
  const doublePrice = activeBatch?.double ? `₹${activeBatch.double.toLocaleString()}/-` : '₹31,999/-';
  const childPrice = activeBatch?.child ? `₹${activeBatch.child.toLocaleString()}/-` : '₹14,999/-';

  return (
    <PageWrapper>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0, lineHeight: 1.2 }}>
            Pricing & <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Terms</span>
          </h2>
          <div style={{ width: '64px', height: '2.5px', backgroundColor: luxuryTheme.orange, margin: '4px 0 12px' }}></div>
        </div>

        {/* TOP ROW: Pricing and Payment Terms */}
        <div style={{ display: 'flex', gap: '24px' }}>
          
          {/* New Pricing Card */}
          <div style={{ flex: 1, backgroundColor: '#FFF', padding: '24px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: luxuryTheme.dark, margin: '0 0 8px' }}>Room Type</h3>
            
            {/* Quad */}
            <div style={{ backgroundColor: '#F8F9FA', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: luxuryTheme.dark, margin: '0 0 4px' }}>Quad Sharing</h4>
                <div style={{ display: 'flex', gap: '4px', color: luxuryTheme.gray }}>
                  <User size={14} /><User size={14} /><User size={14} /><User size={14} />
                </div>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: luxuryTheme.orange }}>{quadPrice}</span>
            </div>

            {/* Triple */}
            <div style={{ backgroundColor: '#F8F9FA', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: luxuryTheme.dark, margin: '0 0 4px' }}>Triple Sharing</h4>
                <div style={{ display: 'flex', gap: '4px', color: luxuryTheme.gray }}>
                  <User size={14} /><User size={14} /><User size={14} />
                </div>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: luxuryTheme.orange }}>{triplePrice}</span>
            </div>

            {/* Double */}
            <div style={{ backgroundColor: '#F8F9FA', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: luxuryTheme.dark, margin: '0 0 4px' }}>Double Sharing</h4>
                <div style={{ display: 'flex', gap: '4px', color: luxuryTheme.gray }}>
                  <User size={14} /><User size={14} />
                </div>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: luxuryTheme.orange }}>{doublePrice}</span>
            </div>

            {/* Child */}
            <div style={{ backgroundColor: '#F8F9FA', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: luxuryTheme.dark, margin: '0 0 4px' }}>Child</h4>
                <div style={{ display: 'flex', gap: '4px', color: luxuryTheme.gray, alignItems: 'center' }}>
                  <User size={14} /> <span style={{ fontSize: '11px' }}>Child upto 12 years</span>
                </div>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: luxuryTheme.orange }}>{childPrice}</span>
            </div>
            
            <p style={{ fontSize: '11px', color: luxuryTheme.gray, fontStyle: 'italic', margin: '4px 0 0' }}>
              *These prices are valid for a minimum group of 4 persons.
            </p>
          </div>

          {/* Payment Terms */}
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', padding: '24px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: luxuryTheme.dark, color: luxuryTheme.gold, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={18} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Payment Terms</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                "Advance booking amount of ₹ 1,999 per person is required.",
                "Seats are allotted on a first-come, first-served basis post advance.",
                "The balance tour amount must be paid 15 days before departure.",
                "Failure to pay the balance may result in cancellation & forfeiture.",
                "All payments must be made to MusafirBaba / Musafirbaba Travels.",
                "Prices are subject to change until full payment is received.",
                "Cancellations are governed by the respective package policy."
              ].map((term, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>
                    {index + 1}
                  </div>
                  <p style={{ fontSize: '12px', color: '#334155', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                    {term}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Booking Process Section */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
          {/* QR Code Section */}
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', padding: '24px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '160px', height: '160px', backgroundColor: '#FFF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '12px' }}>
              {/* Corner Accents */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '16px', height: '16px', borderTop: `3px solid ${luxuryTheme.dark}`, borderLeft: `3px solid ${luxuryTheme.dark}`, borderRadius: '12px 0 0 0' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: '16px', height: '16px', borderTop: `3px solid ${luxuryTheme.dark}`, borderRight: `3px solid ${luxuryTheme.dark}`, borderRadius: '0 12px 0 0' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '16px', height: '16px', borderBottom: `3px solid ${luxuryTheme.dark}`, borderLeft: `3px solid ${luxuryTheme.dark}`, borderRadius: '0 0 0 12px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderBottom: `3px solid ${luxuryTheme.dark}`, borderRight: `3px solid ${luxuryTheme.dark}`, borderRadius: '0 0 12px 0' }} />
              
              {/* Fake QR */}
              <div style={{ width: '100%', height: '100%', border: `1px dashed ${luxuryTheme.gray}`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                <Scan size={36} color={luxuryTheme.gray} strokeWidth={1} />
              </div>
            </div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: luxuryTheme.dark, marginTop: '16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scan to Pay</h3>
            <p style={{ fontSize: '10px', color: luxuryTheme.gray, marginTop: '4px', textAlign: 'center' }}>Secure UPI Payment Gateway</p>
          </div>

          {/* Bank Details Section */}
          <div style={{ flex: 1, backgroundColor: luxuryTheme.dark, padding: '24px', borderRadius: '12px', color: '#FFF', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.05 }}>
              <Building size={120} strokeWidth={1} />
            </div>

            <div style={{ zIndex: 1 }}>
              <h3 style={{ fontSize: '11px', fontWeight: 700, color: luxuryTheme.orange, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Direct Transfer</h3>
              <h4 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", fontWeight: 300, margin: 0 }}>Bank Details</h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', zIndex: 1, marginTop: '4px' }}>
              {[
                { label: "Account Name", value: "Musafirbaba Travels Pvt Ltd", icon: <User size={14} /> },
                { label: "Account No.", value: "50209114000162", icon: <CreditCard size={14} /> },
                { label: "IFSC Code", value: "HDFC0000438", icon: <Building size={14} /> },
                { label: "Account Type", value: "Current", icon: <Check size={14} /> }
              ].map((field, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ color: luxuryTheme.gold }}>{field.icon}</div>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{field.label}</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFF', letterSpacing: '0.05em' }}>{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <PageFooter />
    </PageWrapper>
  );
};
