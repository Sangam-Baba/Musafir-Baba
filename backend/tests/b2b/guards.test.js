// @ts-check
import { describe, expect, it } from 'vitest';

import { checkB2BSource, checkExistingSource } from '../../scripts/b2b/code-rules.js';
import { checkAppJs, checkLockfile, checkPackageJson, checkPaths } from '../../scripts/b2b/guards-lib.js';

describe('checkPaths — B2B branches may only change their own folders and B1–B3', () => {
  it('accepts new B2B files, docs and the approved edits', () => {
    expect(checkPaths([
      { status: 'A', path: 'backend/src/b2b/modules/hotel-catalog/index.js' },
      { status: 'A', path: 'backend/tests/b2b/x.test.js' },
      { status: 'M', path: 'docs/plan/README.md' },
      { status: 'A', path: 'docs/adr/0001-isolated-b2b-folder.md' },
      { status: 'M', path: 'backend/src/app.js' },
      { status: 'M', path: 'backend/package.json' },
      { status: 'M', path: 'backend/package-lock.json' },
      { status: 'A', path: '.github/workflows/b2b-guards.yml' },
      { status: 'D', path: 'planning folder/musafirbaba-b2b-plan/README.md' },
    ])).toEqual([]);
  });

  it.each([
    ['M', 'backend/src/routes/index.js'],
    ['M', 'backend/src/models/User.js'],
    ['A', 'backend/src/routes/hotels.routes.js'],
    ['M', 'backend/Dockerfile'],
    ['M', '.github/workflows/deploy-musafirbabaserver.yml'],
    ['M', 'frontend/src/app/layout.tsx'],
    ['M', 'mobile/app.json'],
    ['D', 'backend/src/app.js'],
    ['D', 'planning folder/other-notes.md'],
  ])('rejects %s %s', (status, path) => {
    expect(checkPaths([{ status, path }])).toHaveLength(1);
  });
});

describe('checkAppJs — B1 may only add the mount lines', () => {
  const base = 'import express from "express";\nconst app = express();\napp.use(cors());\napp.use(express.json());\nexport default app;\n';
  const withMount = 'import express from "express";\nimport { mountB2B } from "./b2b/mount.js";\nconst app = express();\napp.use(cors());\n\nmountB2B(app);\n\napp.use(express.json());\nexport default app;\n';

  it('accepts the mount lines', () => expect(checkAppJs(base, withMount)).toEqual([]));
  it('rejects any other change', () => {
    expect(checkAppJs(base, withMount.replace('express.json()', 'express.json({ limit: "1kb" })'))).toHaveLength(1);
    expect(checkAppJs(base, withMount.replace('app.use(cors());\n', ''))).toHaveLength(1);
    expect(checkAppJs(base, withMount + 'app.use(somethingNew);\n')).toHaveLength(1);
  });
});

describe('checkPackageJson — B2 may only add', () => {
  const base = { name: 'backend', type: 'module', scripts: { start: 'node src/server.js' }, dependencies: { express: '^5.1.0' }, devDependencies: { nodemon: '^3' } };

  it('accepts new dev deps and b2b scripts', () => {
    const head = { ...base, scripts: { ...base.scripts, 'test:b2b': 'vitest', 'b2b:worker': 'node x' }, devDependencies: { ...base.devDependencies, vitest: '3.2.7' } };
    expect(checkPackageJson(base, head)).toEqual([]);
  });

  it('rejects changed existing versions, scripts, fields or oddly named scripts', () => {
    expect(checkPackageJson(base, { ...base, dependencies: { express: '^5.2.0' } })).toHaveLength(1);
    expect(checkPackageJson(base, { ...base, scripts: { start: 'node dist/server.js' } })).toHaveLength(1);
    expect(checkPackageJson(base, { ...base, type: 'commonjs' })).toHaveLength(1);
    expect(checkPackageJson(base, { ...base, scripts: { ...base.scripts, build: 'tsc' } })).toHaveLength(1);
  });
});

describe('checkLockfile — B3: no existing package may change', () => {
  const base = { packages: { '': { version: '1.0.0' }, 'node_modules/qs': { version: '6.13.0' } } };

  it('accepts pure additions and reports runtime ones', () => {
    const head = { packages: { ...base.packages, 'node_modules/vitest': { version: '3.2.7', dev: true }, 'node_modules/pino': { version: '9.0.0' } } };
    expect(checkLockfile(base, head)).toEqual({ problems: [], added: ['node_modules/vitest', 'node_modules/pino'], addedRuntime: ['node_modules/pino'] });
  });

  it('rejects a version bump or removal', () => {
    expect(checkLockfile(base, { packages: { '': { version: '1.0.0' }, 'node_modules/qs': { version: '6.14.0' } } }).problems).toEqual(['lockfile: node_modules/qs 6.13.0 → 6.14.0']);
    expect(checkLockfile(base, { packages: { '': { version: '1.0.0' } } }).problems).toEqual(['lockfile: node_modules/qs removed']);
  });
});

describe('code rules for src/b2b', () => {
  const ok = "// @ts-check\nimport { b2bMongoose } from '../core/db/connection.js';\n";

  it('accepts clean code', () => expect(checkB2BSource('modules/x/index.js', ok)).toEqual([]));

  it.each([
    ['transactions', 'await session.withTransaction(fn);'],
    ['startSession', 'const s = await b2bMongoose.startSession();'],
    ['change streams', 'Model.watch();'],
    ['default export', 'export default router;'],
    ['require', "const x = require('x');"],
    ['Ably', "import Ably from 'ably';"],
    ['current time', 'const now = new Date();'],
    ['Date.now', 'const t = Date.now();'],
    ['default mongoose', "import mongoose from 'mongoose';"],
    ['raw model()', "b2bMongoose.model('X', schema);"],
    ['import of existing code', "import { User } from '../../../models/User.js';"],
  ])('rejects %s', (_label, line) => {
    expect(checkB2BSource('modules/x/index.js', ok + line + '\n').length).toBeGreaterThan(0);
  });

  it('requires // @ts-check on the first line', () => {
    expect(checkB2BSource('a.js', "import x from './x.js';\n")).toEqual([{ file: 'a.js', line: 1, rule: 'first line must be // @ts-check' }]);
  });

  it('keeps legacy-read read-only', () => {
    expect(checkB2BSource('legacy-read/index.js', "// @ts-check\ndb.collection('users').updateOne({}, {});\n")).toHaveLength(1);
  });

  it('allows the clock and connection files their exceptions', () => {
    expect(checkB2BSource('core/clock.js', '// @ts-check\nexport const now = () => new Date();\n')).toEqual([]);
    expect(checkB2BSource('core/db/connection.js', "// @ts-check\nimport mongoose from 'mongoose';\n")).toEqual([]);
  });
});

describe('existing code must not depend on B2B code', () => {
  it('allows only app.js → b2b/mount.js', () => {
    expect(checkExistingSource('app.js', 'import { mountB2B } from "./b2b/mount.js";')).toEqual([]);
    expect(checkExistingSource('app.js', 'import { x } from "./b2b/routes/v1.js";')).toHaveLength(1);
    expect(checkExistingSource('routes/index.js', 'import { mountB2B } from "../b2b/mount.js";')).toHaveLength(1);
  });
});
