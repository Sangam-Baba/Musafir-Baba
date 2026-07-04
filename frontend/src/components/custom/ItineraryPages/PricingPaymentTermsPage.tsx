import React from 'react';
import { PageWrapper, luxuryTheme, PageFooter, getCorsBypassedUrl } from './shared';
import { Users, User, Mountain, CreditCard } from 'lucide-react';

export const PricingPaymentTermsPage = ({ batch }: any) => {
  const activeBatch = batch && batch.length > 0 ? batch[0] : null;
  const quadPrice = activeBatch?.quad ? `₹${activeBatch.quad.toLocaleString()}/-` : '₹26,999/-';
  const triplePrice = activeBatch?.triple ? `₹${activeBatch.triple.toLocaleString()}/-` : '₹27,999/-';
  const doublePrice = activeBatch?.double ? `₹${activeBatch.double.toLocaleString()}/-` : '₹31,999/-';
  const childPrice = activeBatch?.child ? `₹${activeBatch.child.toLocaleString()}/-` : '₹14,999/-';

  const partners = [
    { name: "VFS", image: "https://cdn.musafirbaba.com/images/vfs_ec9739.jpg" },
    { name: "Paytem", image: "https://cdn.musafirbaba.com/images/download_2_kx6up9.png" },
    { name: "MMT", image: "https://cdn.musafirbaba.com/images/mmt_bzhgxl.png" },
    { name: "EMT", image: "https://cdn.musafirbaba.com/images/easemytrip-logo-png_seeklogo-517976_iy4r6z.png" },
    { name: "Goibibo", image: "https://cdn.musafirbaba.com/images/1_pmcv8t.png" },
    { name: "indigo", image: "https://cdn.musafirbaba.com/images/2_zou3l6.png" },
    { name: "Pay U", image: "https://cdn.musafirbaba.com/images/pay_u_ypbpf9.png" },
    { name: "Red Bus", image: "https://cdn.musafirbaba.com/images/red_bgv024.png" },
    { name: "Air India", image: "https://cdn.musafirbaba.com/images/1767961958311-ai-large-default_dmageq.webp" },
    { name: "Spicejet", image: "https://cdn.musafirbaba.com/images/spicejett_wvlra2.png" },
    { name: "akasha airlines", image: "https://cdn.musafirbaba.com/images/1767961958252-akasha_tjdowv.webp" },
    { name: "vistara", image: "https://cdn.musafirbaba.com/images/vis_1_wkfaqo.png" }
  ];

  const PricingRow = ({ title, price, icon }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ color: luxuryTheme.gold }}>{icon}</div>
        <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      </div>
      <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: luxuryTheme.gold }}>{price}</span>
    </div>
  );

  return (
    <PageWrapper>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${luxuryTheme.gold}33`, paddingBottom: '12px', fontSize: '10.5px', letterSpacing: '0.1em', color: luxuryTheme.gray, fontWeight: 600 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", textTransform: 'uppercase', color: luxuryTheme.dark }}>Investment</span>
        <span>SECTION 06 / PAGE 7</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ color: luxuryTheme.orange, fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Investment</p>
          <h2 style={{ fontSize: '36px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0, lineHeight: 1.2 }}>
            Pricing & <br/>
            <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Terms</span>
          </h2>
          <div style={{ width: '64px', height: '2.5px', backgroundColor: luxuryTheme.orange, margin: '8px 0 12px' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '8px' }}>
          
          {/* Pricing Card */}
          <div style={{ backgroundColor: luxuryTheme.dark, color: '#FFF', padding: '32px', borderRadius: '12px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.05 }}>
              <Mountain size={160} strokeWidth={1} />
            </div>
            
            <div style={{ zIndex: 1 }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: luxuryTheme.orange, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>Per Person Rates</h3>
              <h4 style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", fontWeight: 300, margin: 0 }}>Premium Package</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1, marginTop: '8px' }}>
              <PricingRow title="Double Sharing" price={doublePrice} icon={<Users size={16} />} />
              <PricingRow title="Triple Sharing" price={triplePrice} icon={<Users size={16} />} />
              <PricingRow title="Quad Sharing" price={quadPrice} icon={<Users size={16} />} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: luxuryTheme.gold }}><User size={16} /></div>
                  <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Child (12+ Years)</span>
                </div>
                <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: luxuryTheme.gold }}>{childPrice}</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${luxuryTheme.orange}`, zIndex: 1, marginTop: 'auto' }}>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.4 }}>
                <span style={{ color: '#FFF', fontWeight: 600 }}>Note:</span> Children aged 12 years and above will be considered as individual passengers.
              </p>
            </div>
          </div>

          {/* Payment Terms */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '24px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: luxuryTheme.dark, color: luxuryTheme.gold, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={18} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Payment Terms</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

        {/* TRUSTED PARTNERS SECTION */}
        <div style={{ marginTop: '32px', borderTop: `1px dashed ${luxuryTheme.gold}55`, paddingTop: '32px', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: luxuryTheme.dark, margin: 0 }}>
              Our Trusted Partners
            </h2>
            <div style={{ width: '40px', height: '3px', backgroundColor: luxuryTheme.orange, margin: '4px 0 16px' }}></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px 20px', alignItems: 'center' }}>
            {partners.map((partner, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', border: `1px solid ${luxuryTheme.gold}33`, height: '60px' }}>
                <img 
                  src={getCorsBypassedUrl(partner.image)} 
                  alt={partner.name} 
                  crossOrigin="anonymous"
                  style={{ width: '100%', maxWidth: '80px', objectFit: 'contain', maxHeight: '36px' }} 
                />
              </div>
            ))}
          </div>
        </div>

      </div>

      <PageFooter />
    </PageWrapper>
  );
};
