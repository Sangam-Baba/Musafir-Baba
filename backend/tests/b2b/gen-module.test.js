// @ts-check
import { describe, expect, it } from 'vitest';

import { checkB2BSource } from '../../scripts/b2b/code-rules.js';
import { checkSecrets } from '../../scripts/b2b/guards-lib.js';
import { moduleFiles } from '../../scripts/b2b/gen-module-templates.js';

describe('module generator templates', () => {
  const files = moduleFiles('hotel-catalog', 'htl');

  it('creates the standard anatomy with a prefixed tenant collection and a test', () => {
    expect(Object.keys(files).sort()).toEqual([
      'src/b2b/modules/hotel-catalog/README.md',
      'src/b2b/modules/hotel-catalog/domain/item.js',
      'src/b2b/modules/hotel-catalog/events.js',
      'src/b2b/modules/hotel-catalog/hotel-catalog.service.js',
      'src/b2b/modules/hotel-catalog/index.js',
      'src/b2b/modules/hotel-catalog/models/item.model.js',
      'src/b2b/modules/hotel-catalog/permissions.js',
      'src/b2b/modules/hotel-catalog/repository.js',
      'src/b2b/modules/hotel-catalog/routes.js',
      'src/b2b/modules/hotel-catalog/validators.js',
      'tests/b2b/modules/hotel-catalog.test.js',
    ]);
    expect(files['src/b2b/modules/hotel-catalog/models/item.model.js']).toContain("'htl_hotel_catalog_items'");
    expect(files['src/b2b/modules/hotel-catalog/models/item.model.js']).toContain('defineTenantModel(');
  });

  it('every generated source file passes the B2B code rules and has no secrets', () => {
    for (const [rel, content] of Object.entries(files)) {
      if (!rel.endsWith('.js')) continue;
      if (rel.startsWith('src/b2b/')) expect(checkB2BSource(rel.slice('src/b2b/'.length), content)).toEqual([]);
      expect(checkSecrets(rel, content)).toEqual([]);
    }
  });
});
