import React from 'react';
import { PageWrapper, luxuryTheme, PageFooter } from './shared';
import { Users, Calendar, Mountain, Lock, Check, Hourglass, Trees, AlertTriangle } from 'lucide-react';

export const GroupDeparturePage = ({ batch }: any) => {
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
  const hasRealBatches = activeBatchList.some((b: any) => b.startDate);

  const monthsToRender = monthConfigs.map((mConfig, index) => {
    if (!hasRealBatches) return mConfig;
    const monthBatches = activeBatchList.filter((b: any) => {
      if (!b.startDate) return false;
      const d = new Date(b.startDate);
      return d.getMonth() === index;
    });
    if (monthBatches.length === 0) return { name: mConfig.name, active: false };

    const departures = monthBatches.map((b: any) => {
      const depDate = new Date(b.startDate);
      const retDate = b.endDate ? new Date(b.endDate) : new Date(depDate.getTime() + 10 * 24 * 60 * 60 * 1000);
      const fmt = (d: Date) => {
        if (isNaN(d.getTime())) return "TBD";
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
    <PageWrapper>


      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0, lineHeight: 1.2 }}>
            Departure <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Schedule 2026</span>
          </h2>
          <div style={{ width: '64px', height: '2.5px', backgroundColor: luxuryTheme.orange, margin: '8px 0 12px' }}></div>
        </div>

        {/* Summary Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '12px', padding: '16px 24px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: luxuryTheme.gold }}><Users size={20} /></div>
            <div>
              <p style={{ fontSize: '10px', color: luxuryTheme.gray, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, whiteSpace: 'nowrap' }}>Total Departures</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: luxuryTheme.dark, margin: 0 }}>{totalDeparturesCount || 18}</p>
            </div>
          </div>
          <div style={{ width: '1px', backgroundColor: `${luxuryTheme.gold}33` }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: luxuryTheme.gold }}><Calendar size={20} /></div>
            <div>
              <p style={{ fontSize: '10px', color: luxuryTheme.gray, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, whiteSpace: 'nowrap' }}>Months Active</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: luxuryTheme.dark, margin: 0 }}>{activeMonthsCount || 8}</p>
            </div>
          </div>
          <div style={{ width: '1px', backgroundColor: `${luxuryTheme.gold}33` }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: luxuryTheme.gold }}><Mountain size={20} /></div>
            <div>
              <p style={{ fontSize: '10px', color: luxuryTheme.gray, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Best Season</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: luxuryTheme.dark, margin: 0 }}>May - June</p>
            </div>
          </div>
        </div>

        {/* Calendar Grid (4x3) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {monthsToRender.map((month, idx) => (
            <div key={idx} style={{ backgroundColor: '#ffffff', border: `1px solid ${luxuryTheme.gold}22`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ backgroundColor: month.active ? luxuryTheme.dark : '#e2e8f0', padding: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: month.active ? luxuryTheme.gold : '#94a3b8', letterSpacing: '0.1em' }}>{month.name}</span>
              </div>
              <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {!month.active ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.5 }}>
                    <Lock size={16} />
                    <span style={{ fontSize: '10px', fontWeight: 600 }}>No Departures</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(month.departures || []).map((dep: any, dIdx: number) => (
                      <div key={dIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', borderBottom: dIdx !== (month.departures || []).length - 1 ? '1px dotted #e2e8f0' : 'none', paddingBottom: '4px' }}>
                        <div style={{ whiteSpace: 'nowrap' }}><span style={{ color: luxuryTheme.gray, fontWeight: 700 }}>DEP:</span> <span style={{ color: luxuryTheme.dark, fontWeight: 600 }}>{dep.dep.split(' ').slice(0, 2).join(' ')}</span></div>
                        <div style={{ whiteSpace: 'nowrap' }}><span style={{ color: luxuryTheme.gray, fontWeight: 700 }}>RET:</span> <span style={{ color: luxuryTheme.dark, fontWeight: 600 }}>{dep.ret.split(' ').slice(0, 2).join(' ')}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Advisory */}
        <div style={{ display: 'flex', gap: '16px', marginTop: 'auto' }}>
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', border: `1px solid ${luxuryTheme.gold}33`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ color: luxuryTheme.gold }}><AlertTriangle size={24} /></div>
             <div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: luxuryTheme.dark, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Travel Advisory</h4>
                <p style={{ fontSize: '11px', color: luxuryTheme.gray, margin: 0, lineHeight: 1.5 }}>
                  This Package Involves high-altitude travel and trekking; participants should be medically fit and prepared for changing terrain and weather conditions.
                </p>
             </div>
          </div>
        </div>

      </div>
      <PageFooter />
    </PageWrapper>
  );
};

