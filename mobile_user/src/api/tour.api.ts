import { apiClient } from './axios';

// Holiday packages -- the same public endpoints the musafirbaba.com
// /holidays pages use. Read-only; booking still happens on the website.

export interface TourImage {
  url?: string;
  alt?: string;
}

export interface TourBatch {
  _id: string;
  startDate: string;
  endDate: string;
  quad?: number;
  quadDiscount?: number;
  triple?: number;
  tripleDiscount?: number;
  double?: number;
  doubleDiscount?: number;
  child?: number;
  childDiscount?: number;
  status?: string;
}

export interface TourItineraryDay {
  title?: string;
  description?: string;
  locationImage?: TourImage;
}

export interface TourPackage {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  canonicalUrl?: string;
  destination?: { _id: string; name?: string; state?: string; country?: string } | null;
  mainCategory?: { _id: string; name?: string; slug?: string } | string | null;
  coverImage?: TourImage;
  coverImages?: TourImage[];
  gallery?: TourImage[];
  duration?: { days?: number; nights?: number };
  batch?: TourBatch[];
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  itinerary?: TourItineraryDay[];
  faqs?: { question: string; answer: string }[];
  isBestSeller?: boolean;
  isFeatured?: boolean;
  addOns?: { _id?: string; title: string; items?: { _id: string; title: string; price: number }[] }[];
}

// Add-on picked on the details screen (price shown for preview only; the
// server prices add-ons from the package).
export interface TourAddOnPick {
  itemId: string;
  title: string;
  price: number;
  noOfPeople: number;
}

export interface TourCategory {
  _id: string;
  name: string;
  slug: string;
  coverImage?: TourImage;
  isActive?: boolean;
}

export interface TourDestination {
  _id: string;
  name: string;
  state?: string;
  country?: string;
  coverImage?: TourImage;
}

export interface TourListParams {
  search?: string;
  category?: string;
  minDays?: number;
  maxDays?: number;
}

export const getTourPackages = (params: TourListParams = {}) =>
  apiClient.get<{ success: boolean; total: number; data: TourPackage[] }>('/packages', { params });

export const getTourPackageById = (id: string) =>
  apiClient.get<{ success: boolean; data: TourPackage }>(`/packages/id/${id}`);

export const getBestSellerTours = () =>
  apiClient.get<{ success: boolean; data: TourPackage[] }>('/packages/best-seller');

export const getTourCategories = () =>
  apiClient.get<{ success: boolean; data: TourCategory[] }>('/category');

export const getTourDestinations = () =>
  apiClient.get<{ success: boolean; data: TourDestination[] }>('/destination');

// ---- Helpers (display only) ----

export const WEBSITE_URL = 'https://musafirbaba.com';

// "Starting from" price per person -- same rule as the website's package
// cards (first batch, quad sharing).
export const getTourStartingPrice = (pkg: TourPackage): number | null => {
  const price = pkg.batch?.[0]?.quad;
  return typeof price === 'number' && price > 0 ? price : null;
};

export const getTourImages = (pkg: TourPackage): string[] => {
  const urls = [...(pkg.coverImages || []), pkg.coverImage, ...(pkg.gallery || [])]
    .map((img) => img?.url)
    .filter((url): url is string => !!url);
  return Array.from(new Set(urls));
};

export const getTourDurationLabel = (pkg: TourPackage): string | null => {
  const days = pkg.duration?.days;
  const nights = pkg.duration?.nights;
  if (!days && !nights) return null;
  return `${nights ?? Math.max((days || 1) - 1, 0)}N / ${days ?? (nights || 0) + 1}D`;
};

const HTML_ENTITIES: Record<string, string> = { '&amp;': '&', '&nbsp;': ' ', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };

// Backend descriptions/FAQ answers are HTML -- turn them into readable plain text.
export const htmlToText = (html?: string): string =>
  (html || '')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|nbsp|quot|#39|lt|gt);/g, (m) => HTML_ENTITIES[m] || m)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Website page for a package (used for "Book Now" -- package booking and
// payment run on the website's own account system).
export const getTourBookingUrl = (pkg: TourPackage): string =>
  pkg.canonicalUrl ? `${WEBSITE_URL}${pkg.canonicalUrl}/${pkg._id}` : `${WEBSITE_URL}/holidays`;

