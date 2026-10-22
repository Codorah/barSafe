import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { ApiError } from '../api';

export type AccountType = 'OWNER' | 'CUSTOMER';

export interface Profile {
  id: string;
  role: AccountType;
  fullName: string;
  phone: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  /** True until the stored session (if any) has been read. */
  loading: boolean;
  signUp: (input: { email: string; password: string; fullName: string; phone?: string; type: AccountType }) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  /** Redirects to Google. `type` is applied on return (Google can't carry it). */
  signInWithGoogle: (type: AccountType, next: string) => Promise<void>;
  /** Upgrades a customer account to an establishment account. */
  becomeOwner: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (input: { fullName: string; phone: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Account type chosen before leaving for Google, applied once back with a session. */
const PENDING_TYPE_KEY = 'barsafe_pending_account_type';

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase.from('profiles').select('id, role, full_name, phone').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return { id: data.id, role: data.role, fullName: data.full_name, phone: data.phone };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const apply = async (s: Session | null) => {
      // Session and profile are published together, so role checks never see a half-loaded user
      let p = s ? await fetchProfile(s.user.id) : null;
      if (s) {
        let pending: string | null = null;
        try { pending = localStorage.getItem(PENDING_TYPE_KEY); localStorage.removeItem(PENDING_TYPE_KEY); } catch { /* storage unavailable */ }
        if (p && p.role === 'CUSTOMER' && pending === 'OWNER') {
          const { error } = await supabase.rpc('become_owner');
          if (!error) p = { ...p, role: 'OWNER' };
        }
      }
      if (!alive) return;
      setSession(s);
      setProfile(p);
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      // Defer: calling Supabase inside this callback can deadlock the auth client
      setTimeout(() => apply(s), 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const signUp: AuthContextValue['signUp'] = useCallback(async ({ email, password, fullName, phone, type }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { account_type: type, full_name: fullName.trim(), phone: (phone || '').trim() },
        emailRedirectTo: `${window.location.origin}/compte`,
      },
    });
    if (error) throw ApiError.from(error, 'signUp');
    return { needsConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw ApiError.from(error, 'signIn');
  }, []);

  const signInWithGoogle = useCallback(async (type: AccountType, next: string) => {
    try { localStorage.setItem(PENDING_TYPE_KEY, type); } catch { /* storage unavailable */ }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Back to the sign-in page, which forwards to `next` once the session is there
        // (and shows a readable message if Google or Supabase returned an error).
        redirectTo: `${window.location.origin}/connexion?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      try { localStorage.removeItem(PENDING_TYPE_KEY); } catch { /* storage unavailable */ }
      throw ApiError.from(error, 'google');
    }
  }, []);

  const becomeOwner = useCallback(async () => {
    const { error } = await supabase.rpc('become_owner');
    if (error) throw ApiError.from(error, 'becomeOwner');
    setProfile(p => (p ? { ...p, role: 'OWNER' } : p));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/compte` });
    if (error) throw ApiError.from(error, 'resetPassword');
  }, []);

  const updateProfile = useCallback(async ({ fullName, phone }: { fullName: string; phone: string }) => {
    if (!session) return;
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() }).eq('id', session.user.id);
    if (error) throw ApiError.from(error, 'updateProfile');
    setProfile(p => (p ? { ...p, fullName: fullName.trim(), phone: phone.trim() } : p));
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signUp, signIn, signInWithGoogle, becomeOwner, signOut, resetPassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
