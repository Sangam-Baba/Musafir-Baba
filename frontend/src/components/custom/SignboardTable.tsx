"use client";

import React, { useMemo } from 'react';

export default function SignboardTable({ html }: { html: string }) {
  const rows = useMemo(() => {
    const parsedRows: { left: string; right: string }[] = [];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(html)) !== null) {
      if (trMatch[1].includes('<th')) continue;
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let tdMatch;
      const tds = [];
      while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
        tds.push(tdMatch[1].replace(/<[^>]*>?/gm, '').trim());
      }
      if (tds.length >= 2) {
        parsedRows.push({ left: tds[0], right: tds[1] });
      }
    }
    return parsedRows;
  }, [html]);

  if (rows.length === 0) return null;

  return (
    <div className="relative flex flex-col items-center py-6 sm:py-8 bg-[#050811] rounded-2xl overflow-hidden shadow-2xl border border-gray-900 mt-2">
      <style dangerouslySetInnerHTML={{
        __html: `
          @import url('https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');
          
          @keyframes driftPlankLeft {
            0%, 100% { transform: rotate(-0.6deg) translateY(0px); }
            50% { transform: rotate(0.4deg) translateY(-2px); }
          }
          @keyframes driftPlankRight {
            0%, 100% { transform: rotate(0.5deg) translateY(0px); }
            50% { transform: rotate(-0.5deg) translateY(-2.5px); }
          }
          @keyframes driftPlankAltA {
            0%, 100% { transform: rotate(0.7deg) translateY(-1px); }
            50% { transform: rotate(-0.3deg) translateY(1px); }
          }
          @keyframes driftPlankAltB {
            0%, 100% { transform: rotate(-0.8deg) translateY(1.5px); }
            50% { transform: rotate(0.5deg) translateY(-1px); }
          }
          .animate-drift-left { animation: driftPlankLeft 9s ease-in-out infinite; }
          .animate-drift-right { animation: driftPlankRight 10s ease-in-out infinite; }
          .animate-drift-alt-a { animation: driftPlankAltA 8s ease-in-out infinite; }
          .animate-drift-alt-b { animation: driftPlankAltB 11s ease-in-out infinite; }

          .carved-birch {
            color: #33312e;
            text-shadow: 0px 1px 1px rgba(255, 255, 255, 0.4), 0px -1px 1px rgba(0, 0, 0, 0.85);
          }
        `
      }} />

      {/* Vertical Support Post Pillar */}
      <div className="absolute top-0 bottom-0 w-10 left-1/2 -translate-x-1/2 z-0" style={{
        borderRadius: '4px',
        boxShadow: 'inset -4px 0 10px rgba(0,0,0,0.9), inset 4px 0 8px rgba(255,255,255,0.08), 0 16px 32px rgba(0,0,0,0.75)',
        background: 'linear-gradient(to right, #141413 0%, #3a3937 12%, #a19e99 38%, #d4d2cd 50%, #575552 82%, #181817 100%)'
      }}>
        <div className="absolute top-0 left-0 right-0 h-4 filter brightness-125" style={{ borderRadius: '50% 50% 0 0 / 20% 20% 0 0', background: 'inherit' }}></div>
        <div className="absolute bottom-0 left-0 right-0 h-4 filter brightness-75" style={{ borderRadius: '0 0 50% 50% / 0 0 20% 20%', background: 'inherit' }}></div>
      </div>

      {/* Signboard Hanging Planks Stack */}
      <div className="relative z-10 space-y-2.5 flex flex-col items-center w-full px-4 mt-2">
        {rows.map((row, index) => {
          const type = index % 4;
          
          let animationClass = '';
          let clipPath = '';
          let transformOrigin = '';
          let leftRivet = true;
          let rightRivet = false;
          let dotColor = 'bg-emerald-400';
          let driftTranslate = '';

          // Determine styling based on modulo to mimic the template variations
          if (type === 0) {
            animationClass = 'animate-drift-left';
            clipPath = 'polygon(0% 0%, calc(100% - 40px) 0%, 100% 50%, calc(100% - 40px) 100%, 0% 100%)';
            transformOrigin = '70px center';
            leftRivet = true; rightRivet = false;
            dotColor = 'bg-emerald-400';
            driftTranslate = 'md:-translate-x-6';
          } else if (type === 1) {
            animationClass = 'animate-drift-right';
            clipPath = 'polygon(40px 0%, 100% 0%, 100% 100%, 40px 100%, 0% 50%)';
            transformOrigin = 'calc(100% - 70px) center';
            leftRivet = true; rightRivet = true;
            dotColor = 'bg-amber-400';
            driftTranslate = 'md:translate-x-6';
          } else if (type === 2) {
            animationClass = 'animate-drift-alt-a';
            clipPath = 'polygon(0% 0%, calc(100% - 40px) 0%, 100% 50%, calc(100% - 40px) 100%, 0% 100%)';
            transformOrigin = '70px center';
            leftRivet = true; rightRivet = false;
            dotColor = 'bg-sky-400';
            driftTranslate = 'md:-translate-x-6';
          } else {
            animationClass = 'animate-drift-alt-b';
            clipPath = 'polygon(40px 0%, 100% 0%, 100% 100%, 40px 100%, 0% 50%)';
            transformOrigin = 'calc(100% - 70px) center';
            leftRivet = true; rightRivet = true;
            dotColor = 'bg-rose-500';
            driftTranslate = 'md:translate-x-6';
          }

          return (
            <div 
              key={index}
              className={`w-full max-w-[340px] sm:max-w-md p-2.5 py-3 bg-[#e2e2e2] border-stone-400/50 border-y-2 ${animationClass} ${driftTranslate} relative hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 flex items-center justify-between`}
              style={{
                clipPath,
                transformOrigin,
                fontFamily: "'MedievalSharp', cursive, sans-serif",
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.05) 0px, rgba(0, 0, 0, 0.05) 2px, transparent 2px, transparent 6px)'
              }}
            >
              
              {/* Left Anchor Rivet */}
              {leftRivet && (
                <div className="absolute left-[35px] sm:left-[70px] top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full bg-[#1b2331] border border-black/80 flex items-center justify-center">
                    <div className="w-2 h-0.5 sm:w-3 sm:h-0.5 bg-[#404c5c]/80 rotate-[35deg] rounded-sm"></div>
                  </div>
                </div>
              )}

              {/* Right Anchor Rivet */}
              {rightRivet && (
                <div className="absolute right-[35px] sm:right-[70px] top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full bg-[#1b2331] border border-black/80 flex items-center justify-center">
                    <div className="w-2 h-0.5 sm:w-3 sm:h-0.5 bg-[#404c5c]/80 -rotate-[15deg] rounded-sm"></div>
                  </div>
                </div>
              )}

              {/* Dynamic Text Column */}
              <div className={`flex-1 flex flex-col ${(type === 1 || type === 3) ? 'pl-10 sm:pl-14 pr-4 sm:pr-6 text-right' : 'pl-10 sm:pl-6 pr-10 sm:pr-14 text-left'}`}>
                <span className="text-[11px] sm:text-sm font-bold uppercase tracking-wider carved-birch line-clamp-2 leading-tight">
                  {row.left}
                </span>
                <div className={`flex items-center gap-1.5 mt-1.5 font-sans text-[10px] sm:text-xs font-bold carved-birch opacity-95 ${(type === 1 || type === 3) ? 'justify-end' : 'justify-start'}`}>
                  <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${dotColor}`}></span>
                  <span className="line-clamp-1">{row.right}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
