"use client";

import React, { forwardRef } from 'react';
import { ItineraryItem } from './ItineryDialog';
import { CoverPage, ThankYouPage, OverviewPage, BriefItineraryPage, DetailedItineraryPage, InclusionsExclusionsPage, WhyTravelWithUsPage, PricingPaymentTermsPage, GroupDeparturePage, BookingProcessPage, TermsConditionsPage, CancellationPolicyPage, RegistrationsPage, TestimonialsPage, ContactUsPage } from './ItineraryPages';

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
  packageEssentials?: string;
  fullDescription?: string;
}

export const ItineraryTemplate = forwardRef<HTMLDivElement, ItineraryTemplateProps>(
  ({ title, description, fullDescription, itinerary, duration, img, highlights, destination, gallery, inclusions = [], exclusions = [], batch = [], packageEssentials }, ref) => {
    const ITEMS_PER_PAGE = 1;
    const itineraryPages: ItineraryItem[][] = [];
    if (itinerary && itinerary.length > 0) {
      for (let i = 0; i < itinerary.length; i += ITEMS_PER_PAGE) {
        itineraryPages.push(itinerary.slice(i, i + ITEMS_PER_PAGE));
      }
    }
    const topHighlights = (highlights || []).slice(0, 4);
    const commonProps = { title, description, itinerary, duration, img, highlights, destination, gallery, inclusions, exclusions, batch, topHighlights, itineraryPages, packageEssentials };

    return (
      <div ref={ref} className="handwritten-container" style={{ position: 'fixed', top: 0, left: '-9999px', opacity: 0.01, zIndex: -9999, pointerEvents: 'none' }}>
        <style dangerouslySetInnerHTML={{ __html: "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap'); .handwritten-container * { line-height: 1.5 !important; }" }} />
        <CoverPage {...commonProps} />
        <ThankYouPage />
        <OverviewPage {...commonProps} description={fullDescription || description} />
        <BriefItineraryPage {...commonProps} />
        <DetailedItineraryPage {...commonProps} />
        <InclusionsExclusionsPage {...commonProps} />
        <PricingPaymentTermsPage {...commonProps} />
        <GroupDeparturePage {...commonProps} />
        <TermsConditionsPage {...commonProps} />
        <CancellationPolicyPage {...commonProps} />
        <RegistrationsPage {...commonProps} />
        <TestimonialsPage {...commonProps} />
        <ContactUsPage {...commonProps} />
      </div>
    );
  }
);

ItineraryTemplate.displayName = 'ItineraryTemplate';
