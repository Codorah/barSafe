import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import SettingsModal from './SettingsModal';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  barName: string;
  user: { name: string; role: UserRole } | null;
  onLogout: () => void;
}

const roleLabel: Record<string, string> = {
  PATRON: 'Direction',
  SERVEUR: 'Service',
  CAISSIER: 'Caisse',
  CLIENT: 'Client',
};

const Navbar: React.FC<NavbarProps> = ({ barName, user, onLogout }) => {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-line/10">
      <div className="max-w-content mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
        <button
          className="flex items-center gap-3 group text-left"
          onClick={() => navigate('/')}
          aria-label="Retour à l'accueil"
        >
          <span className="relative w-11 h-11 rounded-2xl bg-accent grid place-items-center shadow-[0_8px_20px_-8px_rgb(var(--accent)/0.6)] transition-transform duration-500 group-hover:-rotate-6">
            <i className="fa-solid fa-martini-glass-citrus text-onAccent text-lg" aria-hidden="true"></i>
          </span>
          <span className="flex flex-col -space-y-0.5">
            <span className="font-display text-xl font-semibold tracking-tight text-ink leading-none">BarSafe</span>
            <span className="eyebrow text-[0.62rem]">{barName || 'Togo'}</span>
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <div className="text-right hidden sm:flex flex-col mr-1">
              <span className="text-sm font-semibold text-ink leading-tight">{user.name}</span>
              <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-accentStrong">
                {roleLabel[user.role] || user.role}
              </span>
            </div>
          )}
          <ThemeToggle />
          <button
            onClick={() => setShowSettings(true)}
            className="icon-btn"
            title="Paramètres"
            aria-label="Ouvrir les paramètres"
          >
            <i className="fa-solid fa-sliders" aria-hidden="true"></i>
          </button>
          {user && (
            <button
              onClick={onLogout}
              className="icon-btn hover:!text-danger hover:!border-danger/40"
              title="Quitter l'établissement"
              aria-label="Se déconnecter"
            >
              <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>
            </button>
          )}
        </div>
      </div>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </nav>
  );
};

export default Navbar;
