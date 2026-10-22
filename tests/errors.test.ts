import { describe, expect, it } from 'vitest';
import { SESSION_EXPIRED, toFriendlyError } from '../lib/errors';

describe('toFriendlyError', () => {
  it('hides "schema cache" errors behind a maintenance message', () => {
    const f = toFriendlyError({
      code: 'PGRST202',
      message: 'Could not find the function public.staff_login(p_code, p_establishment, p_role) in the schema cache',
    });
    expect(f.title).toBe('Service en cours de mise à jour');
    expect(f.message).not.toMatch(/schema|function|staff_login/i);
    expect(f.hint).toMatch(/migration/);
    expect(f.retryable).toBe(true);
  });

  it('detects network failures', () => {
    const f = toFriendlyError(new TypeError('Failed to fetch'));
    expect(f.title).toBe('Pas de connexion');
    expect(f.retryable).toBe(true);
  });

  it('keeps business messages written for users', () => {
    const f = toFriendlyError({ code: 'P0001', message: 'Stock insuffisant : Flag. Faites un réassort.' });
    expect(f.message).toBe('Stock insuffisant : Flag. Faites un réassort.');
    expect(f.retryable).toBe(false);
  });

  it('never leaks raw SQL errors', () => {
    const f = toFriendlyError({ code: 'P0001', message: 'null value in column "name" violates not-null constraint' });
    expect(f.message).not.toMatch(/column|violates/);
  });

  it('flags expired sessions', () => {
    const f = toFriendlyError({ code: SESSION_EXPIRED, message: 'Session expirée, reconnectez-vous.' });
    expect(f.title).toBe('Session expirée');
    expect(f.code).toBe(SESSION_EXPIRED);
  });

  it('maps invalid input and rate limits', () => {
    expect(toFriendlyError({ code: '22P02', message: 'invalid input syntax for type uuid' }).title).toBe('Donnée invalide');
    expect(toFriendlyError({ code: '54000', message: 'Trop de tentatives. Réessayez dans quelques minutes.' }).message)
      .toBe('Trop de tentatives. Réessayez dans quelques minutes.');
  });

  it('falls back to a generic, readable message', () => {
    const f = toFriendlyError({ message: 'PGRST999 weird internal thing' });
    expect(f.title).toBe('Une erreur est survenue');
    expect(f.message).not.toMatch(/PGRST/);
  });
});

describe('auth errors', () => {
  it('translates Supabase Auth codes to French', () => {
    expect(toFriendlyError({ code: 'invalid_credentials', message: 'Invalid login credentials' }).title).toBe('Identifiants incorrects');
    expect(toFriendlyError({ code: 'user_already_exists', message: 'User already registered' }).title).toBe('Compte existant');
    expect(toFriendlyError({ code: 'email_not_confirmed', message: 'Email not confirmed' }).message).toMatch(/lien/);
  });

  it('treats auth fetch failures as network errors', () => {
    expect(toFriendlyError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }).title).toBe('Pas de connexion');
  });
});
