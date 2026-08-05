import { z } from 'zod';

export const personalDetailsSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, 'Must be a valid 10-digit mobile number'),
  partnerType: z.string().min(1, 'Partner type is required'),
  agencyName: z.string().optional(),
  addressLine: z.string().min(5, 'Address is too short'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  pincode: z.string().regex(/^[0-9]{6}$/, 'Must be a valid 6-digit pincode'),
});

export type PersonalDetailsFormData = z.infer<typeof personalDetailsSchema>;
