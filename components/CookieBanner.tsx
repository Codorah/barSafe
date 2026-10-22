import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

const KEY = 'barsafe_cookie_notice';
const VALID_MS = 365 * 24 * 3600 * 1000;
const EVENT = 'barsafe:cookienotice';

const seen = () => {
  try {
    const at = Number(localStorage.getItem(KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < VALID_MS;
  } catch {
    return true; // storage blocked: nothing is stored anyway, don't nag
  }
};

/** Shows the information banner again (privacy page button). */
export const resetCookieNotice = () => {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVENT));
};

/**
 * Information banner. BarSafe only uses strictly necessary storage and user-chosen
 * preferences (no ads, no analytics), which are exempt from consent: we inform, we don't
 * ask for a fake choice. If trackers are ever added, this must become a real opt-in.
 */
const CookieBanner: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setOpen(!seen()), 1200); // after the splash
    const reopen = () => setOpen(true);
    window.addEventListener(EVENT, reopen);
    return () => { window.clearTimeout(t); window.removeEventListener(EVENT, reopen); };
  }, []);

  const close = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* storage unavailable */ }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[580] sm:max-w-sm"
          role="dialog"
          aria-labelledby="cookie-title"
        >
          <div className="panel !rounded-3xl p-5">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-accent/14 text-accentStrong grid place-items-center shrink-0"><i className="fa-solid fa-cookie-bite" aria-hidden="true"></i></span>
              <div>
                <p id="cookie-title" className="font-semibold text-ink">Pas de pub, pas de pistage</p>
                <p className="text-sm text-muted mt-1 leading-snug pretty">
                  BarSafe utilise seulement le stockage nécessaire à son fonctionnement : votre connexion, le suivi de vos commandes et vos préférences.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={close} className="btn btn-primary btn-sm flex-1">J’ai compris</button>
              <Link to="/confidentialite#cookies" onClick={close} className="btn btn-ghost btn-sm">En savoir plus</Link>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;
