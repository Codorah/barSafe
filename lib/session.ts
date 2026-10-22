import { UserRole } from '../types';

export interface StoredSession {
  name: string;
  role: UserRole;
  establishmentId: string;
  /** Staff only. Clients browse the menu without a token. */
  token?: string;
}

const SESSION_KEY = 'barsafe_session';
const VISITED_KEY = 'barsafe_visited';

const read = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage unavailable (private mode) */ }
};

export const loadSession = (): StoredSession | null => {
  const raw = read(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (typeof s?.establishmentId !== 'string' || !Object.values(UserRole).includes(s.role)) return null;
    if (s.role !== UserRole.CLIENT && typeof s.token !== 'string') return null;
    return s as StoredSession;
  } catch {
    return null;
  }
};

export const saveSession = (s: StoredSession | null) => write(SESSION_KEY, s ? JSON.stringify(s) : null);

/** First visit = never seen the landing page on this device. */
export const hasVisited = (): boolean => read(VISITED_KEY) === '1';
export const markVisited = () => write(VISITED_KEY, '1');