export const getTourPageUrl = (pkg: TourPackage): string =>
  pkg.canonicalUrl ? `${WEBSITE_URL}${pkg.canonicalUrl}` : `${WEBSITE_URL}/holidays`;

// ---- Holiday bookings from the app (rider-authenticated, see backend tourAppBooking.routes.js) ----

export type TourSharing = 'quad' | 'triple' | 'double';
export type TourPaymentOption = 'FULL' | 'ADVANCE';

export interface TourAppBooking {
  _id: string;
  package: string;
  batchId: string;
  packageTitle: string;
  packageImage?: string;
  destinationName?: string;
  durationDays?: number;
  durationNights?: number;
  startDate: string;
  endDate?: string;
  travellers: { quad: number; triple: number; double: number; child: number };
  priceLines: { type: string; count: number; unitPrice: number; amount: number }[];
  addOns?: { itemId: string; group?: string; title: string; price: number; noOfPeople: number; amount: number }[];
  addOnsAmount?: number;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  paymentOption: TourPaymentOption;
  payNowAmount: number;
  balanceAmount: number;
  balanceDueDate?: string;
  paymentInfo?: { txnid?: string; mihpayid?: string; status?: 'Pending' | 'Paid' | 'Failed'; paidAt?: string };
  bookingStatus: 'PaymentPending' | 'Confirmed' | 'Cancelled';
  createdAt: string;
}

export const createTourAppBooking = (payload: {
  packageId: string;
  batchId: string;
  travellers: { quad: number; triple: number; double: number; child: number };
  addOns: { itemId: string; noOfPeople: number }[];
  paymentOption: TourPaymentOption;
}) => apiClient.post<{ success: boolean; data: TourAppBooking }>('/tour-booking', payload);

export const getMyTourAppBookings = () =>
  apiClient.get<{ success: boolean; data: TourAppBooking[] }>('/tour-booking/my');

export const getTourAppBooking = (id: string) =>
  apiClient.get<{ success: boolean; data: TourAppBooking }>(`/tour-booking/${id}`);

export const initiateTourAppPayment = (id: string) =>
  apiClient.post<{ success: boolean; payuUrl: string; paymentData: Record<string, string | number> }>(`/tour-booking/${id}/pay`);

// Client-side preview of the server's pricing (backend tourAppPricing.service.js).
// The server recalculates and its numbers are what's charged.
export const TOUR_GST_RATE = 0.05;
export const TOUR_ADVANCE_RATE = 0.25;
export const TOUR_BALANCE_DUE_DAYS = 15;

export type TourTravellers = { quad: number; triple: number; double: number; child: number };
export const TOUR_ROOM_TYPES = ['quad', 'triple', 'double', 'child'] as const;
export const TOUR_ROOM_LABEL: Record<(typeof TOUR_ROOM_TYPES)[number], string> = {
  quad: 'Quad Sharing',
  triple: 'Triple Sharing',
  double: 'Double Sharing',
  child: 'Child',
};

// Same as the website: a separate count per room type, each charged at that
// departure's price for the type, plus add-ons (price × people); then 5% GST
// (website payment page). Partial payment (25%) is offered for every departure.
export const previewTourPrice = (batch: TourBatch, travellers: TourTravellers, addOns: TourAddOnPick[] = []) => {
  const lines = TOUR_ROOM_TYPES.filter((t) => travellers[t] > 0).map((t) => {
    const unitPrice = Number(batch[t]) || 0;
    return { type: t, label: TOUR_ROOM_LABEL[t], count: travellers[t], unitPrice, amount: unitPrice * travellers[t] };
  });
  const base = lines.reduce((sum, l) => sum + l.amount, 0);
  const addOnsAmount = addOns.reduce((sum, a) => sum + a.price * a.noOfPeople, 0);
  const total = Math.ceil((base + addOnsAmount) * (1 + TOUR_GST_RATE));
  const balanceDue = new Date(new Date(batch.startDate).getTime() - TOUR_BALANCE_DUE_DAYS * 86400000);
  const adults = travellers.quad + travellers.triple + travellers.double;
  return {
    lines,
    adults,
    children: travellers.child,
    base,
    addOns,
    addOnsAmount,
    gst: total - base - addOnsAmount,
    total,
    advance: Math.ceil(total * TOUR_ADVANCE_RATE),
    balanceDue,
  };
};

export const tourBookingCode = (id: string) => `MBGT-${id.slice(-6).toUpperCase()}`;
