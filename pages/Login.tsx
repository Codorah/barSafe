import React, { useState } from 'react';
import { UserRole, Establishment } from '../types';
import { api } from '../api';
import MapEmbed from '../components/MapEmbed';

interface LoginProps {
  bar?: Establishment;
  onLogin: (user: { name: string; role: UserRole; establishmentId: string }) => void;
  onClientAccess: () => void;
}

const STAFF_ROLES: { role: UserRole; label: string; desc: string; icon: string }[] = [
  { role: UserRole.PATRON, label: 'Direction', desc: 'Stats, stock, équipe — tout gérer', icon: 'fa-crown' },
  { role: UserRole.SERVEUR, label: 'Service', desc: 'Prise de commande & tables', icon: 'fa-bell-concierge' },
  { role: UserRole.CAISSIER, label: 'Caisse', desc: 'Encaissement des paiements', icon: 'fa-cash-register' },
];

const Login: React.FC<LoginProps> = ({ bar, onLogin, onClientAccess }) => {
  const [view, setView] = useState<'CHOOSE' | 'STAFF'>('CHOOSE');
  const [role, setRole] = useState<UserRole>(UserRole.PATRON);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bar) {
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <div className="card p-10 text-center max-w-sm">
          <p className="font-display text-xl text-ink mb-1">Établissement introuvable</p>
          <p className="text-sm text-muted">Revenez à l'accueil pour choisir un lieu.</p>
        </div>
      </div>
    );
  }

  const roleInfo = STAFF_ROLES.find(r => r.role === role)!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) return setError('Entrez le code d\'accès.');
    setIsLoading(true);
    const ok = await api.verifyAccess(bar.id, role, code.trim());
    setIsLoading(false);
    if (!ok) return setError('Code incorrect pour cet espace.');
    onLogin({ name: roleInfo.label, role, establishmentId: bar.id });
  };

  return (
    <div className="min-h-[74vh] flex flex-col items-center justify-center py-6">
      <div className="w-full max-w-md animate-rise-in">
        <div className="text-center mb-8">
          <img
            src={bar.logoUrl && bar.logoUrl.startsWith('http') ? bar.logoUrl : '/logo.png'}
            alt={`Logo de ${bar.name}`}
            className="w-20 h-20 mx-auto object-cover rounded-2xl border border-line/15 shadow-soft mb-4"
          />
          <h1 className="font-display text-3xl font-semibold text-ink tracking-tight">{bar.name}</h1>
          <p className="text-sm text-muted mt-1">Bienvenue — comment souhaitez-vous entrer&nbsp;?</p>
        </div>

        <div className="panel p-6 sm:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl bg-danger/12 text-danger px-4 py-3 text-sm font-medium animate-pop-in" role="alert">
              <i className="fa-solid fa-circle-exclamation mt-0.5" aria-hidden="true"></i>
              <span>{error}</span>
            </div>
          )}

          {view === 'CHOOSE' ? (
            <div className="space-y-3">
              <button onClick={onClientAccess} className="w-full group rounded-2xl border border-line/12 bg-surface2 hover:border-accent/50 p-4 flex items-center gap-4 text-left transition-all">
                <span className="w-12 h-12 rounded-xl bg-accent/14 text-accentStrong grid place-items-center text-lg shrink-0"><i className="fa-solid fa-utensils" aria-hidden="true"></i></span>
                <span className="flex-grow">
                  <span className="block font-semibold text-ink">Je suis client</span>
                  <span className="block text-xs text-muted mt-0.5">Consulter le menu et commander</span>
                </span>
                <i className="fa-solid fa-arrow-right text-faint group-hover:text-accentStrong transition-colors" aria-hidden="true"></i>
              </button>

              <button onClick={() => { setView('STAFF'); setError(null); }} className="w-full group rounded-2xl border border-line/12 bg-surface2 hover:border-accent/50 p-4 flex items-center gap-4 text-left transition-all">
                <span className="w-12 h-12 rounded-xl bg-ink/8 text-ink grid place-items-center text-lg shrink-0"><i className="fa-solid fa-user-lock" aria-hidden="true"></i></span>
                <span className="flex-grow">
                  <span className="block font-semibold text-ink">Accès équipe</span>
                  <span className="block text-xs text-muted mt-0.5">Direction, service &amp; caisse</span>
                </span>
                <i className="fa-solid fa-arrow-right text-faint group-hover:text-accentStrong transition-colors" aria-hidden="true"></i>
              </button>

              {bar.lat != null && bar.lng != null && (
                <MapEmbed lat={bar.lat} lng={bar.lng} name={bar.name} address={bar.address} className="mt-2" />
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => { setView('CHOOSE'); setCode(''); setError(null); }} className="icon-btn !w-9 !h-9" aria-label="Retour">
                  <i className="fa-solid fa-arrow-left text-sm" aria-hidden="true"></i>
                </button>
                <h2 className="font-display text-lg font-semibold text-ink">Quel est votre espace&nbsp;?</h2>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {STAFF_ROLES.map(r => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => { setRole(r.role); setError(null); }}
                    className={`rounded-2xl border p-3 flex flex-col items-center gap-1.5 text-center transition-all ${role === r.role ? 'border-accent bg-accent/10' : 'border-line/12 hover:border-line/25'}`}
                  >
                    <i className={`fa-solid ${r.icon} text-lg ${role === r.role ? 'text-accentStrong' : 'text-muted'}`} aria-hidden="true"></i>
                    <span className={`text-xs font-semibold ${role === r.role ? 'text-ink' : 'text-muted'}`}>{r.label}</span>
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted text-center -mt-1">{roleInfo.desc}</p>

              <div>
                <label className="label text-center" htmlFor="access-code">Code d'accès {roleInfo.label}</label>
                <input
                  id="access-code"
                  inputMode="numeric"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="••••"
                  className="field field-lg text-center tracking-[0.5em] text-2xl font-semibold tabnum"
                />
              </div>

              <button type="submit" disabled={isLoading} className="btn btn-primary btn-block btn-lg">
                {isLoading ? <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> : <>Entrer <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
