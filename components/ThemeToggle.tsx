import React from 'react';
import { useTheme } from '../theme';

/** Compact light/dark switch for entry screens & the navbar.
 *  The full three-way control (Système / Clair / Sombre) lives in Settings. */
const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { resolved, setMode } = useTheme();
  const isLight = resolved === 'light';

  return (
    <div className={`segmented ${className}`} role="group" aria-label="Thème de l'interface">
      <button
        type="button"
        onClick={() => setMode('light')}
        aria-label={isLight ? 'Mode clair (actif)' : 'Passer en mode clair'}
        title="Mode clair"
        className={`seg-item ${isLight ? 'seg-item-active' : ''}`}
      >
        <i className="fa-solid fa-sun" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        onClick={() => setMode('dark')}
        aria-label={!isLight ? 'Mode sombre (actif)' : 'Passer en mode sombre'}
        title="Mode sombre"
        className={`seg-item ${!isLight ? 'seg-item-active' : ''}`}
      >
        <i className="fa-solid fa-moon" aria-hidden="true"></i>
      </button>
    </div>
  );
};

export default ThemeToggle;
