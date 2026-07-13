import React from 'react';
import { MapPin, Clock, Plane, Star, Compass, Trees, Mountain, Utensils, Camera, Home, Bus, Activity, Bed, Headset, Percent, User, ShieldAlert, Shield, Calendar, Handshake, Users, AlertTriangle, Lock, Check, Hourglass, Building, CreditCard, Mail, Phone, Instagram, Globe } from 'lucide-react';
import { stripHtml } from '@/lib/utils';

export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;

export const luxuryTheme = {
  dark: '#1b3a5c',     // Deep Blue
  medium: '#4a8c3f',   // Green
  gold: '#f39a2b',     // Orange/Amber
  orange: '#f39a2b',   // Orange/Amber (Keep alias)
  lightGold: '#e8ecef',// Light mute
  cream: '#f0f6fe',    // Icy blue cream
  bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f0f6fe 100%)',
  gray: '#666666'      // Gray text
};

export const PremiumPattern = () => (
  <div style={{
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: `radial-gradient(${luxuryTheme.gold} 0.5px, transparent 0.5px)`,
    backgroundSize: '24px 24px',
    opacity: 0.04,
    pointerEvents: 'none',
    zIndex: 1
  }} />
);

export const FrameCorners = () => (
  <>
    {/* TL */}
    <div style={{ position: 'absolute', width: '20px', height: '20px', top: '10mm', left: '10mm', borderTop: `1.5px solid ${luxuryTheme.gold}`, borderLeft: `1.5px solid ${luxuryTheme.gold}`, opacity: 0.35, pointerEvents: 'none', zIndex: 10 }} />
    {/* TR */}
    <div style={{ position: 'absolute', width: '20px', height: '20px', top: '10mm', right: '10mm', borderTop: `1.5px solid ${luxuryTheme.gold}`, borderRight: `1.5px solid ${luxuryTheme.gold}`, opacity: 0.35, pointerEvents: 'none', zIndex: 10 }} />
    {/* BL */}
    <div style={{ position: 'absolute', width: '20px', height: '20px', bottom: '10mm', left: '10mm', borderBottom: `1.5px solid ${luxuryTheme.gold}`, borderLeft: `1.5px solid ${luxuryTheme.gold}`, opacity: 0.35, pointerEvents: 'none', zIndex: 10 }} />
    {/* BR */}
    <div style={{ position: 'absolute', width: '20px', height: '20px', bottom: '10mm', right: '10mm', borderBottom: `1.5px solid ${luxuryTheme.gold}`, borderRight: `1.5px solid ${luxuryTheme.gold}`, opacity: 0.35, pointerEvents: 'none', zIndex: 10 }} />
  </>
);

export const PageFooter = ({ style = {} }: { style?: React.CSSProperties }) => (
  <div style={{ 
    position: 'absolute', 
    bottom: '-16mm', 
    left: '-14mm', 
    width: 'calc(100% + 28mm)', 
    zIndex: 50,
    ...style 
  }}>
    <img 
      src="/Itinerary/footer.png" 
      alt="Musafir Baba Footer" 
      style={{ width: '100%', height: 'auto', display: 'block' }} 
    />
  </div>
);

export const PageWrapper = ({ children, style = {} }: { children: React.ReactNode, style?: React.CSSProperties }) => (
  <div style={{
    width: `${A4_WIDTH}px`,
    height: `${A4_HEIGHT}px`,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: luxuryTheme.bgGradient,
    boxSizing: 'border-box',
    overflow: 'hidden',
    padding: '16mm 14mm',
    fontFamily: "'Inter', 'Poppins', sans-serif",
    border: `1px solid ${luxuryTheme.dark}33`,
    color: '#292524',
    ...style
  }}>
    <PremiumPattern />
    <FrameCorners />
    <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  </div>
);

