import React from 'react';
import { PageWrapper, luxuryTheme, PageFooter } from './shared';
import { Calendar, Users, Compass, Building, Bed, AlertTriangle, Percent, CreditCard, Mountain, Shield, Handshake } from 'lucide-react';

export const TermsConditionsPage = () => {
  return (
    <PageWrapper>


      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 300, fontFamily: "'Playfair Display', serif", color: luxuryTheme.dark, margin: 0, lineHeight: 1.2 }}>
            Terms & <span style={{ fontStyle: 'italic', color: luxuryTheme.gold }}>Conditions</span>
          </h2>
          <div style={{ width: '64px', height: '2.5px', backgroundColor: luxuryTheme.orange, margin: '8px 0 12px' }}></div>
        </div>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '24px', borderRadius: '12px', border: `1px solid ${luxuryTheme.gold}33`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { text: "All bookings are subject to availability at the time of confirmation. Seats are confirmed only after receipt of the required booking amount.", icon: <Calendar size={14} /> },
            { text: "This is a fixed group departure; the itinerary, travel dates, hotels, and transport are pre-planned and cannot be changed for individual participants.", icon: <Users size={14} /> },
            { text: "The company reserves the right to modify the itinerary, sequence of sightseeing, or accommodation due to operational reasons, weather conditions, road conditions, or any unforeseen circumstances, without compromising the overall travel experience.", icon: <Compass size={14} /> },
            { text: "Hotel check-in and check-out timings will be as per hotel policy. Early check-in or late check-out is subject to availability and may incur additional charges.", icon: <Building size={14} /> },
            { text: "Rooms are provided on a shared basis as per the selected occupancy (quad/triple/double). Single occupancy is subject to availability and extra charges.", icon: <Bed size={14} /> },
            { text: "The company is not responsible for delays, changes, or cancellations caused by natural calamities, weather conditions, landslides, road blockages, political disturbances, or any other force majeure events.", icon: <AlertTriangle size={14} /> },
            { text: "Any increase in government taxes, permit fees, toll charges, parking fees, or local entry fees applicable during the tour must be paid by the customer directly.", icon: <Percent size={14} /> },
            { text: "Personal expenses such as laundry, tips, phone calls, medical expenses, additional meals, or any services not mentioned in inclusions are not covered in the package cost.", icon: <CreditCard size={14} /> },
            { text: "For trekking or high-altitude destinations, participants must assess their own physical fitness. The company will not be responsible for health-related issues arising during the tour.", icon: <Mountain size={14} /> },
            { text: "Any damage caused to hotel property, vehicles, or public property during the tour shall be borne by the concerned participant.", icon: <Shield size={14} /> },
            { text: "The company reserves the right to cancel or reschedule a group departure if the minimum required number of participants is not met. In such cases, alternate options or a full refund will be provided.", icon: <Users size={14} /> },
            { text: "By booking the tour, the customer confirms that they have read, understood, and agreed to all the terms and conditions mentioned above.", icon: <Handshake size={14} /> }
          ].map((item, idx) => (
            <div key={idx} style={{ 
              display: 'flex', gap: '16px', alignItems: 'flex-start', 
              borderBottom: idx < 11 ? `1px solid ${luxuryTheme.gold}22` : 'none', 
              paddingBottom: '8px' 
            }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%', backgroundColor: luxuryTheme.dark,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: '#ffffff', fontSize: '10px', fontWeight: 700
              }}>
                {idx + 1}
              </div>
              <div style={{ flexShrink: 0, marginTop: '5px', color: luxuryTheme.gold }}>
                {item.icon}
              </div>
              <p style={{ flex: 1, fontSize: '11px', color: luxuryTheme.dark, margin: 0, lineHeight: 1.5, paddingTop: '3px' }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <PageFooter />
    </PageWrapper>
  );
};
