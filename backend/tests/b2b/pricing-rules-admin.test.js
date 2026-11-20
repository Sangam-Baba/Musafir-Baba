// @ts-check
/** Margin rule lifecycle (S05-T04): draft → submit → a second person approves → active; replace, reject, retire, history. */
import { describe, expect, it } from 'vitest';

import { createMarginRulesService, MarginRuleRecord, nightMargin, seedDefaultMarginRules } from '../../src/b2b/modules/pricing/index.js';
import { asStaff, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const app = useInventoryApp({ clock, models: [MarginRuleRecord] });

const MAKER = asStaff('m1:pricing.rules.read,pricing.rules.propose');
const MAKER2 = asStaff('m2:pricing.rules.read,pricing.rules.propose');
const CHECKER = asStaff('c1:pricing.rules.read,pricing.rules.approve');
/** Someone who can do both — still can't approve their own rule. */
const BOTH = asStaff('b1:pricing.rules.read,pricing.rules.propose,pricing.rules.approve');
const READER = asStaff('r1:pricing.rules.read');
const v = (/** @type {number} */ n) => ({ 'if-match': `"${n}"` });

const goa = {
  name: 'Goa website',
  priority: 5,
  match: { channels: ['WEBSITE'], stayFrom: '2026-12-20', stayTo: '2027-01-05' },
  adjustment: { type: 'FIXED_PER_NIGHT', value: 40000 },
};
const ctx = /** @type {const} */ ({ channel: 'WEBSITE', hotelOrgId: 'h', propertyId: 'p' });

/** @param {Record<string, string>} who @param {object} [body] */
async function draft(who = MAKER, body = goa) {
  const res = await app.admin.post('/api/v1/admin/margin-rules', body, who);
  expect(res.status).toBe(201);
  return res.body;
}

describe('maker–checker', () => {
  it('draft → submit → another person approves → in force, with the event and full history', async () => {
    const d = await draft();
    expect(d).toMatchObject({ status: 'DRAFT', createdBy: 'staff:m1', version: 1 });
    const s = await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/submit`, {}, { ...MAKER, ...v(1) });
    expect(s.body).toMatchObject({ status: 'PENDING_APPROVAL', submittedBy: 'staff:m1', version: 2 });
    expect((await createMarginRulesService().activeRules()).map((r) => r.id)).not.toContain(d.id); // not before approval
    const a = await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/approve`, { note: 'ok for peak season' }, { ...CHECKER, ...v(2) });
    expect(a.status).toBe(200);
    expect(a.body).toMatchObject({ status: 'ACTIVE', approvedBy: 'staff:c1', version: 3 });
    const rules = await createMarginRulesService().activeRules();
    expect(nightMargin(rules, ctx, { date: '2026-12-25', now: clock.now(), netPaise: 70000 }).ruleId).toBe(d.id);
    const stored = await MarginRuleRecord.findById(d.id).lean();
    expect(stored?.pendingEvents?.map((e) => e.type)).toEqual(['pricing.rule.activated']);
    const detail = await app.admin.get(`/api/v1/admin/margin-rules/${d.id}`, READER);
    expect(detail.body.history.map((/** @type {any} */ h) => [h.action, h.by, h.status])).toEqual([
      ['created', 'staff:m1', 'DRAFT'],
      ['submit', 'staff:m1', 'PENDING_APPROVAL'],
      ['approve', 'staff:c1', 'ACTIVE'],
    ]);
    expect(detail.headers.get('etag')).toBe('"3"');
  });

  it('the person who wrote or submitted a rule can never approve it, even with the permission', async () => {
    const d = await draft(BOTH);
    await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/submit`, {}, { ...BOTH, ...v(1) });
    const own = await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/approve`, {}, { ...BOTH, ...v(2) });
    expect(own.status).toBe(403);
    expect(own.body.code).toBe('SECOND_PERSON_REQUIRED');
    const d2 = await draft(MAKER2);
    await app.admin.post(`/api/v1/admin/margin-rules/${d2.id}/submit`, {}, { ...MAKER2, ...v(1) });
    expect((await app.admin.post(`/api/v1/admin/margin-rules/${d2.id}/approve`, {}, { ...BOTH, ...v(2) })).status).toBe(200);
  });

  it('proposers cannot approve, reject or retire; readers cannot write', async () => {
    const d = await draft();
    await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/submit`, {}, { ...MAKER, ...v(1) });
    expect((await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/approve`, {}, { ...MAKER2, ...v(2) })).status).toBe(403);
    expect((await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/reject`, { note: 'too high' }, { ...MAKER2, ...v(2) })).status).toBe(
      403,
    );
    expect((await app.admin.post('/api/v1/admin/margin-rules', goa, READER)).status).toBe(403);
    expect((await app.admin.get('/api/v1/admin/margin-rules', asStaff('x:platform.kyc.read'))).status).toBe(403);
  });

  it('sent back with a reason → DRAFT again, editable, resubmitted', async () => {
    const d = await draft();
    await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/submit`, {}, { ...MAKER, ...v(1) });
    expect((await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/reject`, {}, { ...CHECKER, ...v(2) })).status).toBe(400); // reason required
    const r = await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/reject`, { note: 'Use 300 instead' }, { ...CHECKER, ...v(2) });
    expect(r.body).toMatchObject({ status: 'DRAFT', submittedBy: null });
    const e = await app.admin.put(
      `/api/v1/admin/margin-rules/${d.id}`,
      { ...goa, adjustment: { type: 'FIXED_PER_NIGHT', value: 30000 } },
      { ...MAKER, ...v(3) },
    );
    expect(e.body.adjustment.value).toBe(30000);
    expect((await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/submit`, {}, { ...MAKER, ...v(4) })).body.status).toBe(
      'PENDING_APPROVAL',
    );
  });
});

describe('changes and safety', () => {
  it('only a draft can be edited; versions are checked (428 / 412)', async () => {
    const d = await draft();
    expect((await app.admin.put(`/api/v1/admin/margin-rules/${d.id}`, goa, MAKER)).status).toBe(428);
    expect((await app.admin.put(`/api/v1/admin/margin-rules/${d.id}`, goa, { ...MAKER, ...v(7) })).status).toBe(412);
    await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/submit`, {}, { ...MAKER, ...v(1) });
    const locked = await app.admin.put(`/api/v1/admin/margin-rules/${d.id}`, goa, { ...MAKER, ...v(2) });
    expect(locked.status).toBe(422);
    expect(locked.body.code).toBe('RULE_STATUS');
  });

  it('all problems at once; below the hotel rate only when allowed', async () => {
    const bad = await app.admin.post(
      '/api/v1/admin/margin-rules',
      { ...goa, priority: 5000, adjustment: { type: 'FIXED_PER_NIGHT', value: -100, minPaise: 5 } },
      MAKER,
    );
    expect(bad.status).toBe(422);
    expect(bad.body.code).toBe('MARGIN_RULE_INVALID');
    expect(bad.body.errors.map((/** @type {any} */ e) => e.code)).toEqual([
      'PRIORITY_INVALID',
      'BELOW_NET_NOT_ALLOWED',
      'BOUNDS_ONLY_FOR_PERCENT',
    ]);
    expect((await app.admin.post('/api/v1/admin/margin-rules', { ...goa, $where: 1 }, MAKER)).status).toBe(400);
  });

  it('a replacement takes over on approval and the old rule is retired with its own history line', async () => {
    await seedDefaultMarginRules({ clock });
    const old = await MarginRuleRecord.findOne({ key: 'default-website' }).lean();
    const d = await draft(MAKER, {
      name: 'Website default (₹300)',
      priority: 0,
      match: { channels: ['WEBSITE'] },
      adjustment: { type: 'FIXED_PER_NIGHT', value: 30000 },
      replaces: String(old?._id),
    });
    await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/submit`, {}, { ...MAKER, ...v(1) });
    await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/approve`, {}, { ...CHECKER, ...v(2) });
    const after = await MarginRuleRecord.findById(old?._id).lean();
    expect(after).toMatchObject({ status: 'RETIRED', retiredBy: 'staff:c1' });
    expect(after?.history.at(-1)).toMatchObject({ action: 'replaced', status: 'RETIRED' });
    expect(after?.pendingEvents?.map((e) => e.type)).toEqual(['pricing.rule.retired']);
    const rules = await createMarginRulesService().activeRules();
    expect(nightMargin(rules, ctx, { date: '2026-12-01', now: clock.now(), netPaise: 70000 })).toEqual({
      ruleId: d.id,
      marginPaise: 30000,
    });
  });

  it('even before the old rule is marked retired, prices already use the replacement', async () => {
    await seedDefaultMarginRules({ clock });
    const old = await MarginRuleRecord.findOne({ key: 'default-website' }).lean();
    // the replacement is ACTIVE but the second step (retiring the old one) never ran
    const [repl] = await MarginRuleRecord.create([
      {
        name: 'New',
        priority: 0,
        match: { channels: ['WEBSITE'] },
        adjustment: { type: 'FIXED_PER_NIGHT', value: 30000 },
        status: 'ACTIVE',
        createdBy: 'x',
        replaces: String(old?._id),
      },
    ]);
    const rules = await createMarginRulesService().activeRules();
    expect(rules.map((r) => r.id)).not.toContain(String(old?._id));
    expect(nightMargin(rules, ctx, { date: '2026-12-01', now: clock.now(), netPaise: 70000 }).ruleId).toBe(String(repl?._id));
  });

  it('a replacement must point at a rule in force', async () => {
    const d = await draft();
    const res = await app.admin.post('/api/v1/admin/margin-rules', { ...goa, replaces: d.id }, MAKER);
    expect(res.status).toBe(422);
    expect(res.body.errors[0].code).toBe('REPLACES_NOT_ACTIVE');
  });

  it('retire needs a reason and the approve permission; a draft can be discarded by its proposer', async () => {
    await seedDefaultMarginRules({ clock });
    const b2b = await MarginRuleRecord.findOne({ key: 'default-b2b' }).lean();
    expect(
      (await app.admin.post(`/api/v1/admin/margin-rules/${b2b?._id}/retire`, { note: 'no more b2b' }, { ...MAKER, ...v(1) })).status,
    ).toBe(403);
    const r = await app.admin.post(`/api/v1/admin/margin-rules/${b2b?._id}/retire`, { note: 'Pausing B2B sales' }, { ...CHECKER, ...v(1) });
    expect(r.body).toMatchObject({ status: 'RETIRED', retiredBy: 'staff:c1' });
    const d = await draft();
    expect((await app.admin.post(`/api/v1/admin/margin-rules/${d.id}/discard`, {}, { ...MAKER, ...v(1) })).body.status).toBe('RETIRED');
    const list = await app.admin.get('/api/v1/admin/margin-rules?status=RETIRED', READER);
    expect(list.body.data).toHaveLength(2);
  });
});
