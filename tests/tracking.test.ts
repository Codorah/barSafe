import { beforeEach, describe, expect, it } from 'vitest';
import { addTracked, getTracked } from '../lib/tracking';

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => store.clear(),
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};

beforeEach(() => store.clear());

describe('order tracking tokens', () => {
  it('keeps tokens per bar, newest first, without duplicates', () => {
    addTracked('bar-a', 't1');
    addTracked('bar-a', 't2');
    addTracked('bar-a', 't1');
    addTracked('bar-b', 'x');
    expect(getTracked('bar-a')).toEqual(['t1', 't2']);
    expect(getTracked('bar-b')).toEqual(['x']);
  });

  it('caps the list at 30, like the server', () => {
    for (let i = 0; i < 40; i++) addTracked('bar', `t${i}`);
    expect(getTracked('bar')).toHaveLength(30);
    expect(getTracked('bar')[0]).toBe('t39');
  });

  it('ignores corrupt storage', () => {
    store.set('barsafe_tracking_bar', '{oops');
    expect(getTracked('bar')).toEqual([]);
    store.set('barsafe_tracking_bar', JSON.stringify([1, 'ok', null]));
    expect(getTracked('bar')).toEqual(['ok']);
  });
});
