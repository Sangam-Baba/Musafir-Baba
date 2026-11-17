// @ts-check
/**
 * File templates for `npm run b2b:gen-module`. Each generated module starts with one sample
 * entity ("item") owned by an organisation — rename and extend it for the real domain.
 */

/** @param {string} kebab */
const pascal = (kebab) =>
  kebab
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
/** @param {string} kebab */
const snake = (kebab) => kebab.replaceAll('-', '_');

/**
 * @param {string} name   kebab-case module name
 * @param {string} prefix collection prefix without underscore, e.g. 'htl'
 * @returns {Record<string, string>} path (relative to backend/) → content
 */
export function moduleFiles(name, prefix) {
  const P = pascal(name);
  const collection = `${prefix}_${snake(name)}_items`;
  const dir = `src/b2b/modules/${name}`;
  return {
    [`${dir}/index.js`]: `// @ts-check
/** PUBLIC interface of the ${name} module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { createRoutes } from './routes.js';
export { create${P}Service } from './${name}.service.js';
export { ITEMS_COLLECTION } from './models/item.model.js';
`,
    [`${dir}/permissions.js`]: `// @ts-check
/** Permissions this module declares. Add PERMISSION_CATALOGUE to src/b2b/permission-catalogue.js. */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('${P}', {
  itemRead: { code: '${name}.item.read', description: 'See ${name} items', orgTypes: ['CLIENT', 'HOTEL'] },
  itemCreate: { code: '${name}.item.create', description: 'Create ${name} items', orgTypes: ['CLIENT', 'HOTEL'] },
});
`,
    [`${dir}/events.js`]: `// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only. */
export const EVENTS = /** @type {const} */ ({
  itemCreated: '${name}.item.created',
});
`,
    [`${dir}/domain/item.js`]: `// @ts-check
/** Pure rules for items — no Express, no Mongoose, no network. */
import { DomainError } from '../../../core/errors.js';

/**
 * @param {string} raw
 * @returns {string}
 */
export function normaliseItemName(raw) {
  const name = raw.trim().replace(/\\s+/g, ' ');
  if (name.length === 0) throw new DomainError('ITEM_NAME_EMPTY');
  return name;
}
`,
    [`${dir}/models/item.model.js`]: `// @ts-check
/** Owned by an organisation → tenant model (every query must be scoped by orgId). */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const ITEMS_COLLECTION = '${collection}';

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 200 },
  },
  { timestamps: true, versionKey: false },
);

export const ${P}Item = defineTenantModel('${P}Item', schema, ITEMS_COLLECTION, ['orgId']);
`,
    [`${dir}/repository.js`]: `// @ts-check
/** All database access for this module. The org always comes from ctx, never from input. */
import { ForbiddenError } from '../../core/errors.js';
import { ${P}Item } from './models/item.model.js';

/** @typedef {{ id: string, name: string }} ItemDto */

/** @param {import('../../core/context.js').RequestContext} ctx */
function orgIdOf(ctx) {
  if (ctx.actor.type !== 'member') throw new ForbiddenError();
  return ctx.actor.orgId;
}

/** @param {{ _id: unknown, name: string }} doc @returns {ItemDto} */
const toDto = (doc) => ({ id: String(doc._id), name: doc.name });

/** Repository for items; every query is scoped to the caller's organisation. */
export function create${P}Repository() {
  return {
    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} name */
    async create(ctx, name) {
      const doc = await ${P}Item.create({ orgId: orgIdOf(ctx), name });
      return toDto(doc);
    },
    /** @param {import('../../core/context.js').RequestContext} ctx */
    async list(ctx) {
      const docs = await ${P}Item.find({ orgId: orgIdOf(ctx) }).sort({ createdAt: -1 }).limit(100).lean();
      return docs.map(toDto);
    },
  };
}
`,
    [`${dir}/${name}.service.js`]: `// @ts-check
/** Use cases: load → authorise → domain → save → events. */
import { normaliseItemName } from './domain/item.js';

/** @param {{ repository: ReturnType<typeof import('./repository.js').create${P}Repository> }} deps */
export function create${P}Service(deps) {
  return {
    /** @param {import('../../core/context.js').RequestContext} ctx @param {{ name: string }} input */
    createItem: (ctx, input) => deps.repository.create(ctx, normaliseItemName(input.name)),
    /** @param {import('../../core/context.js').RequestContext} ctx */
    listItems: (ctx) => deps.repository.list(ctx),
  };
}
`,
    [`${dir}/validators.js`]: `// @ts-check
import { z } from 'zod';

export const CreateItemBody = z.strictObject({ name: z.string().min(1).max(200) });
`,
    [`${dir}/routes.js`]: `// @ts-check
/** HTTP layer: permission → validate → service → JSON. No business logic here. */
import express from 'express';

import { contextOf } from '../../core/http/context-middleware.js';
import { requirePermission } from '../../core/http/permissions.js';
import { validate } from '../../core/http/validate.js';
import { PERMISSIONS } from './permissions.js';
import { CreateItemBody } from './validators.js';

/** @param {ReturnType<typeof import('./${name}.service.js').create${P}Service>} service */
export function createRoutes(service) {
  const router = express.Router();
  router.get('/items', requirePermission(PERMISSIONS.itemRead), (_req, res, next) => {
    service.listItems(contextOf(res)).then((data) => res.json({ data }), next);
  });
  router.post('/items', requirePermission(PERMISSIONS.itemCreate), validate({ body: CreateItemBody }), (_req, res, next) => {
    service.createItem(contextOf(res), res.locals.input.body).then((item) => res.status(201).json(item), next);
  });
  return router;
}
`,
    [`${dir}/README.md`]: `# Module: ${name}

Generated by \`npm run b2b:gen-module\`. Replace the sample "item" with the real domain.

| | |
| --- | --- |
| **Collections** | \`${collection}\` (prefix \`${prefix}_\`) |
| **Tenant** | \`orgId\` (tenant guard on) |
| **Public interface** | \`index.js\` only |

## Migration to add to \`src/b2b/migrations/index.js\`

\`\`\`js
{
  id: 'NNNN-${snake(name).replaceAll('_', '-')}-items',
  description: '${name} items',
  up: async (ctx) => {
    await ctx.createCollection('${collection}');
    await ctx.createIndex('${collection}', { orgId: 1, createdAt: -1 }, { name: 'org_recent' });
  },
},
\`\`\`
`,
    [`tests/b2b/modules/${name}.test.js`]: `// @ts-check
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createMigrationContext } from '../../../src/b2b/core/db/migrations.js';
import { contextMiddleware } from '../../../src/b2b/core/http/context-middleware.js';
import { notFoundHandler, problemHandler } from '../../../src/b2b/core/http/problem.js';
import { createLogger } from '../../../src/b2b/core/logger.js';
import { create${P}Repository } from '../../../src/b2b/modules/${name}/repository.js';
import { create${P}Service, createRoutes, ITEMS_COLLECTION, PERMISSIONS } from '../../../src/b2b/modules/${name}/index.js';
import { startServer } from '../helpers/http.js';
import { startMongo } from '../helpers/mongo.js';

const quiet = createLogger({ write: () => {} });
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

/** @param {string} orgId @param {string[]} permissions */
function appFor(orgId, permissions) {
  const app = express();
  const r = express.Router();
  r.use(express.json());
  r.use(contextMiddleware({ channel: 'B2B_PORTAL', logger: quiet, authenticate: async () => ({ type: 'member', userId: 'u', orgId, permissions }) }));
  r.use(createRoutes(create${P}Service({ repository: create${P}Repository() })));
  r.use(notFoundHandler(), problemHandler(quiet));
  app.use((_req, res, next) => { res.locals.requestId = 'test'; next(); });
  app.use('/api/v1/${name}', r);
  return app;
}

beforeAll(async () => {
  mongo = await startMongo();
  await createMigrationContext(mongo.db).createCollection(ITEMS_COLLECTION);
});
afterAll(async () => mongo.stop());

describe('${name} module (generated)', () => {
  const all = [PERMISSIONS.itemRead, PERMISSIONS.itemCreate];

  it('creates and lists items for the caller\\'s org only', async () => {
    const a = await startServer(appFor('org-a', all));
    const b = await startServer(appFor('org-b', all));
    try {
      expect((await a.post('/api/v1/${name}/items', { name: '  Deluxe   Room ' })).body).toMatchObject({ name: 'Deluxe Room' });
      expect((await a.get('/api/v1/${name}/items')).body.data).toHaveLength(1);
      expect((await b.get('/api/v1/${name}/items')).body.data).toEqual([]);
    } finally {
      await a.close();
      await b.close();
    }
  });

  it('enforces permissions and validation', async () => {
    const readOnly = await startServer(appFor('org-a', [PERMISSIONS.itemRead]));
    try {
      expect((await readOnly.post('/api/v1/${name}/items', { name: 'x' })).status).toBe(403);
    } finally {
      await readOnly.close();
    }
    const writer = await startServer(appFor('org-a', all));
    try {
      expect((await writer.post('/api/v1/${name}/items', { name: 'x', orgId: 'org-b' })).status).toBe(400);
      expect((await writer.post('/api/v1/${name}/items', { name: { $ne: null } })).status).toBe(400);
    } finally {
      await writer.close();
    }
  });
});
`,
  };
}
