/**
 * Tracking tokens of the orders placed from this device (QR clients have no account).
 * A token is the only way to read an order back: the server never lists orders publicly.
 */
const key = (barId: string) => `barsafe_tracking_${barId}`;
const MAX = 30; // matches the server-side cap of track_orders()

export const getTracked = (barId: string): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(key(barId)) || '[]');
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
};

export const addTracked = (barId: string, token: string) => {
  const next = [token, ...getTracked(barId).filter(t => t !== token)].slice(0, MAX);
  try { localStorage.setItem(key(barId), JSON.stringify(next)); } catch { /* storage unavailable */ }
};
