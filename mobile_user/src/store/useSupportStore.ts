import { create } from 'zustand';
import type { SupportAttachment, SupportBooking, SupportIssue, SupportService, SupportTicket } from '../api/support.api';

// Help & Support flow state (service -> booking -> issue -> details -> review -> ticket).
interface SupportState {
  catalog: SupportService[];
  service: SupportService | null;
  booking: SupportBooking | null;
  issue: SupportIssue | null;
  quickOptions: string[];
  description: string;
  attachments: SupportAttachment[];
  contactMethod: 'CALL' | 'WHATSAPP';
  contactValue: string;
  expectedResolution: string;
  // Ticket shown on the ticket screen.
  ticketId: string | null;
  ticket: SupportTicket | null;
  setCatalog: (c: SupportService[]) => void;
  startService: (s: SupportService) => void;
  setBooking: (b: SupportBooking | null) => void;
  chooseIssue: (i: SupportIssue, description?: string) => void;
  patch: (p: Partial<Pick<SupportState, 'quickOptions' | 'description' | 'attachments' | 'contactMethod' | 'contactValue' | 'expectedResolution'>>) => void;
  openTicket: (id: string, ticket?: SupportTicket | null) => void;
}

const emptyForm = { booking: null, issue: null, quickOptions: [], description: '', attachments: [], expectedResolution: '' };

export const useSupportStore = create<SupportState>((set) => ({
  catalog: [],
  service: null,
  ...emptyForm,
  contactMethod: 'CALL',
  contactValue: '',
  ticketId: null,
  ticket: null,
  setCatalog: (catalog) => set({ catalog }),
  startService: (service) => set({ service, ...emptyForm }),
  setBooking: (booking) => set({ booking }),
  chooseIssue: (issue, description) => set((s) => ({ issue, quickOptions: [], description: description ?? (s.issue?.key === issue.key ? s.description : '') })),
  patch: (p) => set(p),
  openTicket: (ticketId, ticket = null) => set({ ticketId, ticket }),
}));
