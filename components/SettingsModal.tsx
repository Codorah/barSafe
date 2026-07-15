import React, { useState } from 'react';
import { useTheme, ThemeMode } from '../theme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: { value: ThemeMode; label: string; hint: string; icon: string }[] = [
  { value: 'system', label: 'Système', hint: 'Suit les réglages de votre appareil', icon: 'fa-circle-half-stroke' },
  { value: 'light', label: 'Clair', hint: 'Lumineux, pour la journée', icon: 'fa-sun' },
  { value: 'dark', label: 'Sombre', hint: 'Reposant, pour le service de nuit', icon: 'fa-moon' },
];

type Tab = 'THEME' | 'NOTIF' | 'ABOUT';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('THEME');
  const { mode, setMode } = useTheme();
  const [sound, setSound] = useState(() => localStorage.getItem('barsafe_sound') !== 'off');
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    localStorage.setItem('barsafe_sound', next ? 'on' : 'off');
  };

  const resetData = () => {
    try { localStorage.clear(); } catch { /* ignore */ }
    window.location.reload();
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'THEME', label: 'Apparence', icon: 'fa-palette' },
    { key: 'NOTIF', label: 'Réglages', icon: 'fa-sliders' },
    { key: 'ABOUT', label: 'À propos', icon: 'fa-circle-info' },
  ];

  return (
    <div className="overlay items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="panel w-full max-w-lg overflow-hidden animate-rise-in flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-line/10">
          <h2 className="font-display text-2xl font-semibold text-ink">Paramètres</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Fermer"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>

        <div className="p-2">
          <div className="segmented w-full">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`seg-item flex-1 ${activeTab === t.key ? 'seg-item-active' : ''}`}>
                <i className={`fa-solid ${t.icon} mr-2`} aria-hidden="true"></i> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === 'THEME' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">Thème de l'application</h3>
                <p className="text-sm text-muted mt-1">Adaptez l'interface à votre environnement.</p>
              </div>
              <div className="space-y-2.5">
                {THEME_OPTIONS.map(opt => {
                  const active = mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      aria-label={`Thème ${opt.label}${active ? ' (actif)' : ''}`}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${active ? 'border-accent bg-accent/10' : 'border-line/12 hover:border-line/25'}`}
                    >
                      <span className={`w-11 h-11 rounded-xl grid place-items-center text-lg ${active ? 'bg-accent text-onAccent' : 'bg-surface2 text-muted'}`}>
                        <i className={`fa-solid ${opt.icon}`} aria-hidden="true"></i>
                      </span>
                      <span className="flex-grow">
                        <span className="block font-semibold text-ink">{opt.label}</span>
                        <span className="block text-xs text-muted mt-0.5">{opt.hint}</span>
                      </span>
                      {active && <i className="fa-solid fa-circle-check text-accentStrong" aria-hidden="true"></i>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'NOTIF' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink mb-3">Notifications</h3>
                <button type="button" onClick={toggleSound} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-line/12 hover:border-line/25 transition-all text-left">
                  <span className={`w-11 h-11 rounded-xl grid place-items-center text-lg ${sound ? 'bg-accent text-onAccent' : 'bg-surface2 text-muted'}`}>
                    <i className={`fa-solid ${sound ? 'fa-volume-high' : 'fa-volume-xmark'}`} aria-hidden="true"></i>
                  </span>
                  <span className="flex-grow">
                    <span className="block font-semibold text-ink">Son à la nouvelle commande</span>
                    <span className="block text-xs text-muted mt-0.5">Un bip prévient le service à chaque commande.</span>
                  </span>
                  <span className={`w-12 h-7 rounded-full p-1 transition-colors ${sound ? 'bg-accent' : 'bg-surface2 border border-line/12'}`}>
                    <span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${sound ? 'translate-x-5' : ''}`} />
                  </span>
                </button>
              </div>

              <div>
                <h3 className="font-display text-lg font-semibold text-ink mb-1">Données</h3>
                <p className="text-sm text-muted mb-3">Efface les préférences et l'historique local de cet appareil.</p>
                {confirmReset ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={resetData} className="btn btn-danger flex-1"><i className="fa-solid fa-trash" /> Confirmer la réinitialisation</button>
                    <button type="button" onClick={() => setConfirmReset(false)} className="btn btn-ghost">Annuler</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmReset(true)} className="btn btn-outline btn-block"><i className="fa-solid fa-rotate-left" /> Réinitialiser les données locales</button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ABOUT' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-accent grid place-items-center text-onAccent text-xl"><i className="fa-solid fa-martini-glass-citrus" aria-hidden="true"></i></span>
                <div>
                  <p className="font-display text-xl font-semibold text-ink">BarSafe</p>
                  <p className="text-xs text-muted">Version 2.0 · Togo</p>
                </div>
              </div>
              <p className="text-sm text-muted pretty">Gestion de bar : menu par QR, service en temps réel, encaissement sécurisé et stock maîtrisé.</p>
              <div className="card-flat p-4 flex items-center gap-3">
                <span className="w-11 h-11 rounded-xl bg-accent/12 grid place-items-center text-xl">👩🏽‍💻</span>
                <div className="flex-grow">
                  <p className="font-semibold text-ink flex items-center gap-2">Elodie ATANA <span className="badge badge-amber">Codorah</span></p>
                  <p className="text-xs text-muted">Ingénieure IA · Prompt Engineer</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <a href="mailto:codorah@hotmail.com" className="btn btn-ghost btn-block"><i className="fa-solid fa-envelope text-accentStrong" aria-hidden="true"></i> codorah@hotmail.com</a>
                <a href="tel:+22871672565" className="btn btn-ghost btn-block"><i className="fa-solid fa-phone text-positive" aria-hidden="true"></i> +228 71 67 25 65</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
