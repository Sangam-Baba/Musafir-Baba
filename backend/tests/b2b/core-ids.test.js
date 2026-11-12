// @ts-check
import { describe, expect, it } from 'vitest';

import { newReference, parseReference } from '../../src/b2b/core/ids.js';

describe('public references', () => {
  it('have the documented shapes', () => {
    expect(newReference('MBH')).toMatch(/^MBH-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(newReference('MBO')).toMatch(/^MBO-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(newReference('MBHT')).toMatch(/^MBHT-[0-9A-Z]{6}$/);
    expect(newReference('MBC')).toMatch(/^MBC-[0-9A-Z]{6}$/);
  });

  it('never use I, L, O or U and are random', () => {
    const refs = new Set(Array.from({ length: 2000 }, () => newReference('MBH')));
    expect(refs.size).toBe(2000);
    for (const r of refs) expect(r.slice(4)).not.toMatch(/[ILOU]/);
  });

  it('round-trip through parseReference, accepting lower case and look-alikes', () => {
    const ref = newReference('MBH');
    expect(parseReference(ref)).toBe(ref);
    expect(parseReference(ref.toLowerCase())).toBe(ref);
    const withZero = ref.replace(/^MBH-/, 'MBH-').replaceAll('0', 'O');
    expect(parseReference(withZero)).toBe(ref);
  });

  it('catch a mistyped character with the check character', () => {
    let caught = 0;
    for (let i = 0; i < 500; i += 1) {
      const ref = newReference('MBO');
      const chars = [...ref];
      const pos = 4; // first body character
      chars[pos] = chars[pos] === 'A' ? 'B' : 'A';
      if (parseReference(chars.join('')) === null) caught += 1;
    }
    expect(caught).toBe(500);
  });

  it('reject unknown prefixes and junk', () => {
    for (const bad of ['XYZ-1234-5678', 'MBH-1234', 'MBH-12345678-9', '', 'MBH-****-****']) {
      expect(parseReference(bad)).toBeNull();
    }
  });
});
