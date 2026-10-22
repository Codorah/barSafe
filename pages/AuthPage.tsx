import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import SiteHeader from '../components/SiteHeader';
import { AccountType, useAuth } from '../lib/auth';
import { ApiError } from '../api';

type Mode = 'login' | 'signup' | 'reset';

const TYPES: { value: AccountType; title: string; text: string; icon: string }[] = [
  { value: 'OWNER', title: 'Je gère un établissement', text: 'Créer mon bar, gérer le menu, le stock et l’équipe.', icon: 'fa-store' },
  { value: 'CUSTOMER', title: 'Je suis client', text: 'Retrouver mes commandes dans tous les bars BarSafe.', icon: 'fa-user' },
];

/** Only same-site paths are accepted as a redirect target. */
const safeNext = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/compte');

/** Errors sent back by Google/Supabase in the redirect URL (query or hash). */
const oauthError = (params: URLSearchParams): { title: string; message: string } | null => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = params.get('error') || hash.get('error');
  if (!code) return null;
  const desc = (params.get('error_description') || hash.get('error_description') || '').toLowerCase();
  if (code === 'access_denied') return { title: 'Connexion Google annulée', message: 'Vous pouvez réessayer, ou utiliser votre e-mail et un mot de passe.' };
  if (desc.includes('provider is not enabled') || desc.includes('unsupported provider')) {
    return { title: 'Google pas encore disponible', message: 'La connexion avec Google n’est pas encore activée. Utilisez votre e-mail en attendant.' };
  }
  return { title: 'Connexion Google impossible', message: 'Google n’a pas pu confirmer votre identité. Réessayez dans un instant.' };
};

