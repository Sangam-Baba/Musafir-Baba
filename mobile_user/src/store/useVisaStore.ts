import { create } from 'zustand';
import type { Visa, VisaApplication, VisaDocument, VisaEligibility, VisaFee, VisaTraveller } from '../api/visa.api';

export interface VisaSelection {
  selectedVisaId?: string;
  selectedValidityIndex: number;
  isExpress: boolean;
}

// 'new' = filling a fresh/unpaid application; 'fix' = correcting a Returned one.
export type VisaFlowMode = 'new' | 'fix';

const emptyEligibility: VisaEligibility = { purpose: '', travelDate: '', stayDuration: '', travellerCount: 1 };
const emptyTraveller = (): VisaTraveller => ({ firstName: '', lastName: '', dob: '', gender: '' });

// Shared state for the Visa screens (country -> type -> eligibility -> details
// -> documents -> review -> payment). Separate from the ride and tour stores.
interface VisaState {
  visa: Visa | null;
  selection: VisaSelection;
  eligibility: VisaEligibility;
  travellers: VisaTraveller[];
  contact: { email: string; phone: string };
  documents: VisaDocument[];
  // Server draft (created on the details step and saved after every change).
  application: VisaApplication | null;
  fee: VisaFee | null;
  mode: VisaFlowMode;
  // Application shown on the success / detail screen.
  viewedApp: VisaApplication | null;
  openVisa: (visa: Visa) => void;
  setVisa: (visa: Visa) => void;
  setSelection: (selection: Partial<VisaSelection>) => void;
  setEligibility: (eligibility: Partial<VisaEligibility>) => void;
  setTravellers: (travellers: VisaTraveller[]) => void;
  setContact: (contact: { email: string; phone: string }) => void;
  setDocuments: (documents: VisaDocument[]) => void;
  setSaved: (application: VisaApplication, fee?: VisaFee | null) => void;
  // Continue an existing application (from My Trips). `app.visaId` must be the populated visa.
  loadApplication: (app: VisaApplication) => void;
  setViewedApp: (app: VisaApplication | null) => void;
  // Ask My Trips to open on the Visa filter (set by "Go to My Applications").
  openTripsOnVisa: boolean;
  setOpenTripsOnVisa: (v: boolean) => void;
}

// Keeps one form per traveller in line with the chosen number of travellers.
export const resizeTravellers = (list: VisaTraveller[], count: number) =>
  Array.from({ length: count }, (_, i) => list[i] || emptyTraveller());

export const useVisaStore = create<VisaState>((set, get) => ({
  visa: null,
  selection: { selectedValidityIndex: 0, isExpress: false },
  eligibility: emptyEligibility,
  travellers: [emptyTraveller()],
  contact: { email: '', phone: '' },
  documents: [],
  application: null,
  fee: null,
  mode: 'new',
  viewedApp: null,
  // Opening a different country starts a fresh application.
  openVisa: (visa) => {
    if (get().visa?._id === visa._id && get().mode === 'new') {
      set({ visa: { ...get().visa, ...visa } });
      return;
    }
    set({
      visa,
      selection: { selectedVisaId: visa.visas?.[0]?._id, selectedValidityIndex: 0, isExpress: false },
      eligibility: emptyEligibility,
      travellers: [emptyTraveller()],
      documents: [],
      application: null,
      fee: null,
      mode: 'new',
    });
  },
  setVisa: (visa) => set({ visa }),
  setSelection: (selection) => set({ selection: { ...get().selection, ...selection } }),
  setEligibility: (eligibility) => set({ eligibility: { ...get().eligibility, ...eligibility } }),
  setTravellers: (travellers) => set({ travellers }),
  setContact: (contact) => set({ contact }),
  setDocuments: (documents) => set({ documents }),
  setSaved: (application, fee) => set({ application, documents: application.documents || [], ...(fee ? { fee } : {}) }),
  loadApplication: (app) => {
    const visa = typeof app.visaId === 'object' ? app.visaId : get().visa;
    const travellers = app.travellers?.length ? app.travellers.map((t) => ({ firstName: t.firstName, lastName: t.lastName, dob: t.dob, gender: t.gender })) : [emptyTraveller()];
    set({
      visa,
      selection: { selectedVisaId: app.selectedVisaId, selectedValidityIndex: app.selectedValidityIndex ?? 0, isExpress: !!app.isExpress },
      eligibility: {
        purpose: app.eligibility?.purpose || '',
        travelDate: app.eligibility?.travelDate || '',
        stayDuration: app.eligibility?.stayDuration || '',
        travellerCount: travellers.length || app.eligibility?.travellerCount || 1,
      },
      travellers,
      contact: { email: app.email || '', phone: app.phone || '' },
      documents: app.documents || [],
      application: app,
      fee: null,
      mode: app.applicationStatus === 'Returned' ? 'fix' : 'new',
    });
  },
  setViewedApp: (app) => set({ viewedApp: app }),
  openTripsOnVisa: false,
  setOpenTripsOnVisa: (v) => set({ openTripsOnVisa: v }),
}));
