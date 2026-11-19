// @ts-check
/** Stage 10 wiring: B2B client onboarding — client categories (registration lives with the hotel one). */
import express from 'express';

import { createClientCategoriesService } from '../modules/organizations/index.js';
import { clientCategoryRoutes } from './client-categories-admin.js';

/** @param {import('../core/clock.js').Clock} clock */
export function stage10Routes(clock) {
  const router = express.Router();
  router.use(clientCategoryRoutes({ categories: createClientCategoriesService({ clock }) }));
  return router;
}
