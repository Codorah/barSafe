import React, { useRef, useState } from 'react';
import { NewEstablishmentInput } from '../api';

interface CreateBarWizardProps {
  onClose: () => void;
  onCreate: (input: NewEstablishmentInput) => Promise<string | null>;
  onSelect: (id: string) => void;
}

const STEPS = [
  { key: 'identity', label: 'Identité', icon: 'fa-signature' },
  { key: 'visuals', label: 'Visuels', icon: 'fa-images' },
  { key: 'location', label: 'Localisation', icon: 'fa-location-dot' },
  { key: 'security', label: 'Accès', icon: 'fa-shield-halved' },
  { key: 'review', label: 'Récap', icon: 'fa-circle-check' },
];

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=1600';

type Form = {
  name: string; description: string; logoUrl: string; coverUrl: string;
  address: string; lat: number | null; lng: number | null;
  codePatron: string; codeServeur: string; codeCaissier: string;
};

const CreateBarWizard: React.FC<CreateBarWizardProps> = ({ onClose, onCreate, onSelect }) => {
  const [step, setStep] = useState(0);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({
    name: '', description: '', logoUrl: '', coverUrl: '',
    address: '', lat: null, lng: null,
    codePatron: '', codeServeur: '', codeCaissier: '',
  });

  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<Form>) => setForm(prev => ({ ...prev, ...patch }));

  const upload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'coverUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => set({ [field]: reader.result as string } as Partial<Form>);
    reader.readAsDataURL(file);
  };

  const captureLocation = () => {
    if (!navigator.geolocation) { setGeoError('Géolocalisation indisponible sur cet appareil.'); return; }
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        set({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, { headers: { 'Accept-Language': 'fr' } });
          const j = await res.json();
          if (j.display_name) set({ address: j.display_name });
        } catch { /* keep coords only */ }
        setGeoLoading(false);
      },
      () => { setGeoError('Position refusée. Vous pouvez saisir l\'adresse manuellement.'); setGeoLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const codeOk = (c: string) => /^\d{4,8}$/.test(c);
  const nameValid = form.name.trim().length >= 2;
  const codesFilled = codeOk(form.codePatron) && codeOk(form.codeServeur) && codeOk(form.codeCaissier);
  const codesDistinct = new Set([form.codePatron, form.codeServeur, form.codeCaissier]).size === 3;
  const codesValid = codesFilled && codesDistinct;
  const canContinue = step === 0 ? nameValid : step === 3 ? codesValid : true;

  const finish = async () => {
    setIsCreating(true);
    const input: NewEstablishmentInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      logoUrl: form.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(form.name.trim())}&backgroundColor=E0A33E&textColor=151210`,
      coverUrl: form.coverUrl || DEFAULT_COVER,
      address: form.address.trim(),
      lat: form.lat,
      lng: form.lng,
      codePatron: form.codePatron,
      codeServeur: form.codeServeur,
      codeCaissier: form.codeCaissier,
    };
    const id = await onCreate(input);
    setIsCreating(false);
    if (id) setCreatedId(id);
  };

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish());
  const back = () => setStep(Math.max(0, step - 1));

  return (
    <div className="fixed inset-0 z-[300] bg-bg flex flex-col lg:flex-row animate-fade-in">
      {/* Brand side */}
      <aside className="relative lg:w-2/5 h-40 lg:h-auto shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${form.coverUrl || DEFAULT_COVER})` }} aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-br from-[#0d0a08]/95 via-[#0d0a08]/85 to-[#0d0a08]/60" aria-hidden="true" />
        <div className="relative h-full flex flex-col justify-between p-6 lg:p-10">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-accent grid place-items-center"><i className="fa-solid fa-martini-glass-citrus text-onAccent" aria-hidden="true"></i></span>
            <span className="font-display text-lg font-semibold text-[#F4ECE0]">BarSafe</span>
          </div>
          <div className="hidden lg:block">
            <p className="eyebrow text-accent mb-3">Nouvel établissement</p>
            <h2 className="font-display text-4xl font-semibold text-[#F4ECE0] leading-tight balance">
              {createdId ? 'Bienvenue à bord.' : STEPS[step].label === 'Identité' ? 'Donnez vie à votre lieu.' : STEPS[step].label === 'Accès' ? 'Sécurisez vos accès.' : `Étape ${step + 1} — ${STEPS[step].label}`}
            </h2>
            <div className="mt-8 space-y-3">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${createdId || i < step ? 'bg-accent text-onAccent' : i === step ? 'bg-[#F4ECE0] text-[#151210]' : 'bg-white/10 text-[#F4ECE0]/60'}`}>
                    {createdId || i < step ? <i className="fa-solid fa-check" /> : i + 1}
                  </span>
                  <span className={`text-sm font-medium ${i === step && !createdId ? 'text-[#F4ECE0]' : 'text-[#F4ECE0]/60'}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block text-[#F4ECE0]/50 text-xs">« Drink well, sell well, gain well »</div>
        </div>
      </aside>

      {/* Form side */}
      <section className="flex-1 flex flex-col min-h-0">
        <header className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-line/10">
          <p className="eyebrow lg:hidden">{createdId ? 'Terminé' : `Étape ${step + 1}/${STEPS.length}`}</p>
          <span className="hidden lg:block" />
          <button onClick={onClose} className="icon-btn" aria-label="Fermer"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </header>

        <div className="flex-1 overflow-y-auto scroll-slim px-6 sm:px-10 py-8">
          <div className="max-w-lg mx-auto">
            {createdId ? (
              <div className="animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-positive/15 text-positive grid place-items-center text-2xl mb-5"><i className="fa-solid fa-check" /></div>
                <h3 className="font-display text-2xl font-semibold text-ink mb-1">« {form.name.trim()} » est prêt</h3>
                <p className="text-sm text-muted mb-6 pretty">Notez bien ces codes d'accès — ils permettent à votre équipe de se connecter à chaque espace.</p>
                <div className="space-y-2.5 mb-7">
                  {[
                    { label: 'Direction', code: form.codePatron, icon: 'fa-crown' },
                    { label: 'Service', code: form.codeServeur, icon: 'fa-bell-concierge' },
                    { label: 'Caisse', code: form.codeCaissier, icon: 'fa-cash-register' },
                  ].map(r => (
                    <div key={r.label} className="card-flat p-4 flex items-center justify-between">
                      <span className="flex items-center gap-3 text-ink font-medium"><i className={`fa-solid ${r.icon} text-accentStrong`} /> {r.label}</span>
                      <span className="font-semibold tracking-[0.3em] tabnum text-ink">{r.code}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => onSelect(createdId)} className="btn btn-primary btn-lg flex-1">Configurer maintenant <i className="fa-solid fa-arrow-right" /></button>
                  <button onClick={onClose} className="btn btn-ghost btn-lg">Plus tard</button>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile progress */}
                <div className="flex items-center gap-1.5 mb-8 lg:hidden">
                  {STEPS.map((s, i) => <span key={s.key} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-line/12'}`} />)}
                </div>

                <div key={step} className="animate-fade-in">
                  {step === 0 && (
                    <div className="space-y-5">
                      <h3 className="font-display text-2xl font-semibold text-ink">Identité</h3>
                      <div>
                        <label className="label" htmlFor="w-name">Nom de l'établissement</label>
                        <input id="w-name" autoFocus className="field field-lg" placeholder="Ex : Le Maquis Star, Lomé" value={form.name} onChange={(e) => set({ name: e.target.value })} />
                        {!nameValid && form.name.length > 0 && <p className="text-xs text-danger mt-2">Au moins 2 caractères.</p>}
                      </div>
                      <div>
                        <label className="label" htmlFor="w-desc">Description <span className="text-faint font-normal">(optionnel)</span></label>
                        <textarea id="w-desc" className="field" placeholder="Ambiance, spécialités, quartier…" value={form.description} onChange={(e) => set({ description: e.target.value })} />
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-6">
                      <h3 className="font-display text-2xl font-semibold text-ink">Visuels</h3>
                      <div>
                        <label className="label">Logo</label>
                        <div className="flex items-center gap-4">
                          <button type="button" onClick={() => logoRef.current?.click()} className="w-20 h-20 rounded-2xl border-2 border-dashed border-line/20 grid place-items-center overflow-hidden bg-surface2 hover:border-accent/60 transition-colors">
                            {form.logoUrl ? <img src={form.logoUrl} alt="Aperçu logo" className="w-full h-full object-cover" /> : <i className="fa-solid fa-camera text-faint text-xl" />}
                          </button>
                          <div>
                            <button type="button" onClick={() => logoRef.current?.click()} className="btn btn-outline btn-sm"><i className="fa-solid fa-image" /> Choisir un logo</button>
                            <p className="text-xs text-faint mt-2">Sinon généré depuis le nom.</p>
                          </div>
                          <input ref={logoRef} type="file" accept="image/*" className="hidden" aria-label="Logo" onChange={(e) => upload(e, 'logoUrl')} />
                        </div>
                      </div>
                      <div>
                        <label className="label">Photo de couverture</label>
                        <button type="button" onClick={() => coverRef.current?.click()} className="w-full h-44 rounded-2xl border-2 border-dashed border-line/20 grid place-items-center overflow-hidden bg-surface2 hover:border-accent/60 transition-colors">
                          {form.coverUrl ? <img src={form.coverUrl} alt="Aperçu couverture" className="w-full h-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-faint"><i className="fa-solid fa-panorama text-2xl" /><span className="text-xs font-medium">Ajouter une photo</span></span>}
                        </button>
                        <input ref={coverRef} type="file" accept="image/*" className="hidden" aria-label="Couverture" onChange={(e) => upload(e, 'coverUrl')} />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-5">
                      <h3 className="font-display text-2xl font-semibold text-ink">Localisation</h3>
                      <p className="text-sm text-muted -mt-2">Aidez vos clients à vous trouver. Optionnel.</p>
                      <button type="button" onClick={captureLocation} disabled={geoLoading} className="btn btn-soft btn-block">
                        {geoLoading ? <><i className="fa-solid fa-circle-notch fa-spin" /> Localisation…</> : <><i className="fa-solid fa-location-crosshairs" /> Utiliser ma position actuelle</>}
                      </button>
                      {geoError && <p className="text-xs text-warn">{geoError}</p>}
                      {form.lat != null && form.lng != null && (
                        <p className="text-xs text-positive flex items-center gap-2"><i className="fa-solid fa-circle-check" /> Position enregistrée ({form.lat.toFixed(4)}, {form.lng.toFixed(4)})</p>
                      )}
                      <div>
                        <label className="label" htmlFor="w-addr">Adresse</label>
                        <textarea id="w-addr" className="field" rows={2} placeholder="Quartier, rue, ville…" value={form.address} onChange={(e) => set({ address: e.target.value })} />
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-5">
                      <h3 className="font-display text-2xl font-semibold text-ink">Codes d'accès</h3>
                      <p className="text-sm text-muted -mt-2 pretty">Un code par espace (4 à 8 chiffres). Ils protègent la connexion de votre équipe.</p>
                      {[
                        { key: 'codePatron' as const, label: 'Direction', icon: 'fa-crown', val: form.codePatron },
                        { key: 'codeServeur' as const, label: 'Service', icon: 'fa-bell-concierge', val: form.codeServeur },
                        { key: 'codeCaissier' as const, label: 'Caisse', icon: 'fa-cash-register', val: form.codeCaissier },
                      ].map(r => (
                        <div key={r.key} className="flex items-center gap-3">
                          <span className="w-11 h-11 rounded-xl bg-accent/12 text-accentStrong grid place-items-center shrink-0"><i className={`fa-solid ${r.icon}`} /></span>
                          <div className="flex-1">
                            <label className="label !mb-1" htmlFor={r.key}>{r.label}</label>
                            <input id={r.key} inputMode="numeric" className="field tracking-[0.3em] font-semibold tabnum" placeholder="••••" value={r.val} onChange={(e) => set({ [r.key]: e.target.value.replace(/\D/g, '').slice(0, 8) } as Partial<Form>)} />
                          </div>
                        </div>
                      ))}
                      {codesFilled && !codesDistinct && (
                        <p className="flex items-center gap-2 rounded-xl bg-warn/14 text-warn px-3.5 py-2.5 text-sm font-medium" role="alert">
                          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                          Les trois codes doivent être différents, sinon un serveur pourrait ouvrir la caisse.
                        </p>
                      )}
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-4">
                      <h3 className="font-display text-2xl font-semibold text-ink">Récapitulatif</h3>
                      <div className="card-flat overflow-hidden">
                        <div className="h-32 relative">
                          <img src={form.coverUrl || DEFAULT_COVER} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                          <div className="absolute bottom-3 left-4 flex items-center gap-3">
                            {form.logoUrl ? <img src={form.logoUrl} alt="" className="w-11 h-11 rounded-xl object-cover border-2 border-white/70" /> : <span className="w-11 h-11 rounded-xl bg-accent grid place-items-center text-onAccent font-bold">{form.name.trim().charAt(0).toUpperCase() || 'B'}</span>}
                            <span className="font-display text-lg font-semibold text-white drop-shadow">{form.name.trim() || 'Sans nom'}</span>
                          </div>
                        </div>
                        <div className="p-5 space-y-3 text-sm">
                          <p className="text-muted pretty">{form.description.trim() || 'Aucune description.'}</p>
                          {form.address && <p className="text-muted flex items-start gap-2"><i className="fa-solid fa-location-dot text-accentStrong mt-0.5" /> {form.address}</p>}
                          <div className="divider" />
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {[['Direction', form.codePatron], ['Service', form.codeServeur], ['Caisse', form.codeCaissier]].map(([l, c]) => (
                              <div key={l}><p className="eyebrow mb-1">{l}</p><p className="font-semibold tabnum text-ink tracking-widest">{c}</p></div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {!createdId && (
          <footer className="flex items-center justify-between gap-3 px-6 sm:px-10 py-5 border-t border-line/10">
            <button onClick={step === 0 ? onClose : back} className="btn btn-ghost">{step === 0 ? 'Annuler' : <><i className="fa-solid fa-arrow-left" /> Retour</>}</button>
            <button onClick={next} disabled={!canContinue || isCreating} className="btn btn-primary">
              {isCreating ? <><i className="fa-solid fa-circle-notch fa-spin" /> Création…</> : step === STEPS.length - 1 ? <>Créer l'établissement <i className="fa-solid fa-check" /></> : <>Continuer <i className="fa-solid fa-arrow-right" /></>}
            </button>
          </footer>
        )}
      </section>
    </div>
  );
};

export default CreateBarWizard;
