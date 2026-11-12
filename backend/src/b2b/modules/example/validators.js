// @ts-check
import { z } from 'zod';

export const CreateItemBody = z.strictObject({ name: z.string().min(1).max(200) });
