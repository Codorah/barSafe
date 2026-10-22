import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../lib/auth';

/** Header of the public pages (onboarding, account, legal). Role dashboards use <Navbar>. */
const SiteHeader: React.FC = () => {
  const { session, profile, loading } = useAuth();
  const { pathname } = useLocation();
  const initial = (profile?.fullName || session?.user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between gap-3">
      <Link to="/etablissements" className="flex items-center gap-3" aria-label="BarSafe, accueil">
        <span className="w-11 h-11 rounded-2xl bg-accent grid place-items-center shadow-[0_8px_20px_-8px_rgb(var(--accent)/0.6)]">
          <i className="fa-solid fa-martini-glass-citrus text-onAccent text-lg" aria-hidden="true"></i>
        </span>
        <span className="flex flex-col -space-y-0.5">
          <span className="font-display text-xl font-semibold tracking-tight leading-none">BarSafe</span>
          <span className="eyebrow text-[0.62rem]">Togo</span>
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Link to="/decouvrir" className="btn btn-ghost btn-sm hidden md:inline-flex">
          <i className="fa-solid fa-circle-info" aria-hidden="true"></i> Découvrir
        </Link>
        <ThemeToggle className="hidden sm:inline-flex" />
        {loading ? (
          <span className="skeleton w-28 h-10" aria-hidden="true" />
        ) : session ? (
          <Link
            to="/compte"
            className={`btn btn-sm ${pathname === '/compte' ? 'btn-soft' : 'btn-outline'}`}
            aria-label="Mon compte"
          >
            <span className="w-6 h-6 rounded-full bg-accent text-onAccent grid place-items-center text-xs font-bold">{initial}</span>
            <span className="hidden sm:inline">Mon compte</span>
          </Link>
        ) : (
          <Link to={`/connexion?next=${encodeURIComponent(pathname)}`} className="btn btn-primary btn-sm">
            <i className="fa-solid fa-user" aria-hidden="true"></i> Se connecter
          </Link>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
