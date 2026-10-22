import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const MIN_MS = 900;   // long enough to read the brand, short enough not to annoy
const MAX_MS = 6000;  // never trap the user behind a slow network

/** Branded intro shown when the app opens. Stays until `ready`, within [MIN_MS, MAX_MS]. */
const SplashScreen: React.FC<{ ready: boolean }> = ({ ready }) => {
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setMinElapsed(true), MIN_MS);
    const t2 = window.setTimeout(() => setTimedOut(true), MAX_MS);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  const visible = !timedOut && !(ready && minElapsed);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="splash"
          aria-hidden="true"
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="splash-mark"><i className="fa-solid fa-martini-glass-citrus"></i></div>
          <div className="splash-word">Bar<span>Safe</span></div>
          <div className="splash-bar">
            <motion.span
              initial={{ width: '0%' }}
              animate={{ width: ready ? '100%' : '72%' }}
              transition={{ duration: ready ? 0.35 : 2.4, ease: 'easeOut' }}
            />
          </div>
          <p className="splash-tip">{ready ? 'Prêt' : 'Connexion au service…'}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
