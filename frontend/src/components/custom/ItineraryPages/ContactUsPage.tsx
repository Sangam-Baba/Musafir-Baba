import React from 'react';
import { PageWrapper, luxuryTheme, PageFooter, getCorsBypassedUrl } from './shared';
import { Phone, Mail, Instagram, Globe, MapPin, Headset, Plane, FileText, Map, Building } from 'lucide-react';

export const ContactUsPage = () => {
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

  const services = [
    { title: "Flight Booking", icon: <Plane size={20} strokeWidth={1.5} />, desc: "Global flight reservations at the best competitive rates." },
    { title: "Visa Assistance", icon: <FileText size={20} strokeWidth={1.5} />, desc: "Hassle-free visa processing for international destinations." },
    { title: "Custom Packages", icon: <Map size={20} strokeWidth={1.5} />, desc: "Tailor-made itineraries designed exclusively for you." },
    { title: "Hotel Booking", icon: <Building size={20} strokeWidth={1.5} />, desc: "Premium stays and accommodations worldwide." }
  ];

  return (
    <PageWrapper style={{ padding: 0 }}>
      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', padding: '16mm 14mm 32mm 14mm', position: 'relative', zIndex: 10 }}>
        
        {/* Title Row & Baba Avatar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0, lineHeight: 1.1 }}>
              Contact <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Us</span>
            </h2>
            <div style={{ width: '48px', height: '2.5px', backgroundColor: luxuryTheme.orange, margin: '4px 0 8px' }}></div>
          </div>
          
          <div style={{ position: 'absolute', right: 0, top: '-24px', width: '120px', pointerEvents: 'none' }}>
            <img src="/Itinerary/baba.png" 
                 width={120}
                 style={{ width: '120px', height: 'auto', display: 'block', filter: 'drop-shadow(0 10px 15px rgba(224,90,54,0.15))' }} 
                 alt="Musafir Baba" />
          </div>
        </div>

        {/* GRID WRAPPER FOR CONTACT AND HOST */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', position: 'relative', zIndex: 20 }}>
            
            {/* Left Contact Info */}
            <div style={{ backgroundColor: '#FFFAF5', border: '1px solid rgba(254,223,206,0.5)', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '48px', height: '48px', backgroundColor: '#004439', borderBottomRightRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Headset color="#FFF" size={20} />
                </div>

                <p style={{ color: '#444', fontSize: '11px', lineHeight: 1.6, margin: 0, maxWidth: '85%', alignSelf: 'flex-end', textAlign: 'left' }}>
                    Our travel experts are available to assist you with any enquiries or to help you start planning your next journey.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    { icon: <Phone size={14} />, label: "Call Us", line1: "+91 928 960 2447", line2: "+91 921 708 2447" },
                    { icon: <Mail size={14} />, label: "Email Us", line1: "care@musafirbaba.com" },
                    { icon: <Globe size={14} />, label: "Website", line1: "www.musafirbaba.com" },
                    { icon: <MapPin size={14} />, label: "Office", line1: "Najafgarh, Delhi", last: true }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: item.last ? 'none' : '1px dashed #e5e5e5' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #FFF3E8', color: luxuryTheme.orange, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            {item.icon}
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: '#333', marginBottom: '2px' }}>{item.label}</span>
                            <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#111827' }}>{item.line1}</span>
                            {item.line2 && <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#111827' }}>{item.line2}</span>}
                        </div>
                    </div>
                  ))}
                </div>
            </div>

            {/* Right Host Card */}
            <div style={{ backgroundColor: '#004439', color: '#FFF', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                
                {/* Dotted pattern in corner */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '60px', opacity: 0.2, backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '8px 8px', pointerEvents: 'none' }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.25em', color: '#FFF', fontWeight: 700 }}>We Look Forward</span>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: 500, letterSpacing: '0.05em', margin: 0, color: luxuryTheme.gold }}>TO HOSTING YOU</h3>
                    
                    <div style={{ display: 'flex', alignItems: 'center', width: '120px', gap: '8px', margin: '4px 0' }}>
                      <div style={{ flex: 1, height: '1px', backgroundColor: luxuryTheme.gold }}></div>
                      <div style={{ width: '6px', height: '6px', transform: 'rotate(45deg)', backgroundColor: luxuryTheme.gold }}></div>
                      <div style={{ flex: 1, height: '1px', backgroundColor: luxuryTheme.gold }}></div>
                    </div>
                </div>

                <p style={{ color: '#E5E7EB', fontSize: '11px', lineHeight: 1.6, maxWidth: '90%', margin: '16px 0 0 0', zIndex: 1 }}>
                    Thank you for choosing MusafirBaba. We are committed to crafting extraordinary experiences that will stay with you forever.
                </p>

                {/* Signature block */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '24px', zIndex: 1 }}>
                    <span style={{ fontSize: '8px', color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Authorized Seal</span>
                    
                    <div style={{ height: '40px', opacity: 0.95, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
                        <svg style={{ height: '100%', width: '120px' }} viewBox="0 0 130 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 25C18 21 22 10 26 14C30 18 20 32 30 28C40 24 45 12 48 15C51 18 40 33 52 26C64 19 75 8 80 11C85 14 72 32 88 22C104 12 110 16 115 13 M15 32C45 28 85 24 118 27" 
                                  stroke={luxuryTheme.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    
                    <span style={{ fontSize: '10px', fontWeight: 700, color: luxuryTheme.gold, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0 0' }}>Ashutosh Rai</span>
                    <span style={{ fontSize: '7px', color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>Founder, MusafirBaba</span>
                </div>
            </div>
        </div>

        {/* OUR SERVICES SECTION */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '28px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0 }}>
              Our <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Services</span>
            </h3>
            <div style={{ width: '48px', height: '2px', backgroundColor: luxuryTheme.orange, margin: '4px 0 0' }}></div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {services.map((srv, idx) => (
              <div key={idx} style={{ backgroundColor: '#FFF', border: `1px solid ${luxuryTheme.gold}33`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FFFAF5', border: `1px solid ${luxuryTheme.gold}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: luxuryTheme.orange }}>
                  {srv.icon}
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: luxuryTheme.dark, margin: '0 0 4px' }}>{srv.title}</h4>
                  <p style={{ fontSize: '10px', color: luxuryTheme.gray, margin: 0, lineHeight: 1.4 }}>{srv.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OUR TRUSTED PARTNERS SECTION */}
        <div style={{ marginTop: 'auto', borderTop: `1px dashed ${luxuryTheme.gold}55`, paddingTop: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0 }}>
              Our Trusted <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Partners</span>
            </h2>
            <div style={{ width: '48px', height: '2px', backgroundColor: luxuryTheme.orange, margin: '4px 0 0' }}></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px 16px', alignItems: 'center' }}>
            {partners.map((partner, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', padding: '8px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: `1px solid ${luxuryTheme.gold}22`, height: '48px' }}>
                <img 
                  src={getCorsBypassedUrl(partner.image)} 
                  alt={partner.name} 
                  crossOrigin="anonymous"
                  style={{ width: '100%', maxWidth: '70px', objectFit: 'contain', maxHeight: '28px' }} 
                />
              </div>
            ))}
          </div>
        </div>

        </div>
        
        <PageFooter style={{ bottom: 0, left: 0, width: '100%', zIndex: 5 }} />
      </div>

    </PageWrapper>
  );
};
