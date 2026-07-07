import React from 'react';
import { PageWrapper, luxuryTheme, getInclusionIcon, getExclusionIcon, PageFooter } from './shared';
import { stripHtml } from '@/lib/utils';
import { Check, X, Shield, Star, UserCheck, Headset, Globe, MapPin, Sliders } from 'lucide-react';

export const InclusionsExclusionsPage = ({ inclusions, exclusions, title }: any) => {
  if ((!inclusions || inclusions.length === 0) && (!exclusions || exclusions.length === 0)) return null;

  return (
    <PageWrapper>


      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
        
        {/* INCLUSIONS & EXCLUSIONS SECTION */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ color: luxuryTheme.orange, fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>What's Included</p>
            <h2 style={{ fontSize: '28px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0 }}>
              Inclusions & <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Exclusions</span>
            </h2>
            <div style={{ width: '40px', height: '2px', backgroundColor: luxuryTheme.orange, margin: '4px 0 8px' }}></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
            {/* Inclusions Box */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '16px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ backgroundColor: '#dcfce7', color: '#15803d', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} strokeWidth={3} />
                </div>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Included</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(inclusions || []).map((inc: string, idx: number) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: luxuryTheme.dark, color: luxuryTheme.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      {React.cloneElement(getInclusionIcon(inc), { size: 8 })}
                    </div>
                    <p style={{ fontSize: '11px', color: '#334155', margin: 0, lineHeight: 1.4 }}>
                      {stripHtml(inc)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Exclusions Box */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '16px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} strokeWidth={3} />
                </div>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Excluded</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(exclusions || []).map((exc: string, idx: number) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#b91c1c', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      {React.cloneElement(getExclusionIcon(exc), { size: 8 })}
                    </div>
                    <p style={{ fontSize: '11px', color: '#334155', margin: 0, lineHeight: 1.4 }}>
                      {stripHtml(exc)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* WHY CHOOSE US SECTION */}
        <div style={{ marginTop: '32px', borderTop: `1px dashed ${luxuryTheme.gold}55`, paddingTop: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ color: luxuryTheme.orange, fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>The Musafir Baba Advantage</p>
            <h2 style={{ fontSize: '28px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0, lineHeight: 1.2 }}>
              Why Choose <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Us</span>
            </h2>
            <div style={{ width: '40px', height: '2px', backgroundColor: luxuryTheme.orange, margin: '4px 0 8px' }}></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 32px', marginTop: '8px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ color: luxuryTheme.gold }}><Globe size={20} strokeWidth={1.5} /></div>
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', marginTop: 0 }}>500+ travel experiences</h4>
                <p style={{ fontSize: '10.5px', color: luxuryTheme.gray, lineHeight: 1.4, margin: 0 }}>Domestic, international, religious, adventure, honeymoon, family, and customised holiday packages.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ color: luxuryTheme.gold }}><MapPin size={20} strokeWidth={1.5} /></div>
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', marginTop: 0 }}>Destination expertise</h4>
                <p style={{ fontSize: '10.5px', color: luxuryTheme.gray, lineHeight: 1.4, margin: 0 }}>Carefully planned itineraries using local knowledge, travel insights, and customer preferences.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ color: luxuryTheme.gold }}><Sliders size={20} strokeWidth={1.5} /></div>
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', marginTop: 0 }}>Flexible customisation</h4>
                <p style={{ fontSize: '10.5px', color: luxuryTheme.gray, lineHeight: 1.4, margin: 0 }}>Tailor hotels, sightseeing, transportation, activities, and travel duration to your needs.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ color: luxuryTheme.gold }}><Shield size={20} strokeWidth={1.5} /></div>
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', marginTop: 0 }}>Trusted partner network</h4>
                <p style={{ fontSize: '10.5px', color: luxuryTheme.gray, lineHeight: 1.4, margin: 0 }}>Reliable hotels, transport providers, guides, and local partners to enhance your experience.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ color: luxuryTheme.gold }}><UserCheck size={20} strokeWidth={1.5} /></div>
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', marginTop: 0 }}>Travel solutions for everyone</h4>
                <p style={{ fontSize: '10.5px', color: luxuryTheme.gray, lineHeight: 1.4, margin: 0 }}>Packages for couples, families, groups, solo travellers, senior citizens, and corporates.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ color: luxuryTheme.gold }}><Headset size={20} strokeWidth={1.5} /></div>
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', marginTop: 0 }}>Dedicated travel assistance</h4>
                <p style={{ fontSize: '10.5px', color: luxuryTheme.gray, lineHeight: 1.4, margin: 0 }}>Support before, during, and after your journey for a smooth and memorable experience.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <PageFooter />
    </PageWrapper>
  );
};
