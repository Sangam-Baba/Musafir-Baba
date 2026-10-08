import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from './axios';

// Visa services. Country data comes from the same public endpoints the
// musafirbaba.com /visa pages use; applications go to the rider-only
// /visa-app routes (same Visa Applications collection the website uses,
// so they appear in Admin -> Visa Applications).

export interface VisaImage {
  url?: string;
  alt?: string;
}

export interface VisaValidityEntry {
  _id?: string;
  visaValidity?: string;
  visaDuration?: string;
  entryType?: string;
  processTime?: string;
  governmentFee?: number;
  serviceCharges?: number;
  gst?: number;
  expressVisaDuration?: string;
  expressGovernmentFee?: number;
  expressServiceCharges?: number;
}

// One "visa type" card of a country (e.g. Tourist E-Visa).
export interface VisaCard extends VisaValidityEntry {
  _id: string;
  visaPurpose?: string;
  visaType?: string;
  isExpress?: boolean;
  validityEntries?: VisaValidityEntry[];
}

export interface Visa {
  _id: string;
  title: string;
  slug: string;
  country: string;
  excerpt?: string;
  quickSummary?: string;
  eligibility?: string;
  documentsContent?: string;
  coverImage?: VisaImage;
  bannerImage?: VisaImage;
  duration?: string;
  cost?: number;
  visaType?: string;
  visaProcessed?: number;
  necessaryDocuments?: string[];
  visas?: VisaCard[];
  faqs?: { question: string; answer: string }[];
  isActive?: boolean;
}

export const getVisaList = () => apiClient.get<{ success: boolean; data: Visa[] }>('/visa', { params: { isActive: true } });

export const getVisaBySlug = (slug: string) => apiClient.get<{ success: boolean; data: Visa }>(`/visa/slug/${slug}`);

// ---------- Applications ----------

export type VisaGender = 'Male' | 'Female' | 'Other';
export interface VisaTraveller {
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  gender: VisaGender | '';
}
export interface VisaDocument {
  name: string;
  travellerId: string; // traveller position: "0", "1", ...
  media: { url: string; key?: string; format?: string; size?: number };
}
export interface VisaEligibility {
  purpose: string;
  travelDate: string; // YYYY-MM-DD
  stayDuration: string;
  travellerCount: number;
}
export type VisaApplicationStatus = 'Pending' | 'Submitted' | 'Processing' | 'Approved' | 'Rejected' | 'Returned' | 'Applied' | 'Under Review' | 'Reviewed';

