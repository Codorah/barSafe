import React from 'react';
import { motion } from 'motion/react';
import { FriendlyError } from '../lib/errors';

/** Full-section error with a retry, used when a screen cannot load its data. */
const ErrorState: React.FC<{ error: FriendlyError; onRetry?: () => void }> = ({ error, onRetry }) => {
  const icon = error.title === 'Pas de connexion' ? 'fa-wifi' : error.tone === 'warning' ? 'fa-screwdriver-wrench' : 'fa-triangle-exclamation';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="card p-10 text-center max-w-md mx-auto mt-6"
      role="alert"
    >
      <div className={`w-14 h-14 rounded-2xl grid place-items-center mx-auto text-xl mb-5 ${error.tone === 'error' ? 'bg-danger/12 text-danger' : 'bg-warn/14 text-warn'}`}>
        <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
      </div>
      <p className="font-display text-xl font-semibold text-ink mb-2">{error.title}</p>
      <p className="text-sm text-muted pretty">{error.message}</p>
      {import.meta.env.DEV && error.hint && (
        <p className="text-[0.7rem] text-faint mt-3 font-mono break-words">dev · {error.hint}</p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary mt-6 mx-auto">
          <i className="fa-solid fa-rotate-right" aria-hidden="true"></i> Réessayer
        </button>
      )}
    </motion.div>
  );
};

export default ErrorState;
