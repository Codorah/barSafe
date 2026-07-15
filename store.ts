
import { AppState, UserRole, Establishment } from './types';

const STORAGE_KEY = 'barsafe_togo_v2';

const DUMMY_BARS: Establishment[] = [];

export const loadState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return {
    establishments: DUMMY_BARS,
    selectedEstablishmentId: null,
    currentUser: null,
  };
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
