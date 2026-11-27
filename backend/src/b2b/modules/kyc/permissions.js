// @ts-check
/** Permissions of the kyc module (verification of hotels now, B2B clients in Stage 10). */
import { definePermissions } from '../../core/permissions.js';

const BUSINESS = /** @type {const} */ (['CLIENT', 'HOTEL', 'BUS_OPERATOR']);

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Verification (KYC)', {
  applicationRead: {
    code: 'kyc.application.read',
    description: "See the organisation's verification status and documents",
    orgTypes: BUSINESS,
  },
  applicationSubmit: {
    code: 'kyc.application.submit',
    description: 'Fill in and submit the verification details, documents and bank account',
    orgTypes: BUSINESS,
    sensitive: true,
  },
  platformRead: {
    code: 'platform.kyc.read',
    description: 'MusafirBaba admin: see the verification queue and applications',
    orgTypes: ['PLATFORM'],
  },
  platformReview: {
    code: 'platform.kyc.review',
    description: 'MusafirBaba admin: review documents and approve or reject applications',
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
  platformSecondApproval: {
    code: 'platform.kyc.approve',
    description: 'MusafirBaba admin: approve any application on their own, including high-risk ones',
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
});
