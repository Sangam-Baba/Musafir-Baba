// @ts-check
/** PayU adapter (S07-T05): amounts, hashes (same as the existing integration), reverse hash, API client against a fake PayU. */
import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  apiHash,
  createPayuClient,
  expectedResponseHash,
  merchantFromEnv,
  paymentUrl,
  requestHash,
  responseHashValid,
  statusOf,
  toPaise,
  toRupees,
} from '../../src/b2b/modules/payments/index.js';

const m = { key: 'gtKFFx', salt: 'eCwWELxi', env: /** @type {const} */ ('test') };
const sha = (/** @type {string} */ s) => createHash('sha512').update(s).digest('hex');

describe('amounts', () => {
  it('paise ↔ PayU rupees with two decimals', () => {
    expect(toRupees(99750)).toBe('997.50');
    expect(toRupees(100)).toBe('1.00');
    expect(toRupees(5)).toBe('0.05');
    expect(toPaise('997.50')).toBe(99750);
    expect(toPaise('997.5')).toBe(99750);
    expect(toPaise('997')).toBe(99700);
    for (const bad of ['', 'abc', '1.234', '-5', null]) expect(toPaise(bad)).toBeNaN();
    expect(() => toRupees(0)).toThrow();
    expect(() => toRupees(10.5)).toThrow();
  });
});

describe('hashes', () => {
  const req = {
    txnid: 'B2BH7KQ2M9XA',
    amount: '997.50',
    productinfo: 'Hotel booking MBO-1234-5678',
    firstname: 'Asha',
    email: 'asha@example.com',
    udf1: 'intent-1',
  };
  it('request hash = the formula the existing website code uses', () => {
    // exactly as backend/src/controllers/payment.controller.js builds it (read, never imported)
    const [udf1, udf2, udf3, udf4, udf5] = ['intent-1', '', '', '', ''];
    const existing = `${m.key}|${req.txnid}|${req.amount}|${req.productinfo}|${req.firstname}|${req.email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${m.salt}`;
    expect(requestHash(req, m)).toBe(sha(existing));
  });

  it('response hash: valid only when every field matches; constant-time check; additional charges included', () => {
    const resp = { ...req, status: 'success', mihpayid: '403993715531077182' };
    const hash = expectedResponseHash(resp, m);
    const [udf1, udf2, udf3, udf4, udf5] = ['intent-1', '', '', '', ''];
    const reverse = `${m.salt}|success||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${req.email}|${req.firstname}|${req.productinfo}|${req.amount}|${req.txnid}|${m.key}`;
    expect(hash).toBe(sha(reverse));
    expect(responseHashValid({ ...resp, hash }, m)).toBe(true);
    expect(responseHashValid({ ...resp, hash: hash.toUpperCase() }, m)).toBe(true);
    expect(responseHashValid({ ...resp, amount: '9.75', hash }, m)).toBe(false); // amount changed in the browser
    expect(responseHashValid({ ...resp, status: 'failure', hash }, m)).toBe(false);
    expect(responseHashValid({ ...resp, hash: 'abc' }, m)).toBe(false);
    expect(responseHashValid({ ...resp }, m)).toBe(false);
    const withCharges = { ...resp, additionalCharges: '19.95' };
    expect(
      responseHashValid(
        {
          ...withCharges,
          hash: sha(`19.95|${reverse}`),
        },
        m,
      ),
    ).toBe(true);
  });

  it('API hash and PayU statuses', () => {
    expect(apiHash('verify_payment', 'B2BH1', m)).toBe(sha('gtKFFx|verify_payment|B2BH1|eCwWELxi'));
    expect([
      statusOf('success'),
      statusOf('captured'),
      statusOf('pending'),
      statusOf('failure'),
      statusOf('userCancelled'),
      statusOf('weird'),
    ]).toEqual(['SUCCESS', 'SUCCESS', 'PENDING', 'FAILURE', 'FAILURE', 'UNKNOWN']);
  });
});

