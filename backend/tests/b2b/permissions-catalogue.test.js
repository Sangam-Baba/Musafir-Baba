// @ts-check
import { describe, expect, it } from 'vitest';

import { definePermissions, mergeCatalogues } from '../../src/b2b/core/permissions.js';
import { PERMISSION_CATALOGUE } from '../../src/b2b/permission-catalogue.js';

describe('definePermissions', () => {
  it('returns a code map and a catalogue with defaults', () => {
    const { codes, catalogue } = definePermissions('Team', {
      memberRead: { code: 'organizations.member.read', description: 'See team members', orgTypes: ['CLIENT'] },
    });
    expect(codes.memberRead).toBe('organizations.member.read');
    expect(catalogue).toEqual([
      { code: 'organizations.member.read', group: 'Team', description: 'See team members', orgTypes: ['CLIENT'], sensitive: false },
    ]);
  });

  it('refuses badly formed codes, unknown org types and missing descriptions', () => {
    expect(() => definePermissions('X', { a: { code: 'Bad Code', description: 'Something long', orgTypes: ['CLIENT'] } })).toThrow(
      /module.entity.action/,
    );
    expect(() => definePermissions('X', { a: { code: 'x.y.z', description: 'Something long', orgTypes: [] } })).toThrow(/orgTypes/);
    expect(() =>
      definePermissions('X', { a: { code: 'x.y.z', description: 'Something long', orgTypes: [/** @type {any} */ ('CUSTOMER')] } }),
    ).toThrow(/orgTypes/);
    expect(() => definePermissions('X', { a: { code: 'x.y.z', description: 'short', orgTypes: ['HOTEL'] } })).toThrow(/description/);
  });

  it('mergeCatalogues refuses the same code twice', () => {
    const a = definePermissions('A', { x: { code: 'm.e.read', description: 'Read things', orgTypes: ['HOTEL'] } }).catalogue;
    expect(() => mergeCatalogues([a, a])).toThrow(/declared twice/);
  });
});

describe('the B2B permission catalogue', () => {
  it('has unique codes, and every platform permission is held only by PLATFORM', () => {
    const codes = PERMISSION_CATALOGUE.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const p of PERMISSION_CATALOGUE) {
      if (p.code.startsWith('platform.') || p.code.startsWith('admin.')) expect(p.orgTypes).toEqual(['PLATFORM']);
    }
  });

  it('includes the Stage 01 permissions', () => {
    const codes = PERMISSION_CATALOGUE.map((p) => p.code);
    for (const c of ['organizations.member.invite', 'access.role.manage', 'audit.event.read', 'admin.viewAs.read', 'platform.org.manage']) {
      expect(codes).toContain(c);
    }
  });
});