export interface VisaApplication {
  _id: string;
  applicationId?: string;
  visaId: Visa | string;
  email?: string;
  phone?: string;
  travellers: VisaTraveller[];
  documents: VisaDocument[];
  currentStep?: number;
  totalCost: number;
  selectedVisaId?: string;
  selectedValidityIndex?: number;
  isExpress?: boolean;
  eligibility?: Partial<VisaEligibility>;
  paymentInfo?: { status?: 'Pending' | 'Paid' | 'Failed'; orderId?: string; paymentId?: string };
  applicationStatus: VisaApplicationStatus;
  returnReason?: string;
  resubmittedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VisaFee {
  perPerson: { governmentFee: number; serviceCharge: number; gstPercent: number; gst: number; total: number };
  travellerCount: number;
  totalCost: number;
}

export interface VisaDraftPayload {
  visaId?: string;
  selectedVisaId?: string;
  selectedValidityIndex?: number;
  isExpress?: boolean;
  travellers?: VisaTraveller[];
  email?: string;
  phone?: string;
  documents?: VisaDocument[];
  eligibility?: VisaEligibility;
  currentStep?: number;
}

type DraftResponse = { success: boolean; data: VisaApplication; fee: VisaFee };

export const saveVisaDraft = (id: string | null, payload: VisaDraftPayload) =>
  id ? apiClient.put<DraftResponse>(`/visa-app/${id}`, payload) : apiClient.post<DraftResponse>('/visa-app', payload);

export const getMyVisaApps = () => apiClient.get<{ success: boolean; data: VisaApplication[] }>('/visa-app/my');

export const getVisaApp = (id: string) => apiClient.get<{ success: boolean; data: VisaApplication }>(`/visa-app/${id}`);

export const payVisaApp = (id: string) =>
  apiClient.post<{ success: boolean; payuUrl: string; paymentData: Record<string, string | number> }>(`/visa-app/${id}/pay`);

export const resubmitVisaApp = (id: string) => apiClient.post<{ success: boolean; data: VisaApplication }>(`/visa-app/${id}/resubmit`);

// ---------- Helpers (display only -- the server computes what is charged) ----------

export const VISA_WHATSAPP_NUMBER = '919289602447';
export const VISA_PHONE_DISPLAY = '+91 92896 02447';
export const VISA_MAX_TRAVELLERS = 20;
export const VISA_MAX_FILE_BYTES = 5 * 1024 * 1024; // same 5 MB limit as the website
export const VISA_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export const ELIGIBILITY_PURPOSES = ['Holiday / Tourism', 'Visit Family or Friends', 'Business Visit', 'Study', 'Work', 'Other'] as const;
export const STAY_DURATIONS = ['Up to 1 Week', '1 - 2 Weeks', '2 - 4 Weeks', '1 - 3 Months', '3+ Months'] as const;

// Passport + Photo + the country's own list (same as the website).
export const getRequiredDocuments = (visa?: Visa | null): string[] =>
  Array.from(new Set(['Passport', 'Photo', ...((visa && visa.necessaryDocuments) || [])]));

export const getVisaEntry = (card: VisaCard | undefined, validityIndex: number): VisaValidityEntry | undefined =>
  card ? card.validityEntries?.[validityIndex] || card : undefined;

// Express only when the visa type offers it and has express fees configured.
export const canExpress = (card: VisaCard | undefined, entry: VisaValidityEntry | undefined) =>
  !!card?.isExpress && !!entry && Number(entry.expressGovernmentFee || 0) + Number(entry.expressServiceCharges || 0) > 0;

// Per-person fee for a visa option -- same formula as the website/server.
export const previewVisaFee = (visa: Visa, card: VisaCard | undefined, validityIndex: number, express: boolean) => {
  const entry = getVisaEntry(card, validityIndex);
  if (!entry) {
    const cost = Number(visa.cost || 0);
    return { governmentFee: cost, serviceCharge: 0, gstPercent: 0, gst: 0, total: cost };
  }
  const useExpress = express && canExpress(card, entry);
  const governmentFee = Number((useExpress ? entry.expressGovernmentFee : entry.governmentFee) || 0);
  const serviceCharge = Number((useExpress ? entry.expressServiceCharges : entry.serviceCharges) || 0);
  const gstPercent = Number(entry.gst || 0);
  const gst = Math.round((serviceCharge * gstPercent) / 100);
  return { governmentFee, serviceCharge, gstPercent, gst, total: governmentFee + serviceCharge + gst };
};

// Lowest standard per-person price across the country's visa options.
export const getVisaStartingPrice = (visa: Visa, card?: VisaCard): number | null => {
  const cards = card ? [card] : visa.visas || [];
  const prices: number[] = [];
  for (const c of cards) {
    const count = c.validityEntries?.length || 1;
    for (let i = 0; i < count; i++) {
      const p = previewVisaFee(visa, c, i, false).total;
      if (p > 0) prices.push(p);
    }
  }
  if (prices.length) return Math.min(...prices);
  return visa.cost && visa.cost > 0 ? visa.cost : null;
};

export const getVisaImage = (visa?: Visa | null) => visa?.bannerImage?.url || visa?.coverImage?.url || '';

export const visaCardTitle = (card?: VisaCard) => (card ? `${card.visaPurpose || 'Standard'} Visa` : 'Standard Visa');

export const visaEntryLabel = (entry?: VisaValidityEntry) =>
  [entry?.visaValidity && `${entry.visaValidity} validity`, entry?.visaDuration && `${entry.visaDuration} stay`, entry?.entryType && `${entry.entryType} entry`]
    .filter(Boolean)
    .join(' · ');

const VISA_TYPE_LABEL: Record<string, string> = { 'E-Visa': 'E-Visa', Sticker: 'Sticker Visa', EVOA: 'Visa on Arrival', DAC: 'Digital Arrival Card', ETA: 'ETA', PAR: 'Pre-Arrival Registration' };
export const visaTypeLabel = (t?: string) => (t ? VISA_TYPE_LABEL[t] || t : '');

export const isVisaPaid = (app?: VisaApplication | null) => app?.paymentInfo?.status === 'Paid';

// ---------- Document upload (same presigned-URL upload the website uses) ----------

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export async function uploadVisaFile(file: PickedFile): Promise<VisaDocument['media']> {
  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, '-').slice(-80) || 'document';
  const presign = await apiClient.post<{ uploadUrl: string; fileUrl: string; key: string }>('/upload/cloudflare-url', {
    fileName: safeName,
    fileType: file.mimeType,
    folder: 'visa-applications',
  });
  const { uploadUrl, fileUrl, key } = presign.data;

  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    const res = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': file.mimeType } });
    if (!res.ok) throw new Error('Upload failed');
  } else {
    const res = await FileSystem.uploadAsync(uploadUrl, file.uri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': file.mimeType },
    });
    if (res.status < 200 || res.status >= 300) throw new Error('Upload failed');
  }
  return { url: fileUrl, key, format: file.mimeType, size: file.size || 0 };
}

