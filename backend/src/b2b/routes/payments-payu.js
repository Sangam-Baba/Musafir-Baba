// @ts-check
/**
 * PayU browser return for the new system (plan Stage 07 §3.3, §5) — its own address on the new API; the existing
 * `/api/payment/success|failure` routes and the PayU dashboard are untouched.
 * POST /payments/payu/callback  (form post from PayU; public — trusted only after the hash AND PayU's verify API)
 * The browser is then sent to the page that started the payment, with the outcome in the query.
 */
import express from 'express';

import { publicRoute } from '../core/http/permissions.js';

/**
 * @param {{ payments: ReturnType<typeof import('../modules/payments/index.js').createPayments>, publicUrl: string }} deps
 */
export function payuCallbackRoutes(deps) {
  const router = express.Router();
  router.post('/payments/payu/callback', publicRoute(), express.urlencoded({ extended: false, limit: '32kb' }), (req, res, next) => {
    const posted = /** @type {Record<string, string | undefined>} */ (req.body ?? {});
    deps.payments.handleCallback(posted).then((r) => {
      const target = new URL(r.redirect ?? `${deps.publicUrl.replace(/\/$/, '')}/business`);
      target.searchParams.set('payment', r.status.toLowerCase());
      if (posted.txnid) target.searchParams.set('txn', String(posted.txnid).slice(0, 40));
      res.redirect(303, target.toString());
    }, next);
  });
  return router;
}
