// @ts-check
/** Shared pieces of the bus routes (Stage 18): input shapes and "who is the signed-in bus operator". */
import { z } from 'zod';

import { systemScope } from '../core/db/tenant-plugin.js';
import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { CityRecord } from '../modules/hotel-catalog/index.js';
import { OrganizationRecord } from '../modules/organizations/index.js';

export const Id = z.string().regex(/^[a-f0-9]{24}$/);
export const Params = z.strictObject({ id: Id });
export const Version = z.number().int().min(1);
export const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const ReviewBody = z.strictObject({
  move: z.enum(['approve', 'requestChanges', 'suspend', 'reinstate', 'retire']),
  note: z.string().trim().max(500).nullish(),
});
export const ReviewStatus = z.enum(['SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'SUSPENDED', 'DRAFT', 'RETIRED']);

/** The signed-in bus operator. @param {import('express').Response} res */
export function operatorOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'member' || actor.orgType !== 'BUS_OPERATOR') throw new ForbiddenError();
  return { orgId: actor.orgId, userId: actor.userId };
}

/** @param {import('express').Response} res */
export const input = (res) => /** @type {{ params: any, query: any, body: any }} */ (res.locals.input);

const NAMES_SCOPE = systemScope('bus review: operator company names', { routine: true });

/** Adds each operator's company name and reference to the review queue. @template {{ operatorOrgId: string }} T @param {T[]} list */
export async function withOperatorNames(list) {
  const orgs = await OrganizationRecord.find(
    { _id: { $in: [...new Set(list.map((v) => v.operatorOrgId))] } },
    { displayName: 1, reference: 1 },
  )
    .setOptions(NAMES_SCOPE)
    .lean();
  const byId = new Map(orgs.map((o) => [String(o._id), o]));
  return list.map((v) => ({
    ...v,
    operatorName: byId.get(v.operatorOrgId)?.displayName ?? null,
    operatorRef: byId.get(v.operatorOrgId)?.reference ?? null,
  }));
}

/** Bus companies' names and whether they may sell (status ACTIVE). @param {string[]} ids */
export async function busOperators(ids) {
  const orgs = await OrganizationRecord.find({ _id: { $in: ids }, type: 'BUS_OPERATOR' }, { displayName: 1, status: 1 })
    .setOptions(NAMES_SCOPE)
    .lean();
  return new Map(orgs.map((o) => [String(o._id), { name: o.displayName, active: o.status === 'ACTIVE' }]));
}

/** The GST state of a city from the shared city list (read only). @param {string} id */
export const cityStateOf = async (id) =>
  /^[a-f0-9]{24}$/.test(id) ? ((await CityRecord.findById(id, { stateCode: 1 }).lean())?.stateCode ?? null) : null;
