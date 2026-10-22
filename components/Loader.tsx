import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface LoaderProps {
  label?: string;
  /** Covers the whole viewport (route chunks, session restore). Inline otherwise. */
  fullscreen?: boolean;
}

/** Branded loading state: the BarSafe mark inside a rotating amber arc. */
const Loader: React.FC<LoaderProps> = ({ label = 'Chargement…', fullscreen = false }) => {
  const reduce = useReducedMotion();

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.12 }} // avoids a flash on fast loads
      className={`flex flex-col items-center justify-center gap-5 ${fullscreen ? 'fixed inset-0 z-[400] bg-bg' : 'min-h-[50vh]'}`}
    >
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full" aria-hidden="true">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgb(var(--line) / 0.10)" strokeWidth="3" />
          <motion.circle
            cx="40" cy="40" r="36" fill="none"
            stroke="rgb(var(--accent))" strokeWidth="3" strokeLinecap="round"
            strokeDasharray="70 226"
            style={{ originX: '50%', originY: '50%' }}
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          />
        </svg>
        <motion.span
          className="absolute inset-[14px] rounded-2xl bg-accent text-onAccent grid place-items-center text-xl shadow-[0_12px_30px_-10px_rgb(var(--accent)/0.6)]"
          animate={reduce ? undefined : { scale: [1, 0.92, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <i className="fa-solid fa-martini-glass-citrus" aria-hidden="true"></i>
        </motion.span>
      </div>
      <p className="text-sm font-medium text-muted">{label}</p>
    </motion.div>
  );
};

export default Loader;