// Where to continue an unfinished / returned application from.
export const getResumeScreen = (app: VisaApplication): string => {
  if (app.applicationStatus === 'Returned') return 'visa-details';
  if (!app.travellers?.length) return 'visa-type';
  const visa = typeof app.visaId === 'object' ? app.visaId : null;
  const required = getRequiredDocuments(visa);
  const complete = app.travellers.every((_, i) => required.every((name) => app.documents?.some((d) => d.travellerId === String(i) && d.name === name && d.media?.url)));
  return complete ? 'visa-review' : 'visa-documents';
};

// Status shown to the rider.
export const visaStatusLook = (app: VisaApplication): { label: string; bg: string; color: string } => {
  const s = app.applicationStatus;
  if (s === 'Pending') return app.paymentInfo?.status === 'Failed' ? { label: 'Payment failed', bg: '#FEE2E2', color: '#B91C1C' } : { label: 'Draft', bg: '#F1F5F9', color: '#475569' };
  if (s === 'Approved') return { label: 'Approved', bg: '#DCFCE7', color: '#15803D' };
  if (s === 'Rejected') return { label: 'Rejected', bg: '#FEE2E2', color: '#B91C1C' };
  if (s === 'Returned') return { label: 'Action needed', bg: '#FFEDD5', color: '#C2410C' };
  if (s === 'Processing' || s === 'Applied') return { label: 'With embassy', bg: '#E0E7FF', color: '#4338CA' };
  return { label: 'Under review', bg: '#DBEAFE', color: '#1D4ED8' };
};

// Lowest MBGO service fee (incl. GST on it) across options -- shown as
// "Starting from ₹X + Government Fees". Null when no service fee is set up.
export const getVisaServiceFeeFrom = (visa: Visa, card?: VisaCard): number | null => {
  const cards = card ? [card] : visa.visas || [];
  const fees: number[] = [];
  for (const c of cards) {
    const count = c.validityEntries?.length || 1;
    for (let i = 0; i < count; i++) {
      const f = previewVisaFee(visa, c, i, false);
      if (f.serviceCharge > 0) fees.push(f.serviceCharge + f.gst);
    }
  }
  return fees.length ? Math.min(...fees) : null;
};
