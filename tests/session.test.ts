import { beforeEach, describe, expect, it } from 'vitest';
import { hasVisited, loadSession, markVisited, saveSession } from '../lib/session';
import { UserRole } from '../types';

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

describe('first visit', () => {
  it('is a first visit until the landing marks it', () => {
    expect(hasVisited()).toBe(false);
    markVisited();
    expect(hasVisited()).toBe(true);
  });
});

describe('session persistence', () => {
  it('round-trips a staff session', () => {
    const s = { name: 'Caisse', role: UserRole.CAISSIER, establishmentId: 'bar', token: 'tok' };
    saveSession(s);
    expect(loadSession()).toEqual(s);
  });

  it('keeps a client session without token', () => {
    saveSession({ name: 'Client', role: UserRole.CLIENT, establishmentId: 'bar' });
    expect(loadSession()?.role).toBe(UserRole.CLIENT);
  });

  it('rejects a staff session without token', () => {
    store.set('barsafe_session', JSON.stringify({ name: 'x', role: 'PATRON', establishmentId: 'bar' }));
    expect(loadSession()).toBeNull();
  });

  it('rejects unknown roles and corrupt data', () => {
    store.set('barsafe_session', JSON.stringify({ role: 'ADMIN', establishmentId: 'bar', token: 't' }));
    expect(loadSession()).toBeNull();
    store.set('barsafe_session', '{not json');
    expect(loadSession()).toBeNull();
  });

  it('clears the session', () => {
    saveSession({ name: 'Client', role: UserRole.CLIENT, establishmentId: 'bar' });
    saveSession(null);
    expect(loadSession()).toBeNull();
  });
});
