// @ts-check
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import { b2bMongoose } from '../../src/b2b/core/db/connection.js';

describe('B2B Mongoose instance', () => {
  it('is separate from the default instance used by the existing app', () => {
    expect(b2bMongoose).not.toBe(mongoose);
    expect(b2bMongoose.connection).not.toBe(mongoose.connection);
  });

  it('does not receive global plugins registered on the default instance (existing audit plugin)', () => {
    let calls = 0;
    mongoose.plugin(() => {
      calls += 1;
    });
    const schema = new b2bMongoose.Schema({ name: String });
    b2bMongoose.model('core_plugin_probe', schema);
    expect(calls).toBe(0);
  });

  it('never creates indexes or collections automatically', () => {
    expect(b2bMongoose.get('autoIndex')).toBe(false);
    expect(b2bMongoose.get('autoCreate')).toBe(false);
    expect(b2bMongoose.get('strictQuery')).toBe(true);
  });
});
