import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export type ToastTone = 'error' | 'warning' | 'info' | 'success';

export interface ToastItem {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
  /** Developer-only detail (shown when running `npm run dev`). */
  hint?: string;
  action?: { label: string; run: () => void };
}

const TONE: Record<ToastTone, { icon: string; color: string; ms: number }> = {
  error:   { icon: 'fa-circle-exclamation', color: 'text-danger',      ms: 7000 },
  warning: { icon: 'fa-triangle-exclamation', color: 'text-warn',      ms: 6000 },
  info:    { icon: 'fa-circle-info',        color: 'text-accentStrong', ms: 4500 },
  success: { icon: 'fa-circle-check',       color: 'text-positive',    ms: 3000 },
};

const Toast: React.FC<{ t: ToastItem; onClose: () => void }> = ({ t, onClose }) => {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(onClose, TONE[t.tone].ms + (t.action ? 3000 : 0));
    return () => window.clearTimeout(timer);
  }, [paused, t, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role={t.tone === 'error' ? 'alert' : 'status'}
      className="panel !rounded-2xl px-4 py-3.5 flex items-start gap-3 pointer-events-auto"
    >
      <i className={`fa-solid ${TONE[t.tone].icon} ${TONE[t.tone].color} mt-0.5`} aria-hidden="true"></i>
      <div className="flex-grow min-w-0">
        <p className="text-sm font-semibold text-ink">{t.title}</p>
        {t.message && <p className="text-sm text-muted mt-0.5 leading-snug pretty">{t.message}</p>}
        {import.meta.env.DEV && t.hint && (
          <p className="text-[0.7rem] text-faint mt-1.5 font-mono break-words">dev · {t.hint}</p>
        )}
        {t.action && (
          <button
            onClick={() => { t.action!.run(); onClose(); }}
            className="mt-2 text-sm font-semibold text-accentStrong hover:underline underline-offset-2"
          >
            {t.action.label}
          </button>
        )}
      </div>
      <button onClick={onClose} className="text-faint hover:text-ink shrink-0" aria-label="Fermer la notification">
        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </motion.div>
  );
};

export const Toaster: React.FC<{ toasts: ToastItem[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => (
  <div className="fixed top-4 inset-x-0 z-[600] flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
    <div className="w-full max-w-md flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map(t => <Toast key={t.id} t={t} onClose={() => onDismiss(t.id)} />)}
      </AnimatePresence>
    </div>
  </div>
);

/** Persistent strip while the device is offline. */
export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[590] w-[92%] max-w-md"
          role="status"
        >
          <div className="rounded-2xl bg-ink text-bg px-4 py-3 text-sm font-medium flex items-center gap-3 shadow-lift">
            <i className="fa-solid fa-wifi" aria-hidden="true"></i>
            Hors ligne. Les actions reprendront dès le retour du réseau.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
