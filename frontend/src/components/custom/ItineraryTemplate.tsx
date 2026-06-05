"use client";

import React, { forwardRef } from 'react';
import { MapPin, Clock, Plane, Star, Compass, Trees, Mountain, Utensils, Camera, Home, Bus, Activity, Bed, Headset, Percent, User, ShieldAlert, Shield, Calendar, Handshake, Users, AlertTriangle, Lock, Check, Hourglass, Building, CreditCard, Mail, Phone, Instagram, Globe } from 'lucide-react';
import { ItineraryItem } from './ItineryDialog';
import { stripHtml } from '@/lib/utils';

export interface ItineraryTemplateProps {
  title: string;
  description: string;
  itinerary: ItineraryItem[];
  duration?: string;
  img?: string;
  highlights?: string[];
  destination?: string;
  gallery?: { url: string; alt: string }[];
  inclusions?: string[];
  exclusions?: string[];
  batch?: any[];
}

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

const getCorsBypassedUrl = (url?: string) => {
  if (!url) return url;
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return url.includes('?') ? `${url}&cors=true` : `${url}?cors=true`;
};

export const ItineraryTemplate = forwardRef<HTMLDivElement, ItineraryTemplateProps>(
  ({ title, description, itinerary, duration, img, highlights, destination, gallery, inclusions = [], exclusions = [], batch = [] }, ref) => {
    
    // Split itinerary into pages (3 items per page for good spacing)
    const ITEMS_PER_PAGE = 3;
    const itineraryPages: ItineraryItem[][] = [];
    if (itinerary && itinerary.length > 0) {
      for (let i = 0; i < itinerary.length; i += ITEMS_PER_PAGE) {
        itineraryPages.push(itinerary.slice(i, i + ITEMS_PER_PAGE));
      }
    }

    // Take first 4 highlights for the overview page
    const topHighlights = (highlights || []).slice(0, 4);

    const fallbacks = [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=600&auto=format&fit=crop'
    ];

    const getDayImage = (globalIdx: number) => {
      if (gallery && gallery.length > 0) {
        const imgObj = gallery[globalIdx % gallery.length];
        if (imgObj && imgObj.url) return getCorsBypassedUrl(imgObj.url);
      }
      return fallbacks[globalIdx % fallbacks.length];
    };

    const getDayLocation = (titleText: string, defaultDest: string) => {
      let clean = stripHtml(titleText).replace(/^day\s*\d+\s*[:\-]?\s*/i, '').trim();
      
      if (clean.toLowerCase().includes(' to ')) {
        const parts = clean.split(/\s+to\s+/i);
        clean = parts[parts.length - 1];
      } else if (clean.includes('-')) {
        const parts = clean.split('-');
        clean = parts[parts.length - 1];
      } else if (clean.includes('—')) {
        const parts = clean.split('—');
        clean = parts[parts.length - 1];
      }
      
      clean = clean.replace(/\b(Arrival|Sightseeing|Departure|Trek|Transfer|Visit|Temple|Journey|Day)\b/ig, '').trim();
      clean = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
      
      if (!clean) return defaultDest || 'Travel';
      const words = clean.split(/\s+/);
      return words.slice(0, 2).join(' ');
    };

    const parseDescriptionPoints = (descHtml: string) => {
      if (!descHtml) return [];
      
      let cleaned = descHtml
        .replace(/<\/p>/gi, '|@|')
        .replace(/<\/li>/gi, '|@|')
        .replace(/<br\s*\/?>/gi, '|@|')
        .replace(/\n/g, '|@|');
        
      cleaned = stripHtml(cleaned);
      
      const points = cleaned
        .split('|@|')
        .map(p => p.trim())
        .filter(p => p.length > 5);
        
      if (points.length <= 1) {
        const sentences = cleaned
          .split(/(?<=[.!?])\s+/)
          .map(s => s.trim())
          .filter(s => s.length > 5);
        if (sentences.length > 0) return sentences;
      }
      
      return points;
    };

    const getPointIcon = (text: string) => {
      const s = text.toLowerCase();
      if (s.includes('pickup') || s.includes('drive') || s.includes('transfer') || s.includes('road') || s.includes('travel') || s.includes('ride') || s.includes('car') || s.includes('bus')) {
        return <Bus size={12} color="#ffffff" />;
      }
      if (s.includes('check-in') || s.includes('hotel') || s.includes('stay') || s.includes('overnight') || s.includes('room') || s.includes('resort')) {
        return <Home size={12} color="#ffffff" />;
      }
      if (s.includes('aarti') || s.includes('temple') || s.includes('witness') || s.includes('darshan') || s.includes('divine') || s.includes('blessing') || s.includes('spiritual')) {
        return <Activity size={12} color="#ffffff" />;
      }
      if (s.includes('dinner') || s.includes('breakfast') || s.includes('lunch') || s.includes('food') || s.includes('meal') || s.includes('restaurant')) {
        return <Utensils size={12} color="#ffffff" />;
      }
      if (s.includes('trek') || s.includes('mountain') || s.includes('hike') || s.includes('walk') || s.includes('climb')) {
        return <Mountain size={12} color="#ffffff" />;
      }
      if (s.includes('scenic') || s.includes('view') || s.includes('photography') || s.includes('photos') || s.includes('camera')) {
        return <Camera size={12} color="#ffffff" />;
      }
      return <Star size={12} color="#ffffff" />;
    };

    const formatDescription = (descText: string) => {
      const clean = stripHtml(descText).trim();
      const words = clean.split(/\s+/);
      if (words.length <= 2) {
        return <strong style={{ color: '#0f2133', fontWeight: 700 }}>{clean}</strong>;
      }
      const boldPart = words.slice(0, 2).join(' ');
      const normalPart = words.slice(2).join(' ');
      return (
        <span>
          <strong style={{ color: '#0f2133', fontWeight: 700 }}>{boldPart} </strong>
          {normalPart}
        </span>
      );
    };

    const getInclusionIcon = (text: string) => {
      const s = text.toLowerCase();
      if (s.includes('traveller') || s.includes('tempo') || s.includes('cab') || s.includes('taxi') || s.includes('bus') || s.includes('car') || s.includes('transfer') || s.includes('transport')) {
        return <Bus size={13} color="#ffffff" />;
      }
      if (s.includes('stay') || s.includes('hotel') || s.includes('accommodation') || s.includes('sharing') || s.includes('room') || s.includes('resort')) {
        return <Bed size={13} color="#ffffff" />;
      }
      if (s.includes('meal') || s.includes('breakfast') || s.includes('dinner') || s.includes('lunch') || s.includes('veg') || s.includes('food')) {
        return <Utensils size={13} color="#ffffff" />;
      }
      if (s.includes('parking') || s.includes('toll') || s.includes('driver') || s.includes('charge')) {
        return <Activity size={13} color="#ffffff" />;
      }
      if (s.includes('sightseeing') || s.includes('tour') || s.includes('excursion') || s.includes('itinerary')) {
        return <Camera size={13} color="#ffffff" />;
      }
      if (s.includes('assistance') || s.includes('support') || s.includes('guide') || s.includes('helpline') || s.includes('24/7') || s.includes('throughout')) {
        return <Headset size={13} color="#ffffff" />;
      }
      return <Star size={13} color="#ffffff" />;
    };

    const getExclusionIcon = (text: string) => {
      const s = text.toLowerCase();
      if (s.includes('personal') || s.includes('expense') || s.includes('shopping') || s.includes('laundry') || s.includes('tips') || s.includes('phone')) {
        return <User size={13} color="#ffffff" />;
      }
      if (s.includes('pony') || s.includes('doli') || s.includes('helicopter') || s.includes('ride') || s.includes('trek') || s.includes('charges')) {
        return <Activity size={13} color="#ffffff" />;
      }
      if (s.includes('entrance') || s.includes('ticket') || s.includes('fee') || s.includes('monument') || s.includes('temple') || s.includes('museum')) {
        return <Compass size={13} color="#ffffff" />;
      }
      if (s.includes('lunch') || s.includes('extra') || s.includes('meal') || s.includes('food')) {
        return <Utensils size={13} color="#ffffff" />;
      }
      if (s.includes('insurance') || s.includes('medical') || s.includes('hospital') || s.includes('doctor') || s.includes('medicine')) {
        return <ShieldAlert size={13} color="#ffffff" />;
      }
      if (s.includes('gst') || s.includes('tax') || s.includes('percent') || s.includes('%')) {
        return <Percent size={13} color="#ffffff" />;
      }
      return <Star size={13} color="#ffffff" />;
    };

    return (
      <div 
        ref={ref} 
        className="handwritten-container"
        style={{ position: 'fixed', top: 0, left: 0, opacity: 0.01, zIndex: -9999, pointerEvents: 'none' }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
          /* Increase line height slightly for handwritten cursive */
          .handwritten-container * {
            line-height: 1.4 !important;
          }
        `}} />
        {/* ========== PAGE 1: COVER IMAGE ========== */}
        <div style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px`, overflow: 'hidden', position: 'relative' }}>
          <img 
            src="/Itinerary/coverimage.png" 
            alt="Itinerary Cover" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* ========== PAGE 2: OVERVIEW PAGE ========== */}
        <div style={{ 
          width: `${A4_WIDTH}px`, 
          height: `${A4_HEIGHT}px`, 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#fdfbf7',
          overflow: 'hidden',
          fontFamily: "'Caveat', cursive, system-ui, -apple-system, sans-serif"
        }}>
          {/* Header Image with clean website logo overlay to hide cut-off baked-in logo */}
          <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img 
              src="/Itinerary/header.png" 
              alt="Header" 
              style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '135px',
              backgroundColor: '#fefefc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px'
            }}>
              <img 
                src="/logo.png" 
                alt="Musafir Baba Logo" 
                style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Body Content */}
          <div style={{ flex: 1, padding: '14px 36px 10px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
            
            {/* OVERVIEW Title with diamond decorations */}
            <div style={{ textAlign: 'center', marginBottom: '0px', marginTop: '0px' }}>
              <h2 style={{ 
                fontSize: '44px', 
                fontWeight: 700, 
                color: '#0f2133', 
                letterSpacing: '6px',
                margin: 0,
                textTransform: 'uppercase'
              }}>OVERVIEW</h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '0px' }}>
                <div style={{ width: '40px', height: '1px', backgroundColor: '#e28325' }}></div>
                <span style={{ color: '#e28325', fontSize: '10px' }}>◆</span>
                <div style={{ width: '40px', height: '1px', backgroundColor: '#e28325' }}></div>
              </div>
            </div>

            {/* Tour Info + Package Image Row */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              {/* Left: Tour Details with vertical orange border */}
              <div style={{ flex: 1, borderLeft: '3px solid #e28325', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Tour Name */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', 
                    backgroundColor: '#e28325', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px'
                  }}>
                    <Plane size={14} color="#ffffff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, lineHeight: '1.4' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#e28325', textTransform: 'uppercase', letterSpacing: '1px' }}>TOUR:&nbsp;</span>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f2133' }}>{title}</span>
                    </p>
                    <p style={{ fontSize: '13px', color: '#555', margin: '3px 0 0', lineHeight: '1.4' }}>
                      {stripHtml(description).substring(0, 120)}{stripHtml(description).length > 120 ? '...' : ''}
                    </p>
                  </div>
                </div>

                {/* Duration */}
                {duration && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      backgroundColor: '#e28325', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Clock size={14} color="#ffffff" />
                    </div>
                    <p style={{ flex: 1, margin: 0, lineHeight: '1.4' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#e28325', textTransform: 'uppercase', letterSpacing: '1px' }}>DURATION:&nbsp;</span>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: '#0f2133' }}>{duration}</span>
                    </p>
                  </div>
                )}

                {/* Destination */}
                {destination && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      backgroundColor: '#e28325', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <MapPin size={14} color="#ffffff" />
                    </div>
                    <p style={{ flex: 1, margin: 0, lineHeight: '1.4' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#e28325', textTransform: 'uppercase', letterSpacing: '1px' }}>START / END POINT:&nbsp;</span>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: '#0f2133' }}>
                        {destination.charAt(0).toUpperCase() + destination.slice(1)}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Package Cover Image with decorative frame */}
              {img && (
                <div style={{ 
                  width: '300px', height: '210px', flexShrink: 0, position: 'relative'
                }}>
                  {/* Outer decorative border */}
                  <div style={{ 
                    position: 'absolute', top: '6px', left: '6px', right: '-6px', bottom: '-6px',
                    border: '2px solid #e28325', borderRadius: '10px'
                  }}></div>
                  <div style={{ 
                    width: '100%', height: '100%', borderRadius: '10px', overflow: 'hidden',
                    position: 'relative', zIndex: 1
                  }}>
                    <img 
                      src={getCorsBypassedUrl(img)} 
                      alt={title} 
                      crossOrigin="anonymous"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* KEY HIGHLIGHTS Section - Full width card with top navy+orange border */}
            {topHighlights.length > 0 && (
              <div style={{ 
                borderRadius: '12px', overflow: 'hidden',
                border: '1px solid #dce3eb'
              }}>
                {/* Top bar: navy with orange border */}
                <div style={{ 
                  backgroundColor: '#0f2133', padding: '10px 0', textAlign: 'center',
                  borderBottom: '3px solid #e28325'
                }}>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#e28325', letterSpacing: '4px', margin: 0 }}>
                    ◆&nbsp;&nbsp;KEY HIGHLIGHTS&nbsp;&nbsp;◆
                  </p>
                </div>
                {/* Highlights grid */}
                <div style={{ 
                  backgroundColor: '#ffffff', padding: '12px 14px',
                  display: 'grid', 
                  gridTemplateColumns: `repeat(${Math.min(topHighlights.length, 4)}, 1fr)`, 
                  gap: '10px'
                }}>
                  {topHighlights.map((h, i) => (
                    <div key={i} style={{ 
                      textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
                    }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', 
                        border: '2px solid #0f2133', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Star size={20} color="#0f2133" />
                      </div>
                      <p style={{ fontSize: '13px', color: '#0f2133', fontWeight: 700, lineHeight: '1.2', margin: 0 }}>
                        {h.length > 60 ? h.substring(0, 60) + '...' : h}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom: Stacking cards vertically for full width to prevent text wrapping/overlap */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Left: PACKAGE TYPE card */}
              <div style={{ 
                borderRadius: '12px', overflow: 'hidden',
                border: '1px solid #dce3eb', display: 'flex', flexDirection: 'column',
                backgroundColor: '#ffffff'
              }}>
                {/* Card header with icon */}
                <div style={{ 
                  backgroundColor: '#0f2133', padding: '8px 14px', 
                  display: 'flex', alignItems: 'center', gap: '8px',
                  borderBottom: '3px solid #e28325'
                }}>
                  <div style={{ 
                    width: '24px', height: '24px', borderRadius: '50%', 
                    backgroundColor: '#e28325', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Plane size={12} color="#ffffff" />
                  </div>
                  <p style={{ whiteSpace: 'nowrap', fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '2px', margin: 0, textTransform: 'uppercase' }}>
                    PACKAGE TYPE
                  </p>
                </div>
                {/* Card body */}
                <div style={{ padding: '12px 14px', backgroundColor: '#ffffff' }}>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f2133', margin: '0 0 6px' }}>{title}</p>
                  <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4', margin: 0, textAlign: 'justify' }}>
                    {stripHtml(description).substring(0, 250)}{stripHtml(description).length > 250 ? '...' : ''}
                  </p>
                </div>
              </div>

              {/* Right: IDEAL FOR / HIGHLIGHTS card */}
              {highlights && highlights.length > 0 && (
                <div style={{ 
                  borderRadius: '12px', overflow: 'hidden',
                  border: '1px solid #dce3eb', display: 'flex', flexDirection: 'column',
                  backgroundColor: '#ffffff'
                }}>
                  {/* Card header */}
                  <div style={{ 
                    backgroundColor: '#0f2133', padding: '8px 14px', 
                    display: 'flex', alignItems: 'center', gap: '8px',
                    borderBottom: '3px solid #e28325'
                  }}>
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', 
                      backgroundColor: '#e28325', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Star size={12} color="#ffffff" />
                    </div>
                    <p style={{ whiteSpace: 'nowrap', fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '2px', margin: 0, textTransform: 'uppercase' }}>
                      IDEAL FOR
                    </p>
                  </div>
                  {/* Card body */}
                  <div style={{ padding: '12px 14px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {highlights.slice(0, 4).map((h, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '18px', height: '18px', borderRadius: '50%', 
                          backgroundColor: '#e28325', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Star size={8} color="#ffffff" />
                        </div>
                        <p style={{ flex: 1, fontSize: '13px', color: '#334155', margin: 0, lineHeight: '1.4' }}>
                          {h}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Image */}
          <div style={{ width: '100%', height: '72px', flexShrink: 0 }}>
            <img 
              src="/Itinerary/footer.png" 
              alt="Footer" 
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            />
          </div>
        </div>

        {/* ========== PAGE 3: BRIEF ITINERARY PAGE ========== */}
        <div style={{ 
          width: `${A4_WIDTH}px`, 
          height: `${A4_HEIGHT}px`, 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#fdfbf7',
          overflow: 'hidden',
          fontFamily: "'Caveat', cursive, system-ui, -apple-system, sans-serif"
        }}>
          {/* Header Image with clean website logo overlay to hide cut-off baked-in logo */}
          <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img 
              src="/Itinerary/header.png" 
              alt="Header" 
              style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '135px',
              backgroundColor: '#fefefc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px'
            }}>
              <img 
                src="/logo.png" 
                alt="Musafir Baba Logo" 
                style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* BRIEF ITINERARY Title */}
          <div style={{ textAlign: 'center', padding: '10px 0 5px', marginTop: '0px', position: 'relative', zIndex: 10 }}>
            <h2 style={{ 
              fontSize: '40px', 
              fontWeight: 700, 
              color: '#0a422d', 
              letterSpacing: '4px',
              margin: 0,
              textTransform: 'uppercase'
            }}>BRIEF ITINERARY</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
              <div style={{ width: '40px', height: '1px', backgroundColor: '#e28325' }}></div>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}>
                <Bus size={14} color="#0a422d" />
              </span>
              <div style={{ width: '40px', height: '1px', backgroundColor: '#e28325' }}></div>
            </div>
          </div>

          {/* Main Content Area: 2 Columns */}
          <div style={{ 
            flex: 1, 
            padding: '10px 36px 15px', 
            display: 'flex', 
            gap: '28px', 
            overflow: 'hidden', 
            alignItems: 'flex-start' 
          }}>
            {/* Left Column: Polaroid Stack & Card */}
            <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', height: '100%' }}>
              {/* Polaroid Collage Frame Wrapper */}
              <div style={{ position: 'relative', width: '200px', height: '360px', marginTop: '20px' }}>
                {/* Polaroid 1 (Top) */}
                <div style={{ 
                  position: 'absolute', 
                  top: '0px', 
                  left: '10px', 
                  width: '170px', 
                  height: '170px', 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  padding: '8px 8px 24px 8px', 
                  boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                  transform: 'rotate(4deg)',
                  zIndex: 3
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#0a422d',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    zIndex: 5
                  }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#2e7d32', margin: '3px' }} />
                  </div>
                  <img 
                    src={getCorsBypassedUrl((gallery && gallery[0]?.url) || img || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop')} 
                    alt="Polaroid 1" 
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>

                {/* Polaroid 2 (Middle) */}
                <div style={{ 
                  position: 'absolute', 
                  top: '90px', 
                  left: '-15px', 
                  width: '170px', 
                  height: '170px', 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  padding: '8px 8px 24px 8px', 
                  boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                  transform: 'rotate(-6deg)',
                  zIndex: 2
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#0a422d',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    zIndex: 5
                  }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#2e7d32', margin: '3px' }} />
                  </div>
                  <img 
                    src={getCorsBypassedUrl((gallery && gallery[1]?.url) || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop')} 
                    alt="Polaroid 2" 
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>

                {/* Polaroid 3 (Bottom) */}
                <div style={{ 
                  position: 'absolute', 
                  top: '180px', 
                  left: '15px', 
                  width: '170px', 
                  height: '170px', 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  padding: '8px 8px 24px 8px', 
                  boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                  transform: 'rotate(5deg)',
                  zIndex: 1
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#0a422d',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    zIndex: 5
                  }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#2e7d32', margin: '3px' }} />
                  </div>
                  <img 
                    src={getCorsBypassedUrl((gallery && gallery[2]?.url) || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=600&auto=format&fit=crop')} 
                    alt="Polaroid 3" 
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              </div>

              {/* Decorative Intro Card */}
              <div style={{ 
                width: '100%', 
                backgroundColor: '#ffffff', 
                border: '2px double #e28325', 
                borderRadius: '8px', 
                padding: '14px 16px',
                textAlign: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <h3 style={{ 
                  fontSize: '24px', 
                  color: '#0a422d', 
                  fontWeight: 700, 
                  margin: '0 0 6px'
                }}>
                  {(() => {
                    const t = (destination + ' ' + title).toLowerCase();
                    if (t.includes('chardham') || t.includes('temple') || t.includes('yatra') || t.includes('divine')) return 'A Divine Journey';
                    if (t.includes('adventure') || t.includes('trek') || t.includes('camp')) return 'An Active Adventure';
                    return 'A Scenic Journey';
                  })()}
                </h3>
                <p style={{ 
                  fontSize: '15px', 
                  color: '#475569', 
                  lineHeight: '1.3', 
                  margin: '0 0 8px' 
                }}>
                  Experience the spiritual essence, breathtaking landscapes and timeless traditions of the sacred regions.
                </p>
                <div style={{ fontSize: '10px', color: '#e28325' }}>—— ◆ ——</div>
              </div>
            </div>

            {/* Right Column: Vertical Timeline */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
              
              {/* Dynamic Timeline layout depending on the number of days */}
              {(() => {
                const dayCount = itinerary.length;
                let gapSize = '14px';
                let dayFontSize = '19px';
                let routeFontSize = '15px';
                let iconWrapperSize = '32px';
                let iconSize = 14;

                if (dayCount <= 6) {
                  gapSize = '24px';
                  dayFontSize = '23px';
                  routeFontSize = '18px';
                  iconWrapperSize = '38px';
                  iconSize = 16;
                } else if (dayCount > 6 && dayCount <= 9) {
                  gapSize = '16px';
                  dayFontSize = '20px';
                  routeFontSize = '16px';
                  iconWrapperSize = '34px';
                  iconSize = 14;
                } else if (dayCount > 9 && dayCount <= 12) {
                  gapSize = '10px';
                  dayFontSize = '17px';
                  routeFontSize = '14px';
                  iconWrapperSize = '28px';
                  iconSize = 12;
                } else {
                  gapSize = '6px';
                  dayFontSize = '15px';
                  routeFontSize = '12px';
                  iconWrapperSize = '24px';
                  iconSize = 10;
                }

                const cleanRoute = (t: string) => {
                  let clean = t.replace(/^day\s*\d+\s*[:\-]?\s*/i, '').trim();
                  clean = stripHtml(clean);
                  if (clean.length > 50) return clean.substring(0, 50) + '...';
                  return clean;
                };

                const getTimelineIcon = (t: string, d: string) => {
                  const s = (t + ' ' + d).toLowerCase();
                  if (s.includes('cable') || s.includes('ropeway')) return <Activity size={iconSize} color="#0a422d" />;
                  if (s.includes('temple') || s.includes('darshan') || s.includes('church') || s.includes('spiritual') || s.includes('divine') || s.includes('badrinath') || s.includes('kedarnath') || s.includes('yamunotri') || s.includes('gangotri') || s.includes('haridwar') || s.includes('rishi')) return <Home size={iconSize} color="#0a422d" />;
                  if (s.includes('trek') || s.includes('mountain') || s.includes('himalaya') || s.includes('peak') || s.includes('hill') || s.includes('glacier')) return <Mountain size={iconSize} color="#0a422d" />;
                  if (s.includes('forest') || s.includes('park') || s.includes('jungle') || s.includes('tree') || s.includes('garden')) return <Trees size={iconSize} color="#0a422d" />;
                  if (s.includes('drive') || s.includes('transfer') || s.includes('road') || s.includes('travel') || s.includes('delhi')) return <Bus size={iconSize} color="#0a422d" />;
                  if (s.includes('food') || s.includes('dinner') || s.includes('breakfast') || s.includes('lunch') || s.includes('meal')) return <Utensils size={iconSize} color="#0a422d" />;
                  return <Compass size={iconSize} color="#0a422d" />;
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: gapSize, position: 'relative', paddingLeft: '24px', paddingTop: '10px' }}>
                    {/* Vertical Dashed Line */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '15px', 
                      bottom: '15px', 
                      left: '8px', 
                      borderLeft: '2px dashed #0a422d', 
                      opacity: 0.8,
                      zIndex: 1 
                    }} />

                    {/* Timeline Days */}
                    {itinerary.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                        {/* Bullet point on the vertical line */}
                        <div style={{ 
                          position: 'absolute',
                          left: '-20px',
                          width: '10px',
                          height: '10px',
                          backgroundColor: '#0a422d',
                          transform: 'rotate(45deg)',
                          border: '2px solid #fdfbf7',
                          boxShadow: '0 0 0 2px #0a422d'
                        }} />

                        {/* Text Route (Left) */}
                        <div style={{ flex: 1, paddingLeft: '10px' }}>
                          <p style={{ fontSize: dayFontSize, fontWeight: 700, color: '#0a422d', margin: 0 }}>
                            Day {idx + 1}
                          </p>
                          <p style={{ fontSize: routeFontSize, color: '#0f2133', fontWeight: 600, margin: '2px 0 0', lineHeight: '1.2' }}>
                            {cleanRoute(item.title)}
                          </p>
                        </div>

                        {/* Round Beige Circle Icon (Right) */}
                        <div style={{ 
                          width: iconWrapperSize, 
                          height: iconWrapperSize, 
                          borderRadius: '50%', 
                          backgroundColor: '#fdf7f2', 
                          border: '1px solid #e28325', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {getTimelineIcon(item.title, item.description)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

            </div>
          </div>

          {/* Footer Image */}
          <div style={{ width: '100%', height: '72px', flexShrink: 0 }}>
            <img 
              src="/Itinerary/footer.png" 
              alt="Footer" 
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            />
          </div>
        </div>

        {/* ========== ITINERARY DAY PAGES ========== */}
        {itineraryPages.map((pageItems, pageIndex) => (
          <div 
            key={pageIndex}
            style={{ 
              width: `${A4_WIDTH}px`, 
              height: `${A4_HEIGHT}px`, 
              position: 'relative', 
              display: 'flex', 
              flexDirection: 'column',
              backgroundColor: '#fdfbf7',
              overflow: 'hidden',
              fontFamily: "'Caveat', cursive, system-ui, -apple-system, sans-serif"
            }}
          >
            {/* Header Image with clean website logo overlay to hide cut-off baked-in logo */}
            <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              <img 
                src="/Itinerary/header.png" 
                alt="Header" 
                style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
              />
              <div style={{
                position: 'absolute',
                top: '15px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '320px',
                height: '135px',
                backgroundColor: '#fefefc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '10px'
              }}>
                <img 
                  src="/logo.png" 
                  alt="Musafir Baba Logo" 
                  style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Page Title */}
            <div style={{ textAlign: 'center', padding: '10px 0 5px', marginTop: '0px', position: 'relative', zIndex: 10 }}>
              <h2 style={{ 
                fontSize: '36px', fontWeight: 700, color: '#0f2133', letterSpacing: '3px', margin: 0
              }}>
                DETAILED ITINERARY
              </h2>
              <div style={{ width: '50px', height: '3px', backgroundColor: '#e28325', margin: '4px auto 0' }}></div>
            </div>

            {/* Day-by-Day Content */}
            <div style={{ flex: 1, padding: '10px 40px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pageItems.map((item, i) => {
                const globalIndex = (pageIndex * ITEMS_PER_PAGE) + i;
                const dayPoints = parseDescriptionPoints(item.description).slice(0, 4);
                return (
                  <div key={i} style={{ 
                    position: 'relative',
                    width: '100%', 
                    height: '210px', 
                    backgroundColor: '#ffffff', 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0', 
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: globalIndex % 2 === 0 ? 'row' : 'row-reverse',
                    gap: '20px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    alignItems: 'center',
                    flexShrink: 0
                  }}>
                    {/* Image Column */}
                    {/* Image Column (Clean, no overlays/labeling) */}
                    <div style={{ 
                      width: '280px', 
                      height: '100%', 
                      flexShrink: 0, 
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}>
                      <img 
                        src={getDayImage(globalIndex)} 
                        alt={item.title} 
                        crossOrigin="anonymous"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>

                    {/* Activities Column */}
                    <div style={{ 
                      flex: 1, 
                      height: '100%', 
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '4px 0'
                    }}>
                      {/* Day Header Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexShrink: 0 }}>
                        {/* Day Badge */}
                        <div style={{ 
                          backgroundColor: '#0a422d', 
                          padding: '3px 10px', 
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.5px' }}>
                            DAY {globalIndex + 1}
                          </span>
                        </div>
                        {/* Day Title / Location */}
                        <h4 style={{ 
                          fontSize: '15px', 
                          fontWeight: 700, 
                          color: '#0f2133', 
                          margin: 0,
                          lineHeight: '1.2',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {stripHtml(item.title)}
                        </h4>
                      </div>

                      {/* Timeline List Container */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                        {/* Dotted vertical line connecting icons */}
                        {dayPoints.length > 1 && (
                          <div style={{
                            position: 'absolute',
                            top: '20px',
                            bottom: '20px',
                            left: '14px',
                            borderLeft: '2px dashed #0a422d',
                            opacity: 0.25,
                            zIndex: 1
                          }} />
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 2 }}>
                          {dayPoints.length > 0 ? (
                            dayPoints.map((pt, pIdx) => (
                              <div key={pIdx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Circle Icon Wrapper */}
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: '#0a422d',
                                  border: '2px solid #ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}>
                                  {getPointIcon(pt)}
                                </div>
                                {/* Point Text */}
                                <p style={{ 
                                  flex: 1, 
                                  fontSize: '13px', 
                                  color: '#334155', 
                                  margin: 0, 
                                  lineHeight: '1.35',
                                  textAlign: 'left'
                                }}>
                                  {formatDescription(pt)}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: '#0a422d',
                                border: '2px solid #ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <Star size={12} color="#ffffff" />
                              </div>
                              <p style={{ flex: 1, fontSize: '13px', color: '#334155', margin: 0, lineHeight: '1.35', textAlign: 'left' }}>
                                {formatDescription(item.title)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Image */}
            <div style={{ width: '100%', height: '72px', flexShrink: 0 }}>
              <img 
                src="/Itinerary/footer.png" 
                alt="Footer" 
                style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
              />
            </div>
          </div>
        ))}

        {/* ========== PAGE 4: INCLUSIONS & EXCLUSIONS ========== */}
        {((inclusions && inclusions.length > 0) || (exclusions && exclusions.length > 0)) && (
          <div 
            style={{ 
              width: `${A4_WIDTH}px`, 
              height: `${A4_HEIGHT}px`, 
              position: 'relative', 
              display: 'flex', 
              flexDirection: 'column',
              backgroundColor: '#fdfbf7',
              overflow: 'hidden'
            }}
          >
            {/* Header Image with clean website logo overlay */}
            <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              <img 
                src="/Itinerary/header.png" 
                alt="Header" 
                style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
              />
              <div style={{
                position: 'absolute',
                top: '15px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '320px',
                height: '135px',
                backgroundColor: '#fefefc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '10px'
              }}>
                <img 
                  src="/logo.png" 
                  alt="Musafir Baba Logo" 
                  style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Inclusions & Exclusions Content */}
            {(() => {
              const totalCount = (inclusions ? inclusions.length : 0) + (exclusions ? exclusions.length : 0);
              const cardPadding = totalCount > 10 ? '8px 14px' : '12px 18px';
              const itemGap = totalCount > 10 ? '6px' : '8px';
              const sectionGap = totalCount > 10 ? '16px' : '30px';
              const fontSize = totalCount > 10 ? '12px' : '14px';
              const iconSize = totalCount > 10 ? 11 : 13;
              const iconCircleSize = totalCount > 10 ? '22px' : '26px';

              return (
                <div style={{ flex: 1, padding: '10px 40px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: sectionGap }}>
                  {/* 1. INCLUSIONS SECTION */}
                  {inclusions && inclusions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Title */}
                      <div style={{ textAlign: 'center', position: 'relative' }}>
                        <h2 style={{ 
                          fontSize: totalCount > 10 ? '28px' : '32px', fontWeight: 700, color: '#0a422d', letterSpacing: '3px', margin: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                        }}>
                          <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                          INCLUSIONS
                          <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                        </h2>
                        <div style={{ width: '40px', height: '2px', backgroundColor: '#0a422d', margin: '3px auto 0' }}></div>
                      </div>

                      {/* Border Card */}
                      <div style={{ 
                        backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #dce3eb',
                        padding: cardPadding, display: 'flex', flexDirection: 'column', gap: itemGap,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}>
                        {inclusions.map((inc, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Icon circle */}
                            <div style={{
                              width: iconCircleSize, height: iconCircleSize, borderRadius: '50%',
                              backgroundColor: '#0a422d', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {React.cloneElement(getInclusionIcon(inc), { size: iconSize })}
                            </div>
                            {/* Divider */}
                            <div style={{ width: '1px', height: '18px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />
                            {/* Text */}
                            <p style={{ flex: 1, fontSize: fontSize, color: '#334155', margin: 0, fontWeight: 600, textAlign: 'left' }}>
                              {stripHtml(inc)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. EXCLUSIONS SECTION */}
                  {exclusions && exclusions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Title */}
                      <div style={{ textAlign: 'center', position: 'relative' }}>
                        <h2 style={{ 
                          fontSize: totalCount > 10 ? '28px' : '32px', fontWeight: 700, color: '#a80000', letterSpacing: '3px', margin: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                        }}>
                          <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                          EXCLUSIONS
                          <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                        </h2>
                        <div style={{ width: '40px', height: '2px', backgroundColor: '#a80000', margin: '3px auto 0' }}></div>
                      </div>

                      {/* Border Card */}
                      <div style={{ 
                        backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #dce3eb',
                        padding: cardPadding, display: 'flex', flexDirection: 'column', gap: itemGap,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}>
                        {exclusions.map((exc, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Icon circle */}
                            <div style={{
                              width: iconCircleSize, height: iconCircleSize, borderRadius: '50%',
                              backgroundColor: '#a80000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {React.cloneElement(getExclusionIcon(exc), { size: iconSize })}
                            </div>
                            {/* Divider */}
                            <div style={{ width: '1px', height: '18px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />
                            {/* Text */}
                            <p style={{ flex: 1, fontSize: fontSize, color: '#334155', margin: 0, fontWeight: 600, textAlign: 'left' }}>
                              {stripHtml(exc)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Footer Image */}
            <div style={{ width: '100%', height: '72px', flexShrink: 0 }}>
              <img 
                src="/Itinerary/footer.png" 
                alt="Footer" 
                style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
              />
            </div>
          </div>
        )}

        {/* ========== PAGE 5: WHY TRAVEL WITH MUSAFIRBABA ========== */}
        <div 
          style={{ 
            width: `${A4_WIDTH}px`, 
            height: `${A4_HEIGHT}px`, 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#fdfbf7',
            overflow: 'hidden'
          }}
        >
          {/* Header Image with clean website logo overlay */}
          <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img 
              src="/Itinerary/header.png" 
              alt="Header" 
              style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '135px',
              backgroundColor: '#fefefc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px'
            }}>
              <img 
                src="/logo.png" 
                alt="Musafir Baba Logo" 
                style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Page Content Container */}
          <div style={{ flex: 1, padding: '15px 40px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 1 }}>
            
            {/* Title Section */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 800, color: '#0f2133', margin: 0, letterSpacing: '2px', textTransform: 'uppercase' }}>
                WHY TRAVEL WITH
              </p>
              <h1 style={{ 
                fontSize: '44px', fontWeight: 900, color: '#0a422d', margin: '2px 0 0 0', letterSpacing: '4px',
                display: 'flex', alignItems: 'center', gap: '15px'
              }}>
                <span style={{ fontSize: '22px', color: '#e28325' }}>✦</span>
                MUSAFIRBABA
                <span style={{ fontSize: '22px', color: '#e28325' }}>✦</span>
              </h1>
              <div style={{ width: '50px', height: '2px', backgroundColor: '#e28325', marginTop: '6px' }} />
            </div>

            {/* Interactive Layout Section */}
            <div style={{ height: '420px', position: 'relative', width: '100%' }}>
              {/* Dashed green circle connector path */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                border: '2px dashed #0a422d',
                opacity: 0.12,
                zIndex: 0
              }} />

              {/* Tilted Floating Smartphone Mockup */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%) rotate(-6deg)',
                width: '125px',
                height: '240px',
                borderRadius: '24px',
                border: '5px solid #1e293b',
                backgroundColor: '#ffffff',
                boxShadow: '0 25px 50px -12px rgba(10, 66, 45, 0.25), 0 12px 24px -8px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                zIndex: 5
              }}>
                {/* Smartphone Dynamic Island Notch */}
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  width: '35px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: '#1e293b'
                }} />
                {/* Logo centered on screen */}
                <img 
                  src="/logo.png" 
                  alt="Musafir Baba Logo inside phone" 
                  style={{ width: '90%', height: 'auto', objectFit: 'contain' }}
                />
              </div>

              {/* Badge Cards */}
              {/* 1. TRUSTED BY 16000+ TRAVELLERS (top-left) */}
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '145px',
                zIndex: 10
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  backgroundColor: '#0a422d', border: '3px solid #ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)', marginBottom: '-16px', zIndex: 12
                }}>
                  <Shield size={16} color="#ffffff" />
                </div>
                <div style={{
                  backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '16px',
                  padding: '22px 10px 10px 10px', width: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', textAlign: 'center'
                }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TRUSTED BY</p>
                  <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f2133', margin: '2px 0 0 0', lineHeight: '1.2' }}>16000+ TRAVELLERS</p>
                  <div style={{ width: '18px', height: '2px', backgroundColor: '#e28325', marginTop: '6px' }} />
                </div>
              </div>

              {/* 2. EXPERT GUIDANCE (top-right) */}
              <div style={{
                position: 'absolute',
                right: '20px',
                top: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '145px',
                zIndex: 10
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  backgroundColor: '#0a422d', border: '3px solid #ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)', marginBottom: '-16px', zIndex: 12
                }}>
                  <Compass size={16} color="#ffffff" />
                </div>
                <div style={{
                  backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '16px',
                  padding: '22px 10px 10px 10px', width: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', textAlign: 'center'
                }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>EXPERT</p>
                  <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f2133', margin: '2px 0 0 0', lineHeight: '1.2' }}>GUIDANCE</p>
                  <div style={{ width: '18px', height: '2px', backgroundColor: '#e28325', marginTop: '6px' }} />
                </div>
              </div>

              {/* 3. 24x7 SUPPORT (middle-right) */}
              <div style={{
                position: 'absolute',
                right: '10px',
                top: '180px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '145px',
                zIndex: 10
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  backgroundColor: '#0a422d', border: '3px solid #ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)', marginBottom: '-16px', zIndex: 12
                }}>
                  <Headset size={16} color="#ffffff" />
                </div>
                <div style={{
                  backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '16px',
                  padding: '22px 10px 10px 10px', width: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', textAlign: 'center'
                }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>24x7</p>
                  <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f2133', margin: '2px 0 0 0', lineHeight: '1.2' }}>SUPPORT</p>
                  <div style={{ width: '18px', height: '2px', backgroundColor: '#e28325', marginTop: '6px' }} />
                </div>
              </div>

              {/* 4. WELL PLANNED EXPERIENCES (bottom-middle) */}
              <div style={{
                position: 'absolute',
                left: '50%',
                bottom: '10px',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '155px',
                zIndex: 10
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  backgroundColor: '#0a422d', border: '3px solid #ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)', marginBottom: '-16px', zIndex: 12
                }}>
                  <Calendar size={16} color="#ffffff" />
                </div>
                <div style={{
                  backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '16px',
                  padding: '22px 10px 10px 10px', width: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', textAlign: 'center'
                }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>WELL PLANNED</p>
                  <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f2133', margin: '2px 0 0 0', lineHeight: '1.2' }}>EXPERIENCES</p>
                  <div style={{ width: '18px', height: '2px', backgroundColor: '#e28325', marginTop: '6px' }} />
                </div>
              </div>

              {/* 5. TRUSTED PARTNERS (middle-left) */}
              <div style={{
                position: 'absolute',
                left: '10px',
                top: '180px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '145px',
                zIndex: 10
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  backgroundColor: '#0a422d', border: '3px solid #ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)', marginBottom: '-16px', zIndex: 12
                }}>
                  <Handshake size={16} color="#ffffff" />
                </div>
                <div style={{
                  backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '16px',
                  padding: '22px 10px 10px 10px', width: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', textAlign: 'center'
                }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TRUSTED</p>
                  <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f2133', margin: '2px 0 0 0', lineHeight: '1.2' }}>PARTNERS</p>
                  <div style={{ width: '18px', height: '2px', backgroundColor: '#e28325', marginTop: '6px' }} />
                </div>
              </div>
            </div>

            {/* Bottom Quote Card */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #dce3eb',
              borderRadius: '20px',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Faint watermarked background graphic on the right */}
              <div style={{
                position: 'absolute',
                right: '10px',
                bottom: '-10px',
                width: '100px',
                height: '80px',
                opacity: 0.1,
                backgroundImage: 'url("https://cdn.musafirbaba.com/images/experts_15108104-new_q5uy6p.png")',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right bottom',
                zIndex: 0
              }} />

              {/* Green Circle Mountain Icon */}
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#0a422d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 1
              }}>
                <Mountain size={28} color="#ffffff" />
              </div>

              {/* Divider */}
              <div style={{ width: '1px', height: '45px', backgroundColor: '#e2e8f0', flexShrink: 0, zIndex: 1 }} />

              {/* Quote Text */}
              <p style={{
                flex: 1,
                fontSize: '17px',
                color: '#334155',
                lineHeight: '1.45',
                margin: 0,
                fontWeight: 600,
                textAlign: 'left',
                zIndex: 1
              }}>
                With <span style={{ color: '#0a422d', fontWeight: 800 }}>Musafir Baba</span>, every journey is planned with <span style={{ color: '#e28325', fontWeight: 800 }}>care</span>, <span style={{ color: '#e28325', fontWeight: 800 }}>comfort</span> and <span style={{ color: '#0a422d', fontWeight: 800 }}>commitment</span>.
              </p>
            </div>

          </div>

          {/* Footer Image */}
          <div style={{ width: '100%', height: '72px', flexShrink: 0, zIndex: 1 }}>
            <img 
              src="/Itinerary/footer.png" 
              alt="Footer" 
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            />
          </div>
        </div>

        {/* ========== PAGE 6: PRICING & PAYMENT TERMS ========== */}
        <div 
          style={{ 
            width: `${A4_WIDTH}px`, 
            height: `${A4_HEIGHT}px`, 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#fdfbf7',
            overflow: 'hidden'
          }}
        >
          {/* Header Image with clean website logo overlay */}
          <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img 
              src="/Itinerary/header.png" 
              alt="Header" 
              style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '135px',
              backgroundColor: '#fefefc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px'
            }}>
              <img 
                src="/logo.png" 
                alt="Musafir Baba Logo" 
                style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Page Content Container */}
          <div style={{ flex: 1, padding: '10px 40px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 1 }}>
            
            {/* PRICING SECTION */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Title */}
              <div style={{ textAlign: 'center', position: 'relative' }}>
                <h2 style={{ 
                  fontSize: '32px', fontWeight: 800, color: '#0a422d', letterSpacing: '4px', margin: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px'
                }}>
                  <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                  PRICING
                  <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                </h2>
                <div style={{ width: '40px', height: '2px', backgroundColor: '#e28325', margin: '3px auto 0' }}></div>
              </div>

              {/* Pricing Cards Grid */}
              {(() => {
                const activeBatch = batch && batch.length > 0 ? batch[0] : null;
                const quadPrice = activeBatch?.quad ? `₹${activeBatch.quad.toLocaleString()}/-` : '₹26,999/-';
                const triplePrice = activeBatch?.triple ? `₹${activeBatch.triple.toLocaleString()}/-` : '₹27,999/-';
                const doublePrice = activeBatch?.double ? `₹${activeBatch.double.toLocaleString()}/-` : '₹31,999/-';
                const childPrice = activeBatch?.child ? `₹${activeBatch.child.toLocaleString()}/-` : '₹14,999/-';

                const PricingCard = ({ cardTitle, price, icon }: { cardTitle: string, price: string, icon: React.ReactNode }) => (
                  <div style={{
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    border: '1px solid #dce3eb',
                    borderRadius: '16px',
                    height: '48px',
                    padding: '0 80px 0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
                    overflow: 'hidden'
                  }}>
                    {/* Left Icon badge */}
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      backgroundColor: '#0a422d', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: '12px', flexShrink: 0
                    }}>
                      {icon}
                    </div>

                    {/* Title */}
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f2133', letterSpacing: '0.5px', minWidth: '120px' }}>
                      {cardTitle}
                    </span>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0', margin: '0 20px' }} />

                    {/* Price block */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        PER PERSON
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#0a422d', marginTop: '-2px' }}>
                        {price}
                      </span>
                    </div>

                    {/* Green Right peak */}
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '60px',
                      backgroundColor: '#0a422d',
                      borderTopRightRadius: '15px',
                      borderBottomRightRadius: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: '-8px',
                        width: '16px',
                        height: '100%',
                        backgroundColor: '#ffffff',
                        transform: 'skewX(-15deg)',
                        zIndex: 1
                      }} />
                      <Mountain size={20} color="#ffffff" style={{ opacity: 0.25, zIndex: 2 }} />
                    </div>
                  </div>
                );

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <PricingCard cardTitle="QUAD SHARING" price={quadPrice} icon={<Users size={15} color="#ffffff" />} />
                    <PricingCard cardTitle="TRIPLE SHARING" price={triplePrice} icon={<Users size={15} color="#ffffff" />} />
                    <PricingCard cardTitle="DOUBLE SHARING" price={doublePrice} icon={<Users size={15} color="#ffffff" />} />
                    <PricingCard cardTitle="CHILD" price={childPrice} icon={<User size={15} color="#ffffff" />} />
                  </div>
                );
              })()}

              {/* Passenger note */}
              <div style={{
                backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '12px',
                padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
              }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  backgroundColor: '#0a422d', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Users size={12} color="#ffffff" />
                </div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#334155', margin: 0 }}>
                  <span style={{ color: '#0a422d', fontWeight: 800 }}>Note:</span> Children aged 12 years and above will be considered as individual passengers.
                </p>
              </div>
            </div>

            {/* PAYMENT TERMS SECTION */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, marginTop: '15px', justifyContent: 'flex-start' }}>
              {/* Title */}
              <div style={{ textAlign: 'center', position: 'relative' }}>
                <h2 style={{ 
                  fontSize: '32px', fontWeight: 800, color: '#0a422d', letterSpacing: '4px', margin: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px'
                }}>
                  <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                  PAYMENT TERMS
                  <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                </h2>
                <div style={{ width: '40px', height: '2px', backgroundColor: '#e28325', margin: '3px auto 0' }}></div>
              </div>

              {/* Terms List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {[
                  "To confirm a seat in a fixed group departure, an advance booking amount of ₹ 1,999 per person must be paid at the time of booking.",
                  "Seats are confirmed only after receipt of the advance amount and are allotted on a first-come, first-served basis.",
                  "The balance tour amount must be paid at least 15 days before the departure date.",
                  "Failure to pay the balance amount within the specified timeline may result in automatic cancellation of the booking, and the advance amount shall be forfeited.",
                  "All payments must be made in the name of MusafirBaba / Musafirbaba Travels only. The company will not be responsible for payments made to any unauthorized individual or third-party account.",
                  "Prices mentioned are calculated based on current costs and are subject to change until the full payment is received.",
                  "Payment once made shall be governed by the Cancellation & Refund Policy applicable to the selected package.",
                  "By making the payment, the customer agrees to the Payment Terms, Cancellation Policy, and Terms & Conditions of the tour."
                ].map((term, index) => (
                  <div key={index} style={{
                    display: 'flex', flexDirection: 'column', gap: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      {/* Number badge */}
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        backgroundColor: '#0a422d', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ffffff', fontSize: '10px', fontWeight: 800, flexShrink: 0, marginTop: '2px'
                      }}>
                        {index + 1}
                      </div>
                      {/* Text */}
                      <p style={{ flex: 1, fontSize: '11px', fontWeight: 600, color: '#334155', margin: 0, lineHeight: '1.45', textAlign: 'left' }}>
                        {term}
                      </p>
                    </div>
                    {index < 7 && (
                      <div style={{ borderBottom: '1px dotted #e2e8f0', width: '100%', marginTop: '2px' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Footer Image */}
          <div style={{ width: '100%', height: '72px', flexShrink: 0, zIndex: 1 }}>
            <img 
              src="/Itinerary/footer.png" 
              alt="Footer" 
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            />
          </div>
        </div>

        {/* ========== PAGE 7: GROUP DEPARTURE SCHEDULE ========== */}
        <div 
          style={{ 
            width: `${A4_WIDTH}px`, 
            height: `${A4_HEIGHT}px`, 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#fdfbf7',
            overflow: 'hidden'
          }}
        >
          {/* Header Image with clean website logo overlay */}
          <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img 
              src="/Itinerary/header.png" 
              alt="Header" 
              style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '135px',
              backgroundColor: '#fefefc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px'
            }}>
              <img 
                src="/logo.png" 
                alt="Musafir Baba Logo" 
                style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Page Content Container */}
          <div style={{ flex: 1, padding: '10px 40px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 1 }}>
            
            {/* 1. Title Section */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h1 style={{ 
                fontSize: '32px', fontWeight: 900, color: '#0a422d', margin: 0, letterSpacing: '4px',
                display: 'flex', alignItems: 'center', gap: '15px'
              }}>
                <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                GROUP DEPARTURE SCHEDULE 2026
                <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
              </h1>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', margin: '2px 0 0 0', fontStyle: 'italic' }}>
                Plan Your Journey. Choose Your Departure.
              </p>
            </div>

            {/* 2. Metrics Bar */}
            {(() => {
              const monthConfigs = [
                { name: "JANUARY 2026", active: false },
                { name: "FEBRUARY 2026", active: false },
                { name: "MARCH 2026", active: false },
                { name: "APRIL 2026", active: true, departures: [{ dep: "17 Apr 2026", ret: "27 Apr 2026" }], status: "Available" },
                { name: "MAY 2026", active: true, departures: [{ dep: "01 May 2026", ret: "11 May 2026" }], status: "Available" },
                { name: "JUNE 2026", active: true, departures: [{ dep: "05 Jun 2026", ret: "15 Jun 2026" }], status: "Available" },
                { name: "JULY 2026", active: true, departures: [
                  { dep: "03 Jul 2026", ret: "13 Jul 2026" },
                  { dep: "17 Jul 2026", ret: "27 Jul 2026" },
                  { dep: "31 Jul 2026", ret: "10 Aug 2026" }
                ], status: "Limited" },
                { name: "AUGUST 2026", active: true, departures: [
                  { dep: "07 Aug 2026", ret: "17 Aug 2026" },
                  { dep: "21 Aug 2026", ret: "31 Aug 2026" }
                ], status: "Limited" },
                { name: "SEPTEMBER 2026", active: true, departures: [
                  { dep: "04 Sep 2026", ret: "14 Sep 2026" },
                  { dep: "18 Sep 2026", ret: "28 Sep 2026" }
                ], status: "Available" },
                { name: "OCTOBER 2026", active: true, departures: [
                  { dep: "02 Oct 2026", ret: "12 Oct 2026" },
                  { dep: "16 Oct 2026", ret: "26 Oct 2026" },
                  { dep: "30 Oct 2026", ret: "09 Nov 2026" }
                ], status: "Available" },
                { name: "NOVEMBER 2026", active: true, departures: [
                  { dep: "06 Nov 2026", ret: "16 Nov 2026" },
                  { dep: "20 Nov 2026", ret: "30 Nov 2026" }
                ], status: "Available" },
                { name: "DECEMBER 2026", active: false }
              ];

              const activeBatchList = batch && batch.length > 0 ? batch : [];
              const hasRealBatches = activeBatchList.some(b => b.startDate);

              const monthsToRender = monthConfigs.map((mConfig, index) => {
                if (!hasRealBatches) return mConfig;
                const monthBatches = activeBatchList.filter(b => {
                  if (!b.startDate) return false;
                  const d = new Date(b.startDate);
                  return d.getMonth() === index;
                });
                if (monthBatches.length === 0) return { name: mConfig.name, active: false };

                const departures = monthBatches.map(b => {
                  const depDate = new Date(b.startDate);
                  const retDate = b.endDate ? new Date(b.endDate) : new Date(depDate.getTime() + 10 * 24 * 60 * 60 * 1000);
                  const fmt = (d: Date) => {
                    const day = String(d.getDate()).padStart(2, '0');
                    const mStr = d.toLocaleString('en-US', { month: 'short' });
                    const yStr = d.getFullYear();
                    return `${day} ${mStr} ${yStr}`;
                  };
                  return { dep: fmt(depDate), ret: fmt(retDate) };
                });

                return { name: mConfig.name, active: true, departures, status: "Available" };
              });

              const totalDeparturesCount = monthsToRender.reduce((acc, m) => acc + (m.departures?.length || 0), 0);
              const activeMonthsCount = monthsToRender.filter(m => m.active).length;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Summary Bar */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                    backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '16px',
                    padding: '10px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                  }}>
                    {/* Item 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0a422d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={14} color="#ffffff" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Departures</span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f2133' }}>{totalDeparturesCount || 18}</span>
                      </div>
                    </div>
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }} />
                    {/* Item 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0a422d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={14} color="#ffffff" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Months Active</span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f2133' }}>{activeMonthsCount || 8}</span>
                      </div>
                    </div>
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }} />
                    {/* Item 3 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0a422d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Mountain size={14} color="#ffffff" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Best Season</span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f2133' }}>May - June</span>
                      </div>
                    </div>
                  </div>

                  {/* Calendar Grid (4x3) */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '6px'
                  }}>
                    {monthsToRender.map((month, idx) => (
                      <div key={idx} style={{
                        backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '12px',
                        height: '92px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                      }}>
                        {/* Month Header */}
                        <div style={{
                          backgroundColor: month.active ? '#0a422d' : '#78716c',
                          padding: '4px 0', textAlign: 'center', display: 'flex', justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
                            {month.name}
                          </span>
                        </div>

                        {/* Month Body */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px' }}>
                          {!month.active ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '100%' }}>
                              <Lock size={12} color="#a8a29e" />
                              <span style={{ fontSize: '9px', color: '#78716c', fontWeight: 700 }}>No Departure</span>
                              <span style={{ fontSize: '8px', color: '#a8a29e', fontWeight: 600 }}>Season Closed</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                              {/* Date values */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1, justifyContent: 'center' }}>
                                {month.departures?.slice(0, 2).map((dep, dIdx) => (
                                  <div key={dIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: dIdx === 0 && month.departures!.length > 1 ? '1px dotted #f1f5f9' : 'none', paddingBottom: '2px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                                      <span style={{ fontSize: '7px', fontWeight: 800, color: '#64748b' }}>DEP</span>
                                      <span style={{ fontSize: '8px', fontWeight: 800, color: '#0f2133' }}>{dep.dep.split(' ').slice(0, 2).join(' ')}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                                      <span style={{ fontSize: '7px', fontWeight: 800, color: '#64748b' }}>RET</span>
                                      <span style={{ fontSize: '8px', fontWeight: 800, color: '#0f2133' }}>{dep.ret.split(' ').slice(0, 2).join(' ')}</span>
                                    </div>
                                  </div>
                                ))}
                                {month.departures && month.departures.length > 2 && (
                                  <span style={{ fontSize: '7px', color: '#64748b', fontWeight: 700 }}>+ {month.departures.length - 2} more batches</span>
                                )}
                              </div>

                              {/* Status Badge */}
                              <div style={{
                                borderTop: '1px solid #f1f5f9', paddingTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                              }}>
                                {month.status === "Available" ? (
                                  <>
                                    <Check size={9} color="#16a34a" style={{ strokeWidth: 3 }} />
                                    <span style={{ fontSize: '8px', fontWeight: 800, color: '#16a34a' }}>Available</span>
                                  </>
                                ) : (
                                  <>
                                    <Hourglass size={9} color="#ea580c" />
                                    <span style={{ fontSize: '8px', fontWeight: 800, color: '#ea580c' }}>Limited Seats</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 3. Bottom Row: Best Season & Important Warning Advisory */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
              {/* Best time to travel card */}
              <div style={{
                width: '320px', backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '16px',
                padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0a422d', letterSpacing: '0.5px', textTransform: 'uppercase', textAlign: 'left' }}>
                  🍃 BEST TIME TO TRAVEL 🍃
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {/* Card 1 */}
                  <div style={{
                    flex: 1, borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ height: '35px', backgroundColor: '#0a422d', backgroundImage: 'linear-gradient(135deg, #0a422d 0%, #166534 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mountain size={18} color="#ffffff" style={{ opacity: 0.8 }} />
                    </div>
                    <div style={{ padding: '4px', textAlign: 'center', backgroundColor: '#ffffff' }}>
                      <p style={{ fontSize: '9px', fontWeight: 800, color: '#0f2133', margin: 0 }}>May - June</p>
                      <p style={{ fontSize: '7px', color: '#64748b', margin: 0, fontWeight: 700 }}>Pleasant Weather</p>
                    </div>
                  </div>
                  {/* Card 2 */}
                  <div style={{
                    flex: 1, borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ height: '35px', backgroundColor: '#0a422d', backgroundImage: 'linear-gradient(135deg, #0a422d 0%, #166534 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trees size={18} color="#ffffff" style={{ opacity: 0.8 }} />
                    </div>
                    <div style={{ padding: '4px', textAlign: 'center', backgroundColor: '#ffffff' }}>
                      <p style={{ fontSize: '9px', fontWeight: 800, color: '#0f2133', margin: 0 }}>Sept - Nov</p>
                      <p style={{ fontSize: '7px', color: '#64748b', margin: 0, fontWeight: 700 }}>Clear Mountain Views</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advisory warning card */}
              <div style={{
                flex: 1, backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '16px',
                padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px',
                justifyContent: 'center', boxShadow: '0 2px 8px rgba(245,158,11,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={15} color="#d97706" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', letterSpacing: '0.5px' }}>
                    IMPORTANT TRAVEL ADVISORY
                  </span>
                </div>
                <p style={{ fontSize: '10.5px', color: '#78350f', margin: 0, lineHeight: '1.45', fontWeight: 600, textAlign: 'left' }}>
                  This yatra involves high-altitude travel and trekking; participants should be medically fit and prepared for changing terrain and weather conditions.
                </p>
              </div>
            </div>

            {/* 4. Underneath CTA Link */}
            <div style={{
              borderTop: '1px dashed #e2e8f0', paddingTop: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: '5px'
            }}>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '13px', fontWeight: 800, color: '#0a422d', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🍃 READY TO JOIN THIS JOURNEY? 🍃
                </p>
                <p style={{ fontSize: '9px', color: '#64748b', margin: 0, fontWeight: 700 }}>
                  Check Live Seat Availability
                </p>
              </div>

              {/* Green oval CTA Button */}
              <div style={{
                backgroundColor: '#0a422d', borderRadius: '20px', padding: '5px 14px',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 4px 10px rgba(10,66,45,0.12)'
              }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
                  CHECK AVAILABILITY
                </span>
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '8px', color: '#0a422d', fontWeight: 900 }}>➔</span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Image */}
          <div style={{ width: '100%', height: '72px', flexShrink: 0, zIndex: 1 }}>
            <img 
              src="/Itinerary/footer.png" 
              alt="Footer" 
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            />
          </div>
        </div>

        {/* ========== PAGE 8: BOOKING PROCESS & PAYMENT ========== */}
        <div 
          style={{ 
            width: `${A4_WIDTH}px`, 
            height: `${A4_HEIGHT}px`, 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#fdfbf7',
            overflow: 'hidden'
          }}
        >
          {/* Header Image with clean website logo overlay */}
          <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img 
              src="/Itinerary/header.png" 
              alt="Header" 
              style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '135px',
              backgroundColor: '#fefefc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px'
            }}>
              <img 
                src="/logo.png" 
                alt="Musafir Baba Logo" 
                style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Page Content Container */}
          <div style={{ flex: 1, padding: '10px 40px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '14px', zIndex: 1 }}>
            
            {/* 1. Header Section */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ 
                fontSize: '32px', fontWeight: 900, color: '#0a422d', margin: 0, letterSpacing: '4px',
                display: 'flex', alignItems: 'center', gap: '15px'
              }}>
                <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                BOOKING PROCESS
                <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
              </h1>
              
              {/* Payment sub-banner */}
              <div style={{
                backgroundColor: '#0a422d', borderRadius: '24px', padding: '6px 28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px',
                boxShadow: '0 2px 6px rgba(10,66,45,0.1)'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#ffffff', letterSpacing: '2px' }}>
                  TO COMPLETE PAYMENT
                </span>
              </div>
            </div>

            {/* 2. QR & Bank details container */}
            <div style={{
              backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '20px',
              padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '15px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.01)', position: 'relative'
            }}>
              {/* QR Code section */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', height: '170px' }}>
                <div style={{
                  position: 'relative', width: '155px', height: '155px',
                  border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff'
                }}>
                  {/* Green focus corners */}
                  <div style={{ position: 'absolute', top: '-6px', left: '-6px', width: '12px', height: '12px', borderTop: '3px solid #0a422d', borderLeft: '3px solid #0a422d' }} />
                  <div style={{ position: 'absolute', top: '-6px', right: '-6px', width: '12px', height: '12px', borderTop: '3px solid #0a422d', borderRight: '3px solid #0a422d' }} />
                  <div style={{ position: 'absolute', bottom: '-6px', left: '-6px', width: '12px', height: '12px', borderBottom: '3px solid #0a422d', borderLeft: '3px solid #0a422d' }} />
                  <div style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '12px', height: '12px', borderBottom: '3px solid #0a422d', borderRight: '3px solid #0a422d' }} />

                  {/* SVG QR code */}
                  <svg width="135" height="135" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="45" height="45" fill="#000000" />
                    <rect x="5" y="5" width="35" height="35" fill="#ffffff" />
                    <rect x="12" y="12" width="21" height="21" fill="#000000" />

                    <rect x="135" y="0" width="45" height="45" fill="#000000" />
                    <rect x="140" y="5" width="35" height="35" fill="#ffffff" />
                    <rect x="147" y="12" width="21" height="21" fill="#000000" />

                    <rect x="0" y="135" width="45" height="45" fill="#000000" />
                    <rect x="5" y="140" width="35" height="35" fill="#ffffff" />
                    <rect x="12" y="147" width="21" height="21" fill="#000000" />

                    {Array.from({ length: 14 }).map((_, r) => {
                      const row = r * 10 + 20;
                      return Array.from({ length: 14 }).map((_, c) => {
                        const col = c * 10 + 20;
                        if ((row < 60 && col < 60) || (row < 60 && col > 120) || (row > 120 && col < 60)) {
                          return null;
                        }
                        const isFilled = ((row * 7 + col * 13) % 5 === 0) || ((row * 19 + col * 3) % 7 === 0);
                        if (!isFilled) return null;
                        return (
                          <rect 
                            key={`${row}-${col}`} 
                            x={col - 10} 
                            y={row - 10} 
                            width="8" 
                            height="8" 
                            fill="#000000" 
                          />
                        );
                      });
                    })}
                  </svg>
                </div>
              </div>

              {/* Dashed separator with Bank icon */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', height: '24px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, borderBottom: '1px dashed #cbd5e1', zIndex: 1 }} />
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0a422d',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
                }}>
                  <Building size={13} color="#ffffff" />
                </div>
              </div>

              {/* Account fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', padding: '0 10px' }}>
                {[
                  { label: "Account Name", value: "Musafirbaba Travels Private Limited", icon: <User size={13} color="#ffffff" /> },
                  { label: "Account No.", value: "50209114000162", icon: <CreditCard size={13} color="#ffffff" /> },
                  { label: "IFSC", value: "HDFC0000438", icon: <Building size={13} color="#ffffff" /> },
                  { label: "Account Type", value: "Current", icon: <Check size={13} color="#ffffff" /> }
                ].map((field, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#0a422d',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {field.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                        {field.label}
                      </span>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f2133' }}>
                        {field.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Steps Row (1, 2, 3) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', padding: '10px 0' }}>
              {[
                {
                  step: "1",
                  title: "Open your payment App and scan the QR Code",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a422d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <path d="M12 18h.01" />
                      <rect x="8" y="5" width="8" height="8" />
                    </svg>
                  )
                },
                {
                  step: "2",
                  title: "Verify the payment information details",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a422d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  )
                },
                {
                  step: "3",
                  title: "Confirm and securely complete the transaction",
                  icon: <Shield size={22} color="#0a422d" />
                }
              ].map((item, index) => (
                <React.Fragment key={index}>
                  <div style={{
                    width: '185px', height: '110px', backgroundColor: '#ffffff', border: '1px solid #dce3eb',
                    borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'space-between', position: 'relative',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                  }}>
                    {/* Number Badge */}
                    <div style={{
                      position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                      width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#0a422d',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#ffffff', fontSize: '10px', fontWeight: 900
                    }}>
                      {item.step}
                    </div>

                    {/* Icon */}
                    <div style={{ marginTop: '4px' }}>
                      {item.icon}
                    </div>

                    {/* Text */}
                    <p style={{ fontSize: '9px', fontWeight: 700, color: '#334155', margin: 0, lineHeight: '1.4', textAlign: 'center' }}>
                      {item.title}
                    </p>
                  </div>
                  {index < 2 && (
                    <span style={{ fontSize: '14px', color: '#cbd5e1', fontWeight: 800 }}>➔</span>
                  )}
                </React.Fragment>
              ))}
            </div>

          </div>

          {/* Footer Image */}
          <div style={{ width: '100%', height: '72px', flexShrink: 0, zIndex: 1 }}>
            <img 
              src="/Itinerary/footer.png" 
              alt="Footer" 
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            />
          </div>
        </div>

        {/* ========== PAGE 9: TERMS & CONDITIONS ========== */}
        <div 
          style={{ 
            width: `${A4_WIDTH}px`, 
            height: `${A4_HEIGHT}px`, 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#fdfbf7',
            overflow: 'hidden'
          }}
        >
          {/* Header Image with clean website logo overlay */}
          <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img 
              src="/Itinerary/header.png" 
              alt="Header" 
              style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '135px',
              backgroundColor: '#fefefc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px'
            }}>
              <img 
                src="/logo.png" 
                alt="Musafir Baba Logo" 
                style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Page Content Container */}
          <div style={{ flex: 1, padding: '10px 40px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '12px', zIndex: 1 }}>
            
            {/* 1. Header Section */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h1 style={{ 
                fontSize: '32px', fontWeight: 900, color: '#0a422d', margin: 0, letterSpacing: '4px',
                display: 'flex', alignItems: 'center', gap: '15px'
              }}>
                <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                TERMS & CONDITIONS
                <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <div style={{ width: '30px', height: '1px', backgroundColor: '#0a422d' }} />
                <span style={{ fontSize: '8px', color: '#0a422d' }}>◆</span>
                <div style={{ width: '30px', height: '1px', backgroundColor: '#0a422d' }} />
              </div>
            </div>

            {/* 2. Terms List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4.5px', margin: '2px 0' }}>
              {[
                { text: "All bookings are subject to availability at the time of confirmation. Seats are confirmed only after receipt of the required booking amount.", icon: <Calendar size={12} /> },
                { text: "This is a fixed group departure; the itinerary, travel dates, hotels, and transport are pre-planned and cannot be changed for individual participants.", icon: <Users size={12} /> },
                { text: "The company reserves the right to modify the itinerary, sequence of sightseeing, or accommodation due to operational reasons, weather conditions, road conditions, or any unforeseen circumstances, without compromising the overall travel experience.", icon: <Compass size={12} /> },
                { text: "Hotel check-in and check-out timings will be as per hotel policy. Early check-in or late check-out is subject to availability and may incur additional charges.", icon: <Building size={12} /> },
                { text: "Rooms are provided on a shared basis as per the selected occupancy (quad/triple/double). Single occupancy is subject to availability and extra charges.", icon: <Bed size={12} /> },
                { text: "The company is not responsible for delays, changes, or cancellations caused by natural calamities, weather conditions, landslides, road blockages, political disturbances, or any other force majeure events.", icon: <AlertTriangle size={12} /> },
                { text: "Any increase in government taxes, permit fees, toll charges, parking fees, or local entry fees applicable during the tour must be paid by the customer directly.", icon: <Percent size={12} /> },
                { text: "Personal expenses such as laundry, tips, phone calls, medical expenses, additional meals, or any services not mentioned in inclusions are not covered in the package cost.", icon: <CreditCard size={12} /> },
                { text: "For trekking or high-altitude destinations, participants must assess their own physical fitness. The company will not be responsible for health-related issues arising during the tour.", icon: <Mountain size={12} /> },
                { text: "Any damage caused to hotel property, vehicles, or public property during the tour shall be borne by the concerned participant.", icon: <Shield size={12} /> },
                { text: "The company reserves the right to cancel or reschedule a group departure if the minimum required number of participants is not met. In such cases, alternate options or a full refund will be provided.", icon: <Users size={12} /> },
                { text: "By booking the tour, the customer confirms that they have read, understood, and agreed to all the terms and conditions mentioned above.", icon: <Handshake size={12} /> }
              ].map((item, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', gap: '10px', alignItems: 'flex-start', 
                  borderBottom: idx < 11 ? '1px solid #f1f5f9' : 'none', 
                  paddingBottom: '3.5px', paddingTop: '1.5px' 
                }}>
                  {/* Number Badge */}
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#0a422d',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    color: '#ffffff', fontSize: '8.5px', fontWeight: 900
                  }}>
                    {idx + 1}
                  </div>
                  {/* Icon */}
                  <div style={{ flexShrink: 0, marginTop: '2px', color: '#0a422d' }}>
                    {item.icon}
                  </div>
                  {/* Text */}
                  <p style={{ flex: 1, fontSize: '9px', fontWeight: 600, color: '#334155', margin: 0, lineHeight: '1.3', textAlign: 'left' }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

          </div>

          {/* Footer Image */}
          <div style={{ width: '100%', height: '72px', flexShrink: 0, zIndex: 1 }}>
            <img 
              src="/Itinerary/footer.png" 
              alt="Footer" 
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            />
          </div>
        </div>

        {/* ========== PAGE 10: CANCELLATION & REFUND POLICY ========== */}
        <div 
          style={{ 
            width: `${A4_WIDTH}px`, 
            height: `${A4_HEIGHT}px`, 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#fdfbf7',
            overflow: 'hidden'
          }}
        >
          {/* Header Image with clean website logo overlay */}
          <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img 
              src="/Itinerary/header.png" 
              alt="Header" 
              style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '135px',
              backgroundColor: '#fefefc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px'
            }}>
              <img 
                src="/logo.png" 
                alt="Musafir Baba Logo" 
                style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Page Content Container */}
          <div style={{ flex: 1, padding: '10px 40px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '12px', zIndex: 1 }}>
            
            {/* 1. Header Section */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h1 style={{ 
                fontSize: '32px', fontWeight: 900, color: '#0a422d', margin: 0, letterSpacing: '3px',
                display: 'flex', alignItems: 'center', gap: '15px'
              }}>
                <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                CANCELLATION & REFUND POLICY
                <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <div style={{ width: '30px', height: '1px', backgroundColor: '#0a422d' }} />
                <span style={{ fontSize: '8px', color: '#0a422d' }}>◆</span>
                <div style={{ width: '30px', height: '1px', backgroundColor: '#0a422d' }} />
              </div>
            </div>

            {/* 2. Customer Cancellation Card */}
            <div style={{
              backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '16px',
              padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
            }}>
              {/* Card Header */}
              <div style={{
                backgroundColor: '#0a422d', borderRadius: '20px', padding: '5px 14px',
                display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content'
              }}>
                <User size={12} color="#ffffff" />
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff', letterSpacing: '1px' }}>
                  CANCELLATION BY CUSTOMER:
                </span>
              </div>

              {/* Cancellation options grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { badge: "30+", sub: "DAYS", text: "₹1,999 per person (booking amount) will be deducted. Balance amount will be refunded." },
                  { badge: "15-30", sub: "DAYS", text: "50% of the total tour cost will be deducted." },
                  { badge: "7-14", sub: "DAYS", text: "75% of the total tour cost will be deducted." },
                  { badge: "<7", sub: "NO SHOW", text: "100% of the total tour cost will be deducted. No refund will be applicable." }
                ].map((option, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', alignItems: 'center', gap: '16px', 
                    borderBottom: idx < 3 ? '1px dotted #f1f5f9' : 'none', paddingBottom: '4px' 
                  }}>
                    {/* Badge */}
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#0a422d',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      color: '#ffffff', border: '2px solid #ffffff', boxShadow: '0 2px 6px rgba(10,66,45,0.12)',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 900, lineHeight: '1.1' }}>{option.badge}</span>
                      {option.sub && <span style={{ fontSize: '6px', fontWeight: 800, opacity: 0.9 }}>{option.sub}</span>}
                    </div>
                    {/* Details */}
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0f2133', display: 'block' }}>
                        {idx === 0 && "More than 30 days before departure:"}
                        {idx === 1 && "15–30 days before departure:"}
                        {idx === 2 && "7–14 days before departure:"}
                        {idx === 3 && "Less than 7 days before departure or No-Show:"}
                      </span>
                      <span style={{ fontSize: '10px', color: '#475569', fontWeight: 600 }}>
                        • {option.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Company Cancellation Card */}
            <div style={{
              backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '16px',
              padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
            }}>
              {/* Card Header */}
              <div style={{
                backgroundColor: '#0a422d', borderRadius: '20px', padding: '5px 14px',
                display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content'
              }}>
                <Building size={12} color="#ffffff" />
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff', letterSpacing: '1px' }}>
                  CANCELLATION BY COMPANY:
                </span>
              </div>

              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '9.5px', color: '#334155', fontWeight: 700, margin: '0 0 6px 0' }}>
                  • If the tour is cancelled by MusafirBaba due to operational reasons or insufficient group size, the customer will be offered:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px' }}>
                  {[
                    "An alternate departure date OR",
                    "A full refund of the amount paid (excluding any non-refundable third-party charges, if applicable)."
                  ].map((text, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#16a34a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <Check size={8} color="#ffffff" style={{ strokeWidth: 3 }} />
                      </div>
                      <span style={{ fontSize: '9.5px', color: '#1e293b', fontWeight: 700 }}>
                        {text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Important Notes Card */}
            <div style={{
              backgroundColor: '#ffffff', border: '1px solid #dce3eb', borderRadius: '16px',
              padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
            }}>
              {/* Card Header */}
              <div style={{
                backgroundColor: '#0a422d', borderRadius: '20px', padding: '5px 14px',
                display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content'
              }}>
                <Check size={12} color="#ffffff" style={{ strokeWidth: 3 }} />
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff', letterSpacing: '1px' }}>
                  IMPORTANT NOTES:
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                {[
                  "Refunds (if applicable) will be processed within 10–15 working days after confirmation of cancellation.",
                  "No refund will be provided for any unused services, early departure, or missed sightseeing during the tour.",
                  "Advance booking amount is non-refundable once the booking is confirmed.",
                  "Cancellation requests will be accepted only in written form via email or WhatsApp."
                ].map((note, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#e28325',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px'
                    }}>
                      <Check size={8} color="#ffffff" style={{ strokeWidth: 3 }} />
                    </div>
                    <span style={{ fontSize: '9.5px', color: '#334155', fontWeight: 700, flex: 1 }}>
                      {note}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Footer Image */}
          <div style={{ width: '100%', height: '72px', flexShrink: 0, zIndex: 1 }}>
            <img 
              src="/Itinerary/footer.png" 
              alt="Footer" 
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            />
          </div>
        </div>

        {/* ========== PAGE 11: REGISTRATIONS & CERTIFICATIONS ========== */}
        <div 
          style={{ 
            width: `${A4_WIDTH}px`, 
            height: `${A4_HEIGHT}px`, 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#fdfbf7',
            overflow: 'hidden'
          }}
        >
          {/* Header Image with clean website logo overlay */}
          <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img 
              src="/Itinerary/header.png" 
              alt="Header" 
              style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '135px',
              backgroundColor: '#fefefc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px'
            }}>
              <img 
                src="/logo.png" 
                alt="Musafir Baba Logo" 
                style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Page Content Container */}
          <div style={{ flex: 1, padding: '10px 40px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '12px', zIndex: 1 }}>
            
            {/* 1. Header Section */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h1 style={{ 
                fontSize: '30px', fontWeight: 900, color: '#0a422d', margin: 0, letterSpacing: '3px',
                display: 'flex', alignItems: 'center', gap: '15px'
              }}>
                <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                REGISTRATIONS & CERTIFICATIONS
                <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <div style={{ width: '30px', height: '1px', backgroundColor: '#0a422d' }} />
                <span style={{ fontSize: '8px', color: '#0a422d' }}>◆</span>
                <div style={{ width: '30px', height: '1px', backgroundColor: '#0a422d' }} />
              </div>
            </div>

            {/* 2. Certificates Image Container */}
            <div style={{ 
              width: '100%',
              height: '710px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #dce3eb',
              borderRadius: '16px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
              overflow: 'hidden'
            }}>
              <img 
                src="/Itinerary/musafirbabacertificates.png" 
                alt="Registrations & Certifications" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  borderRadius: '10px'
                }}
              />
            </div>

            {/* 3. Bottom Website Banner */}
            <div style={{
              backgroundColor: '#0a422d',
              borderRadius: '12px',
              padding: '6px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'auto',
              marginBottom: '10px',
              boxShadow: '0 2px 8px rgba(10,66,45,0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px' }}>🌐</span>
                <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
                  www.musafirbaba.com
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px' }}>✉️</span>
                <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
                  care@musafirbaba.com
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px' }}>📞</span>
                <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
                  +91 928 960 2447
                </span>
              </div>
            </div>

          </div>

          {/* Footer Image */}
          <div style={{ width: '100%', height: '72px', flexShrink: 0, zIndex: 1 }}>
            <img 
              src="/Itinerary/footer.png" 
              alt="Footer" 
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            />
          </div>
        </div>

        {/* ========== PAGE 12: TESTIMONIALS & REVIEWS ========== */}
        <div 
          style={{ 
            width: `${A4_WIDTH}px`, 
            height: `${A4_HEIGHT}px`, 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#fdfbf7',
            overflow: 'hidden'
          }}
        >
          {/* Header Image with clean website logo overlay */}
          <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img 
              src="/Itinerary/header.png" 
              alt="Header" 
              style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '135px',
              backgroundColor: '#fefefc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px'
            }}>
              <img 
                src="/logo.png" 
                alt="Musafir Baba Logo" 
                style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Page Content Container */}
          <div style={{ flex: 1, padding: '10px 40px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '12px', zIndex: 1 }}>
            
            {/* 1. Header Section */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h1 style={{ 
                fontSize: '30px', fontWeight: 900, color: '#0a422d', margin: 0, letterSpacing: '3px',
                display: 'flex', alignItems: 'center', gap: '15px'
              }}>
                <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
                CUSTOMER REVIEWS
                <span style={{ fontSize: '18px', color: '#e28325' }}>✦</span>
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <div style={{ width: '30px', height: '1px', backgroundColor: '#0a422d' }} />
                <span style={{ fontSize: '8px', color: '#0a422d' }}>◆</span>
                <div style={{ width: '30px', height: '1px', backgroundColor: '#0a422d' }} />
              </div>
            </div>

            {/* 2. Testimonials Image Container */}
            <div style={{ 
              width: '100%',
              height: '710px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #dce3eb',
              borderRadius: '16px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
              overflow: 'hidden'
            }}>
              <img 
                src="/Itinerary/testimonials.png" 
                alt="Customer Reviews" 
                style={{ 
                  width: '100%', 
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '10px'
                }}
              />
            </div>

          </div>

          {/* Footer Image */}
          <div style={{ width: '100%', height: '72px', flexShrink: 0, zIndex: 1 }}>
            <img 
              src="/Itinerary/footer.png" 
              alt="Footer" 
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            />
          </div>
        </div>

        {/* ========== PAGE 13: CONTACT US ========== */}
        <div 
          style={{ 
            width: `${A4_WIDTH}px`, 
            height: `${A4_HEIGHT}px`, 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#fdfbf7',
            overflow: 'hidden'
          }}
        >
          {/* Header Image with clean website logo overlay */}
          <div style={{ width: '100%', height: '175px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img 
              src="/Itinerary/header.png" 
              alt="Header" 
              style={{ width: '100%', height: '221px', objectFit: 'fill', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '135px',
              backgroundColor: '#fefefc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px'
            }}>
              <img 
                src="/logo.png" 
                alt="Musafir Baba Logo" 
                style={{ width: '220px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Page Content Container */}
          <div style={{ flex: 1, padding: '15px 40px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '15px', zIndex: 1, position: 'relative' }}>
            
            {/* 1. Page Title Heading with Leaf branches */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Left Leaf branch */}
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ marginRight: '10px' }}>
                  <path d="M3 21C3 21 9 17 13 12C15 9.5 18 5.5 22 2" stroke="#0a422d" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M12 12C9.5 10 7.5 11 5.5 13C6.5 11 8.5 9.5 11.5 9.5" fill="#0a422d" />
                  <path d="M17 7C14.5 5 12.5 6 10.5 8C11.5 6.5 13.5 5 16.5 5" fill="#0a422d" />
                  <path d="M7.5 16.5C5.5 14.5 4.5 15.5 2.5 17.5C3.5 16 5.5 14.5 8.5 14.5" fill="#0a422d" />
                </svg>
                
                <h1 style={{ 
                  fontSize: '36px', fontWeight: 900, color: '#0a422d', margin: 0, letterSpacing: '4px',
                  fontFamily: 'sans-serif'
                }}>
                  CONTACT US
                </h1>
                
                {/* Right Leaf branch */}
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '10px', transform: 'scaleX(-1)' }}>
                  <path d="M3 21C3 21 9 17 13 12C15 9.5 18 5.5 22 2" stroke="#0a422d" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M12 12C9.5 10 7.5 11 5.5 13C6.5 11 8.5 9.5 11.5 9.5" fill="#0a422d" />
                  <path d="M17 7C14.5 5 12.5 6 10.5 8C11.5 6.5 13.5 5 16.5 5" fill="#0a422d" />
                  <path d="M7.5 16.5C5.5 14.5 4.5 15.5 2.5 17.5C3.5 16 5.5 14.5 8.5 14.5" fill="#0a422d" />
                </svg>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{ width: '30px', height: '1.5px', backgroundColor: '#0a422d' }} />
                <span style={{ fontSize: '8px', color: '#0a422d' }}>◆</span>
                <div style={{ width: '30px', height: '1.5px', backgroundColor: '#0a422d' }} />
              </div>
            </div>

            {/* 2. Contact Card Panel with overlapping headset icon */}
            <div style={{ position: 'relative', width: '460px', margin: '40px auto 0' }}>
              
              {/* Overlapping top headset badge */}
              <div style={{
                position: 'absolute',
                top: '-36px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '2px solid #0a422d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                boxShadow: '0 4px 10px rgba(0,0,0,0.04)'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#e6f2ec',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0a422d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
                  </svg>
                </div>
              </div>

              {/* Information container panel */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '2px solid #0a422d',
                borderRadius: '24px',
                padding: '45px 30px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 8px 20px rgba(10,66,45,0.05)',
                zIndex: 1
              }}>
                {/* Row 1: Phone */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#e6f2ec',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a422d">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827', fontFamily: 'sans-serif' }}>+91 928 960 2447,</span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827', fontFamily: 'sans-serif', marginTop: '1px' }}>+91 921 708 2447</span>
                  </div>
                </div>
                <div style={{ borderTop: '1px dashed #cbd5e1', width: '100%' }} />

                {/* Row 2: Email */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#e6f2ec',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a422d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827', fontFamily: 'sans-serif' }}>care@musafirbaba.com</span>
                </div>
                <div style={{ borderTop: '1px dashed #cbd5e1', width: '100%' }} />

                {/* Row 3: Instagram */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#e6f2ec',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a422d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827', fontFamily: 'sans-serif' }}>hello_musafirbaba</span>
                </div>
                <div style={{ borderTop: '1px dashed #cbd5e1', width: '100%' }} />

                {/* Row 4: Website */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#e6f2ec',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a422d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827', fontFamily: 'sans-serif' }}>www.musafirbaba.com</span>
                </div>
                <div style={{ borderTop: '1px dashed #cbd5e1', width: '100%' }} />

                {/* Row 5: Location */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#e6f2ec',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a422d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827', fontFamily: 'sans-serif' }}>Najafgarh, Delhi</span>
                </div>
              </div>

            </div>

            {/* Left Graphic: Symmetrical Line-Art Paper Airplane Path */}
            <div style={{ position: 'absolute', bottom: '80px', left: '25px', zIndex: 1 }}>
              <svg width="180" height="150" viewBox="0 0 180 150" fill="none">
                {/* Airplane trajectory curve */}
                <path 
                  d="M20 130 C 50 110, 80 110, 110 70 C 130 45, 120 25, 95 30" 
                  stroke="#0a422d" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,4" 
                  strokeLinecap="round"
                />
                {/* Line-art Paper Airplane */}
                <g transform="translate(90, 22) rotate(-15)">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a422d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </g>
              </svg>
            </div>

            {/* Right Graphic: Sleek Smartphone Call Screen Illustration */}
            <div style={{ position: 'absolute', bottom: '50px', right: '30px', zIndex: 1 }}>
              <svg width="200" height="240" viewBox="0 0 200 240" fill="none">
                {/* Decorative background rings / circles */}
                <circle cx="100" cy="120" r="70" stroke="#e6f2ec" strokeWidth="1" />
                <circle cx="100" cy="120" r="90" stroke="#e6f2ec" strokeWidth="1" strokeDasharray="3,3" />

                {/* Small floating leaves */}
                <path d="M40 70 Q 50 60 55 75 Q 45 85 40 70 Z" fill="#0a422d" opacity="0.15" />
                <path d="M160 150 Q 170 140 175 155 Q 165 165 160 150 Z" fill="#0a422d" opacity="0.15" />

                {/* Smartphone body */}
                <g transform="rotate(-8 100 120)">
                  {/* Shadow */}
                  <rect x="53" y="33" width="94" height="174" rx="16" fill="rgba(0,0,0,0.06)" />
                  {/* Bezel */}
                  <rect x="50" y="30" width="94" height="174" rx="16" fill="#1e293b" />
                  {/* Screen */}
                  <rect x="54" y="34" width="86" height="166" rx="12" fill="#ffffff" />

                  {/* Notch */}
                  <rect x="87" y="38" width="20" height="3" rx="1.5" fill="#1e293b" />

                  {/* Screen contents */}
                  {/* Musafir Baba Mini logo */}
                  <g transform="translate(69, 60)">
                    <circle cx="12" cy="10" r="5" stroke="#e28325" strokeWidth="1.5" fill="none" />
                    <circle cx="20" cy="10" r="5" stroke="#e28325" strokeWidth="1.5" fill="none" />
                    <path d="M12 13 Q 16 16 20 13" stroke="#e28325" strokeWidth="1.5" fill="none" />
                    <text x="-4" y="27" fill="#0a422d" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Musafir Baba</text>
                  </g>

                  {/* Call screen illustration */}
                  <text x="97" y="115" fill="#64748b" fontSize="7" fontFamily="sans-serif" textAnchor="middle">INCOMING CALL</text>
                  <text x="97" y="127" fill="#0a422d" fontSize="9" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">+91 92896 02447</text>

                  {/* Accept / Decline buttons */}
                  {/* Decline (Red) */}
                  <circle cx="77" cy="160" r="11" fill="#ef4444" />
                  <path d="M73 160 L81 160" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                  
                  {/* Accept (Green) */}
                  <circle cx="117" cy="160" r="11" fill="#22c55e" />
                  <svg x="111" y="154" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </g>
              </svg>
            </div>

          </div>

          {/* Footer Image */}
          <div style={{ width: '100%', height: '72px', flexShrink: 0, zIndex: 1 }}>
            <img 
              src="/Itinerary/footer.png" 
              alt="Footer" 
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            />
          </div>
        </div>
      </div>
    );
  }
);

ItineraryTemplate.displayName = 'ItineraryTemplate';
