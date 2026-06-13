import React from "react";
import { BlogContent } from "./BlogContent";
import { 
  Info, MapPin, Map, Calendar, Clock, Car, 
  Hotel, Tag, Navigation, Shield, Compass, Star, CheckCircle2
} from "lucide-react";

const getIconForLabel = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes('name') || l.includes('package')) return <Tag size={16} />;
  if (l.includes('region') || l.includes('location') || l.includes('destination') || l.includes('place')) return <MapPin size={16} />;
  if (l.includes('type') || l.includes('category') || l.includes('theme')) return <Compass size={16} />;
  if (l.includes('pickup') || l.includes('drop') || l.includes('point')) return <Navigation size={16} />;
  if (l.includes('transport') || l.includes('car') || l.includes('vehicle') || l.includes('flight') || l.includes('travel')) return <Car size={16} />;
  if (l.includes('accommod') || l.includes('hotel') || l.includes('stay') || l.includes('room')) return <Hotel size={16} />;
  if (l.includes('time') || l.includes('duration') || l.includes('day') || l.includes('hour')) return <Clock size={16} />;
  if (l.includes('date') || l.includes('month') || l.includes('year') || l.includes('season')) return <Calendar size={16} />;
  if (l.includes('difficulty') || l.includes('level') || l.includes('grade')) return <Star size={16} />;
  if (l.includes('protect') || l.includes('insurance') || l.includes('safety')) return <Shield size={16} />;
  if (l.includes('include') || l.includes('provide') || l.includes('offer')) return <CheckCircle2 size={16} />;
  
  return <Info size={16} />; // fallback
};

export default function QuickFactsGrid({ html }: { html: string }) {
  // Extract table rows using regex
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const matches = [...html.matchAll(trRegex)];
  
  const data: { label: string; value: string }[] = [];
  for (const match of matches) {
    const trContent = match[1];
    // Find all th or td cells
    const cellRegex = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
    const cells = [...trContent.matchAll(cellRegex)];
    
    // Only parse if we have at least 2 columns (label and value)
    if (cells.length >= 2) {
      // Clean HTML tags and decode basic entities
      const cleanLabel = cells[0][2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      const cleanValue = cells[1][2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      
      // Skip header rows if they just say "Package Information" and "Details"
      if (cleanLabel.toLowerCase().includes("information") && cleanValue.toLowerCase().includes("detail")) {
        continue;
      }
      
      if (cleanLabel || cleanValue) {
        data.push({
          label: cleanLabel,
          value: cleanValue
        });
      }
    }
  }

  // If no valid 2-column table is found, fallback to standard BlogContent rendering
  if (data.length === 0) {
    return (
      <div className="prose prose-base max-w-none text-gray-600 leading-relaxed">
        <BlogContent html={html} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((item, index) => (
        <div 
          key={index} 
          className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-[#FE5300]/30 hover:shadow-md transition-all duration-300"
        >
          <div className="flex-shrink-0 mt-0.5 text-[#FE5300] bg-orange-100/50 p-1.5 rounded-lg">
            {getIconForLabel(item.label)}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-[0.05em] text-[#FE5300] mb-0.5">
              {item.label}
            </span>
            <span className="text-sm font-semibold text-gray-800 leading-snug">
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