const GoogleIcon: React.FC = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const AuthPage: React.FC<{ initialMode: 'login' | 'signup' }> = ({ initialMode }) => {
  const { session, loading, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [mode, setMode] = useState<Mode>(initialMode);
  const [type, setType] = useState<AccountType>(params.get('type') === 'OWNER' ? 'OWNER' : params.get('type') === 'CUSTOMER' ? 'CUSTOMER' : 'OWNER');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(() => oauthError(params));
  const [googleBusy, setGoogleBusy] = useState(false);
  const [done, setDone] = useState<{ title: string; message: string } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  // The alert sits above the form: bring it into view on long (sign-up) forms
  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [error]);

  if (!loading && session && !done) return <Navigate to={next} replace />;

  const continueWithGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      // Sign-up tab: the chosen account type is applied when Google sends the user back
      await signInWithGoogle(mode === 'signup' ? type : 'CUSTOMER', next);
    } catch (err) {
      const f = ApiError.from(err, 'google');
      setError({ title: f.title, message: f.message });
      setGoogleBusy(false);
    }
  };

  const switchMode = (m: Mode) => { setMode(m); setError(null); setDone(null); };

  const validate = (): string | null => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Entrez une adresse e-mail valide.';
    if (mode === 'reset') return null;
    if (mode === 'signup') {
      if (fullName.trim().length < 2) return 'Indiquez votre nom (2 caractères minimum).';
      if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) return 'Le mot de passe doit contenir au moins 8 caractères, avec des lettres et des chiffres.';
      if (!consent) return 'Acceptez la politique de confidentialité pour créer votre compte.';
    } else if (!password) {
      return 'Entrez votre mot de passe.';
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const invalid = validate();
    if (invalid) return setError({ title: 'Formulaire incomplet', message: invalid });
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        // Redirect happens once the auth context has the session (see the <Navigate> above)
      } else if (mode === 'signup') {
        const { needsConfirmation } = await signUp({ email, password, fullName, phone, type });
        if (needsConfirmation) {
          setDone({ title: 'Vérifiez votre boîte mail', message: `Un lien d’activation a été envoyé à ${email.trim()}. Ouvrez-le pour finaliser votre compte.` });
        }
      } else {
        await resetPassword(email);
        setDone({ title: 'E-mail envoyé', message: 'Si un compte existe pour cette adresse, vous recevrez un lien pour choisir un nouveau mot de passe.' });
      }
    } catch (err) {
      const f = ApiError.from(err, mode);
      setError({ title: f.title, message: f.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-10 pb-10">
      <SiteHeader />

      <div className="max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div className="text-center mb-7">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {mode === 'login' ? 'Bon retour' : mode === 'signup' ? 'Créer un compte' : 'Mot de passe oublié'}
            </h1>
            <p className="text-sm text-muted mt-1.5">
              {mode === 'login' && 'Connectez-vous à votre compte BarSafe.'}
              {mode === 'signup' && 'Gratuit. Vous scannez seulement un QR code ? Aucun compte n’est nécessaire.'}
              {mode === 'reset' && 'Recevez un lien pour choisir un nouveau mot de passe.'}
            </p>
          </div>

          <div className="panel p-6 sm:p-8">
            {mode !== 'reset' && (
              <div className="segmented w-full mb-6" role="tablist">
                <button role="tab" aria-selected={mode === 'login'} onClick={() => switchMode('login')} className={`seg-item flex-1 ${mode === 'login' ? 'seg-item-active' : ''}`}>Connexion</button>
                <button role="tab" aria-selected={mode === 'signup'} onClick={() => switchMode('signup')} className={`seg-item flex-1 ${mode === 'signup' ? 'seg-item-active' : ''}`}>Inscription</button>
              </div>
            )}

            {done ? (
              <div className="text-center py-4" role="status">
                <div className="w-14 h-14 rounded-2xl bg-positive/14 text-positive grid place-items-center mx-auto text-xl mb-4"><i className="fa-solid fa-envelope-circle-check" aria-hidden="true"></i></div>
                <p className="font-display text-xl font-semibold">{done.title}</p>
                <p className="text-sm text-muted mt-2 pretty">{done.message}</p>
                <button onClick={() => switchMode('login')} className="btn btn-outline mt-6 mx-auto">Retour à la connexion</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4" noValidate>
                {error && (
                  <div ref={errorRef} className="flex items-start gap-3 rounded-2xl bg-danger/12 text-danger px-4 py-3 text-sm animate-pop-in" role="alert">
                    <i className="fa-solid fa-circle-exclamation mt-0.5" aria-hidden="true"></i>
                    <span><span className="block font-semibold">{error.title}</span><span className="block opacity-90">{error.message}</span></span>
                  </div>
                )}

                {mode === 'signup' && (
                  <fieldset>
                      <legend className="label">Type de compte</legend>
                      <div className="grid grid-cols-1 gap-2">
                        {TYPES.map(t => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setType(t.value)}
                            aria-pressed={type === t.value}
                            className={`rounded-2xl border p-3.5 flex items-center gap-3 text-left transition-all ${type === t.value ? 'border-accent bg-accent/10' : 'border-line/12 hover:border-line/25'}`}
                          >
                            <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${type === t.value ? 'bg-accent text-onAccent' : 'bg-surface2 text-muted'}`}><i className={`fa-solid ${t.icon}`} aria-hidden="true"></i></span>
                            <span>
                              <span className="block text-sm font-semibold text-ink">{t.title}</span>
                              <span className="block text-xs text-muted">{t.text}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                )}

                {mode !== 'reset' && (
                  <>
                    <button type="button" onClick={continueWithGoogle} disabled={googleBusy || busy} className="btn btn-outline btn-block btn-lg !bg-surface">
                      {googleBusy ? <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> : <GoogleIcon />}
                      Continuer avec Google
                    </button>
                    {mode === 'signup' && (
                      <p className="text-xs text-faint -mt-1 text-center pretty">
                        En continuant avec Google, vous acceptez la{' '}
                        <Link to="/confidentialite" className="link" target="_blank">politique de confidentialité</Link>.
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-faint" aria-hidden="true">
                      <span className="h-px flex-1 bg-line/20"></span>ou avec votre e-mail<span className="h-px flex-1 bg-line/20"></span>
                    </div>
                  </>
                )}

                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="label" htmlFor="fullName">{type === 'OWNER' ? 'Nom du responsable' : 'Votre nom'}</label>
                      <input id="fullName" className="field" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={80} />
                    </div>
                    <div>
                      <label className="label" htmlFor="phone">Téléphone <span className="text-faint font-normal">(facultatif)</span></label>
                      <input id="phone" className="field" type="tel" autoComplete="tel" inputMode="tel" placeholder="+228 …" value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} />
                    </div>
                  </>
                )}

                <div>
                  <label className="label" htmlFor="email">E-mail</label>
                  <input id="email" className="field" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                {mode !== 'reset' && (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="label" htmlFor="password">Mot de passe</label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => switchMode('reset')} className="text-xs font-semibold link mb-2">Mot de passe oublié ?</button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        className="field pr-12"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink w-8 h-8" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
                      </button>
                    </div>
                    {mode === 'signup' && <p className="text-xs text-faint mt-1.5">8 caractères minimum, avec des lettres et des chiffres.</p>}
                  </div>
                )}

                {mode === 'signup' && (
                  <label className="flex items-start gap-3 text-sm text-muted cursor-pointer">
                    <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 w-4 h-4 accent-[rgb(var(--accent))]" />
                    <span>J’ai lu la <Link to="/confidentialite" className="link" target="_blank">politique de confidentialité</Link> et j’accepte le traitement de mes données pour la gestion de mon compte.</span>
                  </label>
                )}

                <button type="submit" disabled={busy} className="btn btn-primary btn-block btn-lg">
                  {busy ? <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> : (
                    mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien'
                  )}
                </button>

                {mode === 'reset' && (
                  <button type="button" onClick={() => switchMode('login')} className="btn btn-ghost btn-block">Retour à la connexion</button>
                )}
              </form>
            )}
          </div>

          <p className="text-center text-xs text-faint mt-6 pretty">
            Client d’un bar ? Scannez simplement le QR code de votre table : pas besoin de compte.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
