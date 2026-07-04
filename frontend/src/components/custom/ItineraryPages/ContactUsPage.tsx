import React from 'react';
import { PageWrapper, luxuryTheme, PageFooter } from './shared';
import { Phone, Mail, Instagram, Globe, MapPin, Headset } from 'lucide-react';

export const ContactUsPage = () => {
  return (
    <PageWrapper>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${luxuryTheme.gold}33`, paddingBottom: '12px', fontSize: '10.5px', letterSpacing: '0.1em', color: luxuryTheme.gray, fontWeight: 600 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", textTransform: 'uppercase', color: luxuryTheme.dark }}>Get In Touch</span>
        <span>SECTION 12 / PAGE 13</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px', position: 'relative' }}>
        
        {/* Title Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ color: luxuryTheme.orange, fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Get In Touch</p>
          <h2 style={{ fontSize: '32px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0, lineHeight: 1.1 }}>
            Contact <br/>
            <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Us</span>
          </h2>
          <div style={{ width: '48px', height: '2px', backgroundColor: luxuryTheme.orange, margin: '4px 0 8px' }}></div>
        </div>

        {/* BEAUTIFUL MOUNTAIN LANDSCAPE HERO */}
        <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '16px', overflow: 'hidden', background: 'linear-gradient(to bottom, #FFFAF5, #FFF3E8, #FFFFFF)', border: '1px solid rgba(254, 223, 206, 0.6)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
            {/* Sky Glow / Sun */}
            <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', width: '112px', height: '112px', borderRadius: '50%', background: 'linear-gradient(to top, #FDE4DC, #FFFAF5)', opacity: 0.8, filter: 'blur(16px)' }}></div>
            
            {/* Mountain Layer 3 */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100px', opacity: 0.2 }}>
                <svg viewBox="0 0 800 200" preserveAspectRatio="none" style={{ width: '100%', height: '100%', fill: luxuryTheme.orange }}>
                    <path d="M0,200 L120,80 L240,140 L380,40 L500,130 L640,60 L800,200 Z" />
                </svg>
            </div>

            {/* Mountain Layer 2 */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '80px', opacity: 0.5 }}>
                <svg viewBox="0 0 800 200" preserveAspectRatio="none" style={{ width: '100%', height: '100%', fill: '#E28751' }}>
                    <path d="M0,200 L180,70 L340,150 L520,50 L680,120 L800,200 Z" />
                </svg>
            </div>

            {/* Mountain Layer 1 */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60px' }}>
                <svg viewBox="0 0 800 200" preserveAspectRatio="none" style={{ width: '100%', height: '100%', fill: 'rgba(254,223,206,0.9)', stroke: '#FDBFA8', strokeWidth: 2 }}>
                    <path d="M0,200 L100,110 L250,50 L420,130 L580,70 L720,140 L800,200 Z" />
                </svg>
            </div>
            
            {/* Elegant Linear Landscape Accent */}
            <div style={{ position: 'absolute', bottom: '8px', left: '24px', backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)', padding: '4px 12px', borderRadius: '9999px', border: '1px solid rgba(254,223,206,0.6)', fontSize: '9px', fontWeight: 700, color: luxuryTheme.orange, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: luxuryTheme.orange }}></span>
                Custom Expeditions
            </div>
        </div>

        {/* CHARACTER PLACEMENT OVERLAY */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '-120px', marginBottom: '-40px', position: 'relative', zIndex: 20, pointerEvents: 'none' }}>
            <div style={{ position: 'relative', width: '170px', minWidth: '170px', maxWidth: '170px' }}>
                <img src="/Itinerary/baba.png" 
                     width={170}
                     style={{ width: '170px', height: 'auto', display: 'block', filter: 'drop-shadow(0 10px 15px rgba(224,90,54,0.15))' }} 
                     alt="Musafir Baba" />
            </div>
        </div>

        {/* GRID WRAPPER */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', position: 'relative', zIndex: 10, paddingTop: '16px', marginTop: '8px' }}>
            
            {/* Left Contact Info */}
            <div style={{ backgroundColor: '#FFF', border: '2px solid rgba(254,223,206,0.5)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '24px' }}>
                {/* Headset icon node on top-right */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: '48px', height: '48px', backgroundColor: '#FFFAF5', borderBottomLeftRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #FFF3E8', borderBottom: '1px solid #FFF3E8' }}>
                    <Headset color={luxuryTheme.orange} size={16} />
                </div>

                <p style={{ color: '#6B7280', fontSize: '11px', lineHeight: 1.6, margin: 0, maxWidth: '90%' }}>
                    Our travel concierges are available to assist you with any inquiries or to help you start planning your next journey.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { icon: <Phone size={14} />, label: "Call Us", line1: "+91 928 960 2447", line2: "+91 921 708 2447" },
                    { icon: <Mail size={14} />, label: "Email Us", line1: "care@musafirbaba.com" },
                    { icon: <Instagram size={14} />, label: "Instagram", line1: "@hello_musafirbaba" },
                    { icon: <Globe size={14} />, label: "Website", line1: "www.musafirbaba.com" },
                    { icon: <MapPin size={14} />, label: "Office", line1: "Najafgarh, Delhi" }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FFFAF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #FFF3E8', color: luxuryTheme.orange }}>
                            {item.icon}
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: '#9CA3AF', marginBottom: '2px' }}>{item.label}</span>
                            <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#111827' }}>{item.line1}</span>
                            {item.line2 && <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#111827' }}>{item.line2}</span>}
                        </div>
                    </div>
                  ))}
                </div>
            </div>

            {/* Right Host Card */}
            <div style={{ background: 'linear-gradient(to bottom, #1C1917, #211E1C)', color: '#FFF', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden', minHeight: '320px', border: '1px solid #292524' }}>
                
                {/* Circular Watermarks */}
                <div style={{ position: 'absolute', top: '-48px', right: '-48px', width: '192px', height: '192px', borderRadius: '50%', border: '1px solid rgba(41,37,36,0.4)', pointerEvents: 'none' }}></div>
                <div style={{ position: 'absolute', bottom: '-48px', left: '-48px', width: '192px', height: '192px', borderRadius: '50%', border: '1px solid rgba(41,37,36,0.4)', pointerEvents: 'none' }}></div>

                <div style={{ height: '24px' }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(254,223,206,0.8)', fontWeight: 700 }}>We Look Forward</span>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 500, letterSpacing: '0.05em', margin: 0 }}>TO HOSTING YOU</h3>
                    <div style={{ width: '48px', height: '1px', backgroundColor: 'rgba(254,223,206,0.3)', margin: '8px 0' }}></div>
                </div>

                <p style={{ color: '#D1D5DB', fontSize: '12px', lineHeight: 1.6, maxWidth: '85%', margin: '8px 0 0 0' }}>
                    Thank you for choosing MusafirBaba. We are committed to crafting extraordinary experiences that will stay with you forever.
                </p>

                {/* Signature block */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '16px' }}>
                    <span style={{ fontSize: '7px', color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Authorized Seal</span>
                    
                    <div style={{ height: '40px', opacity: 0.95, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
                        <svg style={{ height: '100%', width: '130px' }} viewBox="0 0 130 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 25C18 21 22 10 26 14C30 18 20 32 30 28C40 24 45 12 48 15C51 18 40 33 52 26C64 19 75 8 80 11C85 14 72 32 88 22C104 12 110 16 115 13 M15 32C45 28 85 24 118 27" 
                                  stroke="#FEDFCE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    
                    <span style={{ fontSize: '8px', fontWeight: 700, color: '#FEDFCE', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0 0' }}>Ashutosh Rai</span>
                    <span style={{ fontSize: '6px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>Founder, MusafirBaba</span>
                </div>
            </div>
        </div>
      </div>

      <PageFooter />
    </PageWrapper>
  );
};
