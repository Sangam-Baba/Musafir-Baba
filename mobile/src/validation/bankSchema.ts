import { z } from 'zod';

export const bankDetailsSchema = z.object({
  accountHolderName: z.string().min(2, 'Name is required'),
  bankName: z.string().min(2, 'Bank Name is required'),
  branchName: z.string().min(2, 'Branch Name is required'),
  accountNumber: z.string().min(5, 'Invalid Account Number').regex(/^[0-9]+$/, 'Must be numeric'),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC Code format (e.g. SBIN0123456)'),
});

export type BankDetailsFormData = z.infer<typeof bankDetailsSchema>;