describe('client', () => {
  /** @param {Record<string, any>} answer */
  const fakePayu = (answer, status = 200) => {
    /** @type {{ url: string, body: URLSearchParams }[]} */
    const calls = [];
    const f = /** @type {typeof fetch} */ (
      async (url, init) => {
        calls.push({ url: String(url), body: /** @type {URLSearchParams} */ (init?.body) });
        return new Response(JSON.stringify(answer), { status, headers: { 'content-type': 'application/json' } });
      }
    );
    return { f, calls };
  };

  it('verify: our txn id, the API hash, the answer reduced to status / PayU id / amount', async () => {
    const { f, calls } = fakePayu({
      status: 1,
      transaction_details: { B2BH1: { mihpayid: '4039', status: 'success', amt: '997.50', mode: 'UPI' } },
    });
    const r = await createPayuClient({ merchant: m, fetch: f }).verify('B2BH1');
    expect(r).toEqual({ status: 'SUCCESS', txnid: 'B2BH1', mihpayid: '4039', amountPaise: 99750, mode: 'UPI' });
    expect(calls[0]?.url).toBe('https://test.payu.in/merchant/postservice?form=2');
    expect(Object.fromEntries(calls[0]?.body ?? [])).toMatchObject({
      key: 'gtKFFx',
      command: 'verify_payment',
      var1: 'B2BH1',
      hash: apiHash('verify_payment', 'B2BH1', m),
    });
    const missing = fakePayu({ status: 0, transaction_details: { B2BH2: { status: 'Not Found' } } });
    expect((await createPayuClient({ merchant: m, fetch: missing.f }).verify('B2BH2')).status).toBe('NOT_FOUND');
  });

  it('refund with our refund id; refund status; settlement lines; PayU errors surface', async () => {
    const refund = fakePayu({ status: 1, msg: 'Refund Request Queued', request_id: '1234567' });
    expect(
      await createPayuClient({ merchant: m, fetch: refund.f }).refund({ mihpayid: '4039', refundId: 'RF-1', amountPaise: 50000 }),
    ).toEqual({ accepted: true, requestId: '1234567', message: 'Refund Request Queued' });
    expect(Object.fromEntries(refund.calls[0]?.body ?? [])).toMatchObject({
      command: 'cancel_refund_transaction',
      var1: '4039',
      var2: 'RF-1',
      var3: '500.00',
    });
    const st = fakePayu({ status: 1, transaction_details: { 1234567: { 4039: { status: 'success' } } } });
    expect((await createPayuClient({ merchant: m, fetch: st.f }).refundStatus('1234567')).status).toBe('SUCCESS');
    const settle = fakePayu({
      status: 1,
      Txn_details: [
        {
          txnid: 'B2BH1',
          payuid: '4039',
          transaction_amount: '997.50',
          merchant_service_fee: '19.95',
          merchant_service_tax: '3.59',
          merchant_net_amount: '973.96',
          utr_number: 'UTR1',
          settlement_date: '2026-11-20 10:00:00',
          action: 'capture',
        },
      ],
    });
    expect(await createPayuClient({ merchant: m, fetch: settle.f }).settlements('2026-11-20')).toEqual([
      {
        txnid: 'B2BH1',
        mihpayid: '4039',
        amountPaise: 99750,
        feePaise: 1995,
        taxPaise: 359,
        settledPaise: 97396,
        utr: 'UTR1',
        action: 'capture',
        settledOn: '2026-11-20',
      },
    ]);
    const down = fakePayu({}, 503);
    await expect(createPayuClient({ merchant: m, fetch: down.f }).verify('B2BH1')).rejects.toThrow(/503/);
  });

  it('merchant from the existing settings; none → payments stay off; live vs test address', () => {
    expect(merchantFromEnv({})).toBeNull();
    expect(merchantFromEnv({ PAYU_KEY: 'k', PAYU_SALT: 's', PAYU_ENV: 'prod' })).toEqual({ key: 'k', salt: 's', env: 'prod' });
    expect(merchantFromEnv({ PAYU_KEY: 'k', PAYU_SALT: 's' })?.env).toBe('test');
    expect(paymentUrl({ ...m, env: 'prod' })).toBe('https://secure.payu.in/_payment');
    expect(paymentUrl(m)).toBe('https://test.payu.in/_payment');
  });
});