export const YogiBabaAvatar = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))', flexShrink: 0 }}>
      <defs>
          <linearGradient id="coolSkin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD1A9"/>
              <stop offset="100%" stopColor="#E2A781"/>
          </linearGradient>
          <linearGradient id="coolHair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#542512"/>
              <stop offset="50%" stopColor="#803D1E"/>
              <stop offset="100%" stopColor="#2D1105"/>
          </linearGradient>
          <linearGradient id="goldGlasses" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE066"/>
              <stop offset="50%" stopColor="#F5B041"/>
              <stop offset="100%" stopColor="#DC7633"/>
          </linearGradient>
          <linearGradient id="coolBeard" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#401B0C"/>
              <stop offset="100%" stopColor="#1F0C05"/>
          </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={luxuryTheme.dark} stroke={luxuryTheme.gold} strokeWidth="2"/>
      <path d="M22 80C22 70 30 65 50 65C70 65 78 70 78 80V92H22V80Z" fill={luxuryTheme.orange} stroke={luxuryTheme.gold} strokeWidth="1"/>
      <path d="M18 55C14 72 23 88 34 91C45 94 55 94 66 91C77 88 86 72 82 55C78 38 22 38 18 55Z" fill="url(#coolHair)"/>
      <circle cx="50" cy="18" r="11" fill="url(#coolHair)"/>
      <circle cx="50" cy="7" r="4" fill={luxuryTheme.gold}/>
      <path d="M32 45C32 32 68 32 68 45C68 56 68 64 50 67C32 64 32 56 32 45Z" fill="url(#coolSkin)"/>
      <path d="M48 24H52V30H48V24Z" fill={luxuryTheme.orange}/>
      <circle cx="50" cy="32" r="1.5" fill={luxuryTheme.gold}/>
      <path d="M33 41C33 37 46 37 46 41C46 46 36 49 33 45V41Z" fill="url(#goldGlasses)" stroke={luxuryTheme.gold} strokeWidth="1.5"/>
      <path d="M54 41C54 37 67 37 67 41C67 45 64 49 54 46V41Z" fill="url(#goldGlasses)" stroke={luxuryTheme.gold} strokeWidth="1.5"/>
      <path d="M46 41H54" stroke={luxuryTheme.gold} strokeWidth="2.5"/>
      <line x1="35" y1="40" x2="41" y2="46" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6"/>
      <line x1="56" y1="40" x2="62" y2="46" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6"/>
      <path d="M32 48C35 48 45 51 50 51C55 51 65 48 68 48C71 58 68 85 50 93C32 85 29 58 32 48Z" fill="url(#coolBeard)"/>
      <path d="M41 53C43 62 46 72 50 80C54 72 57 62 59 53" stroke={luxuryTheme.gold} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M44 54C46 56 54 56 56 54" stroke="#FFD1A9" strokeWidth="2" strokeLinecap="round"/>
      <path d="M34 76L50 91L66 76" fill={luxuryTheme.orange} opacity="0.15"/>
  </svg>
);

export const getCorsBypassedUrl = (url?: string) => {
  if (!url) return url;
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return url.includes('?') ? `${url}&cors=true` : `${url}?cors=true`;
};

export const fallbacks = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=600&auto=format&fit=crop'
];

export const getDayImage = (globalIdx: number, gallery: any, mainImg?: string) => {
  const validImages: string[] = [];
  if (mainImg) validImages.push(mainImg);
  if (gallery && gallery.length > 0) {
    gallery.forEach((g: any) => {
      if (g.url) validImages.push(g.url);
      else if (typeof g === 'string') validImages.push(g);
    });
  }

  if (validImages.length > 0) {
    const imgObj = validImages[globalIdx % validImages.length];
    return getCorsBypassedUrl(imgObj);
  }
  return fallbacks[globalIdx % fallbacks.length];
};

export const getDayLocation = (titleText: string, defaultDest: string) => {
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

export const parseDescriptionPoints = (descHtml: string) => {
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

export const getPointIcon = (text: string) => {
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

export const formatDescription = (descText: string, p0: { fontWeight: number; color: string; marginRight: string; }) => {
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

export const getInclusionIcon = (text: string) => {
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

export const getExclusionIcon = (text: string) => {
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
