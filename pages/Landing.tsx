import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import QRCode from 'react-qr-code';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { markVisited } from '../lib/session';

gsap.registerPlugin(ScrollTrigger);

interface LandingProps {
  onStart: () => void;
}

const IMG = {
  hero: '/landing/hero-bar.webp',
  pour: '/landing/pour.webp',
  cocktails: '/landing/cocktails.webp',
  payment: '/landing/payment.webp',
  crowd: '/landing/crowd.webp',
  interior: '/landing/interior.webp',
  plate: '/landing/plate.webp',
  stepOrder: '/landing/step-order.webp',
  guideVideo: '/landing/guide-client.mp4',
  guidePoster: '/landing/guide-client-poster.webp',
  stepServe: '/landing/step-serve.webp',
};

const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  { n: '01', title: 'Le client scanne le QR code', text: 'Chaque table a son QR code. Un scan avec l’appareil photo du téléphone ouvre le menu du lieu, prix à jour et produits épuisés grisés.', icon: 'fa-qrcode', img: IMG.cocktails, alt: 'Chevalet BarSafe avec le QR code de la table 4, posé à côté des cocktails', qr: true },
  { n: '02', title: 'Il commande depuis sa table', text: 'Depuis son téléphone : panier, nom, mode de paiement. Le total est calculé par BarSafe, jamais par le téléphone.', icon: 'fa-mobile-screen-button', img: IMG.stepOrder, alt: 'Client attablé qui consulte son téléphone à côté de son café' },
  { n: '03', title: 'Le service est alerté et sert', text: 'La commande sonne en temps réel chez les serveurs. Ils préparent, apportent les consommations et marquent la table comme servie.', icon: 'fa-bell-concierge', img: IMG.stepServe, alt: 'Serveuse apportant des cocktails sur un plateau' },
  { n: '04', title: 'La caisse encaisse', text: 'Espèces, carte ou Mobile Money. C’est le seul moment où le stock baisse. Personne d’autre ne peut y toucher.', icon: 'fa-cash-register', img: IMG.payment, alt: 'Client qui paie avec son téléphone au comptoir' },
];

const ROLES = [
  { label: 'Client', icon: 'fa-utensils', title: 'Commander sans attendre', text: 'Menu, panier, appel serveur et suivi de la commande en direct.', img: IMG.stepOrder, span: 'lg:col-span-3' },
  { label: 'Service', icon: 'fa-bell-concierge', title: 'Toutes les tables, d’un coup d’œil', text: 'Alertes en direct, prise de commande manuelle, statut servi.', img: IMG.stepServe, span: 'lg:col-span-3' },
  { label: 'Caisse', icon: 'fa-cash-register', title: 'Encaisser, rien d’autre', text: 'Validation des paiements. Le stock se déduit à cet instant précis.', img: IMG.payment, span: 'lg:col-span-2' },
  { label: 'Direction', icon: 'fa-crown', title: 'Piloter le lieu', text: 'Chiffre d’affaires, ventes par produit, réassort, alertes de stock bas, QR codes, export CSV.', img: IMG.interior, span: 'lg:col-span-4' },
];

const TICKER = ['Menu par QR code', 'Appel serveur', 'Mobile Money', 'Alertes stock bas', 'Temps réel', 'Export CSV', 'Plusieurs établissements', 'Mode clair et sombre'];

const FLOW = [
  { label: 'Commande prise', who: 'Service', icon: 'fa-pen-to-square' },
  { label: 'Servie à table', who: 'Service', icon: 'fa-utensils' },
  { label: 'Encaissée', who: 'Caisse', icon: 'fa-cash-register' },
  { label: 'Stock déduit', who: 'Automatique', icon: 'fa-boxes-stacked' },
];

/** Step 01 visual: a BarSafe table tent with a real QR code, on a bar table. Stock photos only show payment QRs. */
const QrTableVisual: React.FC<{ alt: string }> = ({ alt }) => {
  const reduce = useReducedMotion();
  const menuUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://barsafe.app'}/b/demo`;
  return (
    <div role="img" aria-label={alt} className="absolute inset-0 overflow-hidden">
      <img src={IMG.cocktails} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-[3px]" />
      <div className="absolute inset-0 bg-[#0d0a08]/45" aria-hidden="true" />
      <div className="absolute inset-0 grid place-items-center p-6">
        <div className="relative -rotate-3 w-[13.5rem] sm:w-[15rem] rounded-[1.6rem] bg-[#FFFDF9] p-5 pb-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] text-[#1A1512]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-display font-semibold">
              <span className="w-7 h-7 rounded-lg bg-[#E0A33E] grid place-items-center text-xs"><i className="fa-solid fa-martini-glass-citrus" aria-hidden="true"></i></span>
              BarSafe
            </span>
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#6B5D4F]">Table 4</span>
          </div>
          <div className="relative mt-4 rounded-xl bg-white p-3 border border-[#1A1512]/10 overflow-hidden">
            <QRCode value={menuUrl} size={256} fgColor="#1A1512" style={{ width: '100%', height: 'auto' }} />
            {!reduce && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-2 h-0.5 rounded-full bg-[#E0A33E] shadow-[0_0_14px_2px_rgba(224,163,62,0.75)]"
                initial={{ top: '8%' }}
                animate={{ top: ['8%', '92%', '8%'] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>
          <p className="mt-4 text-center font-display text-lg font-semibold leading-tight">Scannez pour commander</p>
          <p className="mt-1 text-center text-xs text-[#6B5D4F]">Menu, prix et commande depuis votre téléphone</p>
        </div>
      </div>
    </div>
  );
};

const StepVisual: React.FC<{ step: typeof STEPS[number] }> = ({ step }) =>
  'qr' in step && step.qr
    ? <QrTableVisual alt={step.alt} />
    : <img src={step.img} alt={step.alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />;

/** The client guide video (HyperFrames render, `video/`): muted autoplay loop, with a sound toggle.
 *  With reduced motion it does not autoplay; the poster shows and a tap starts it. */
const HeroVideo: React.FC = () => {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) v.play().catch(() => { /* blocked: the user can tap again */ });
  };
  const start = () => { ref.current?.play().catch(() => { /* autoplay blocked */ }); };

  return (
    <>
      <video
        ref={ref}
        className="absolute inset-0 w-full h-full object-cover"
        src={IMG.guideVideo}
        poster={IMG.guidePoster}
        autoPlay={!reduce}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Vidéo : comment commander avec BarSafe, du scan du QR code au paiement"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {!playing && (
        <button onClick={start} className="absolute inset-0 grid place-items-center bg-black/20" aria-label="Lancer la vidéo">
          <span className="w-16 h-16 rounded-full bg-accent text-onAccent grid place-items-center text-xl shadow-lift"><i className="fa-solid fa-play ml-1" aria-hidden="true"></i></span>
        </button>
      )}
      <button
        onClick={toggleSound}
        className={`absolute bottom-4 right-4 h-11 rounded-full text-white flex items-center justify-center gap-2 backdrop-blur-sm transition-colors ${muted ? 'px-4 bg-accent !text-onAccent font-semibold text-sm shadow-lift' : 'w-11 bg-black/55 hover:bg-black/70'}`}
        aria-label={muted ? 'Écouter la voix off' : 'Couper le son'}
        aria-pressed={!muted}
      >
        <i className={`fa-solid ${muted ? 'fa-volume-high' : 'fa-volume-xmark'}`} aria-hidden="true"></i>
        {muted && <span>Écouter</span>}
      </button>
    </>
  );
};

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.8, ease: EASE, delay }}
  >
    {children}
  </motion.div>
);

const Landing: React.FC<LandingProps> = ({ onStart }) => {
  const root = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  // Seeing the landing once is enough: next visits go straight to onboarding.
  useEffect(() => { markVisited(); }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Ticker: seamless infinite loop (content is duplicated in the DOM)
        gsap.to('[data-ticker]', { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });

        // Role cards: images drift inside their frames
        gsap.utils.toArray<HTMLElement>('[data-drift]').forEach(el => {
          gsap.fromTo(el, { yPercent: -8 }, {
            yPercent: 8, ease: 'none',
            scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
          });
        });

        // Anti-fraud flow: nodes light up one by one, line fills, scrubbed to scroll
        const tl = gsap.timeline({
          scrollTrigger: { trigger: '[data-flow]', start: 'top 75%', end: 'bottom 45%', scrub: 0.6 },
        });
        tl.fromTo('[data-flow-line]', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 3 }, 0);
        gsap.utils.toArray<HTMLElement>('[data-flow-node]').forEach((node, i) => {
          tl.fromTo(node, { opacity: 0.25, y: 14 }, { opacity: 1, y: 0, duration: 0.5 }, i * 0.85);
        });

        // Final CTA image zoom-out
        gsap.fromTo('[data-cta-img]', { scale: 1.18 }, {
          scale: 1, ease: 'none',
          scrollTrigger: { trigger: '[data-cta]', start: 'top bottom', end: 'center center', scrub: true },
        });
      });

      // "How it works": pinned walkthrough on large screens only
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        ScrollTrigger.create({
          trigger: stepsRef.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * (STEPS.length - 0.4)}`,
          pin: true,
          scrub: true,
          onUpdate: self => {
            const i = Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length));
            setActive(prev => (prev === i ? prev : i));
          },
        });
        gsap.fromTo('[data-steps-progress]', { scaleY: 0 }, {
          scaleY: 1, ease: 'none',
          scrollTrigger: { trigger: stepsRef.current, start: 'top top', end: () => `+=${window.innerHeight * (STEPS.length - 0.4)}`, scrub: true },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const heroWords = ['Votre', 'bar,', 'du', 'QR', 'code', 'à', 'la', 'caisse.'];

  return (
    <div ref={root} className="text-ink overflow-x-clip">
      {/* ---------------- Nav ---------------- */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="fixed top-0 inset-x-0 z-50"
      >
        <div className="max-w-content mx-auto px-4 sm:px-6 pt-4">
          <nav className="flex items-center justify-between gap-4 rounded-2xl border border-line/10 bg-bg/75 backdrop-blur-xl px-3 sm:px-4 h-16 shadow-soft">
            <a href="#top" className="flex items-center gap-3" aria-label="BarSafe, haut de page">
              <span className="w-10 h-10 rounded-xl bg-accent grid place-items-center shadow-[0_8px_20px_-8px_rgb(var(--accent)/0.6)]">
                <i className="fa-solid fa-martini-glass-citrus text-onAccent" aria-hidden="true"></i>
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">BarSafe</span>
            </a>
            <div className="hidden md:flex items-center gap-7 text-sm font-medium text-muted">
              <a href="#fonctionnement" className="hover:text-ink transition-colors">Fonctionnement</a>
              <a href="#roles" className="hover:text-ink transition-colors">Rôles</a>
              <a href="#securite" className="hover:text-ink transition-colors">Anti-fraude</a>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle className="hidden sm:inline-flex" />
              <Link to="/connexion" className="btn btn-ghost btn-sm hidden sm:inline-flex">Se connecter</Link>
              <button onClick={onStart} className="btn btn-primary btn-sm">Commencer</button>
            </div>
          </nav>
        </div>
      </motion.header>

      {/* ---------------- Hero ---------------- */}
      <section id="top" data-hero className="relative max-w-content mx-auto px-4 sm:px-6 pt-32 sm:pt-36 pb-16 lg:pb-24">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          <div className="lg:col-span-6 xl:col-span-6">
            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
              className="inline-flex items-center gap-2 rounded-full border border-line/12 bg-surface/70 px-3.5 py-1.5 text-xs font-semibold text-muted"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-positive" aria-hidden="true"></span>
              Bars, maquis et lounges · Togo
            </motion.p>

            <h1 className="mt-6 font-display text-[2.6rem] leading-[1.02] sm:text-6xl xl:text-7xl font-semibold tracking-tight balance">
              {heroWords.map((w, i) => (
                <span key={i} className="inline-block overflow-hidden align-bottom pb-1 mr-[0.22em]">
                  <motion.span
                    className={`inline-block ${i >= 3 && i <= 4 ? 'text-accentStrong italic' : ''}`}
                    initial={reduce ? false : { y: '105%' }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.25 + i * 0.06 }}
                  >
                    {w}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.8 }}
              className="mt-6 text-lg text-muted max-w-xl leading-relaxed pretty"
            >
              BarSafe relie vos clients, votre service, votre caisse et votre direction. Le menu se commande par QR code,
              les alertes arrivent en direct et le stock ne baisse qu’au moment de l’encaissement.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.95 }}
              className="mt-9 flex flex-col sm:flex-row gap-3"
            >
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={onStart} className="btn btn-primary btn-lg">
                Commencer gratuitement <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </motion.button>
              <a href="#fonctionnement" className="btn btn-outline btn-lg">
                <i className="fa-solid fa-play text-xs" aria-hidden="true"></i> Voir comment ça marche
              </a>
            </motion.div>

            <motion.ul
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 1.1 } } }}
              className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl"
            >
              {[
                { icon: 'fa-shield-halved', t: 'Stock verrouillé' },
                { icon: 'fa-bolt', t: 'Temps réel' },
                { icon: 'fa-key', t: '3 codes d’accès' },
              ].map(f => (
                <motion.li
                  key={f.t}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
                  className="flex items-center gap-2.5 text-sm font-medium text-ink"
                >
                  <span className="w-8 h-8 rounded-lg bg-accent/14 text-accentStrong grid place-items-center text-xs shrink-0"><i className={`fa-solid ${f.icon}`} aria-hidden="true"></i></span>
                  {f.t}
                </motion.li>
              ))}
            </motion.ul>
          </div>

          {/* Guide video, with the platform's two sides (service, caisse) next to it on large screens */}
          <div className="lg:col-span-6 xl:col-span-6 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[22rem] lg:mr-6 xl:mr-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.94, rotate: 1.5 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
                className="relative w-full aspect-[9/16] rounded-[2.5rem] overflow-hidden shadow-lift border border-line/10 bg-[#151210]"
              >
                <HeroVideo />
              </motion.div>

              {/* Floating UI: incoming order (beside the video, never over it) */}
              <motion.div
                initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 1.0 }}
                className="hidden lg:block absolute right-full mr-6 top-24 w-[15.5rem]"
              >
                <motion.div
                  animate={reduce ? undefined : { y: [0, -8, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="card !rounded-2xl p-3.5 flex items-center gap-3"
                >
                  <span className="w-10 h-10 rounded-xl bg-accent/16 text-accentStrong grid place-items-center shrink-0"><i className="fa-solid fa-receipt" aria-hidden="true"></i></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink truncate">Nouvelle commande</span>
                    <span className="block text-xs text-muted truncate">Table 4 · 2 bières, 1 brochette</span>
                  </span>
                </motion.div>
              </motion.div>

              {/* Floating UI: payment validated */}
              <motion.div
                initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 1.25 }}
                className="hidden lg:block absolute right-full mr-6 bottom-24 w-[14.5rem]"
              >
                <motion.div
                  animate={reduce ? undefined : { y: [0, 8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                  className="card !rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">Paiement validé</span>
                    <span className="badge badge-positive"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
                  </div>
                  <p className="font-display text-2xl font-semibold text-ink mt-1.5 tabnum">7 500 <span className="text-xs font-sans text-muted">FCFA</span></p>
                  <p className="text-xs text-muted mt-1 flex items-center gap-1.5"><i className="fa-solid fa-mobile-screen-button" aria-hidden="true"></i> Mobile Money · stock mis à jour</p>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Ticker ---------------- */}
      <div className="border-y border-line/10 bg-surface/60 py-5 overflow-hidden" aria-hidden="true">
        <div data-ticker className="flex w-max gap-12 whitespace-nowrap">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-12 font-display text-xl sm:text-2xl text-muted">
              {t}<i className="fa-solid fa-asterisk text-accent text-sm"></i>
            </span>
          ))}
        </div>
      </div>

      {/* ---------------- How it works (pinned on desktop) ---------------- */}
      <section id="fonctionnement" ref={stepsRef} className="relative lg:h-screen lg:flex lg:items-center">
        <div className="max-w-content mx-auto px-4 sm:px-6 py-24 lg:pt-24 lg:pb-6 w-full">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <Reveal>
                <p className="eyebrow text-accentStrong mb-4">Comment ça marche</p>
                <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05] balance">
                  Quatre gestes. Aucune fuite.
                </h2>
              </Reveal>

              <div className="relative mt-10 pl-6">
                <span className="absolute left-0 top-1 bottom-1 w-px bg-line/12" aria-hidden="true"></span>
                <span data-steps-progress className="hidden lg:block absolute left-0 top-1 bottom-1 w-px bg-accent origin-top" aria-hidden="true"></span>
                <ol className="space-y-8 lg:space-y-5">
                  {STEPS.map((s, i) => (
                    <li key={s.n} className={`transition-opacity duration-500 ${i === active ? 'lg:opacity-100' : 'lg:opacity-40'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-9 h-9 rounded-xl grid place-items-center text-sm transition-colors duration-500 ${i === active ? 'bg-accent text-onAccent' : 'bg-surface2 text-muted border border-line/10'}`}>
                          <i className={`fa-solid ${s.icon}`} aria-hidden="true"></i>
                        </span>
                        <span className="text-xs font-bold tabnum text-faint tracking-widest">{s.n}</span>
                      </div>
                      <h3 className="mt-3 lg:mt-2 font-display text-2xl lg:text-xl xl:text-2xl font-semibold text-ink">{s.title}</h3>
                      <p className={`mt-1.5 text-muted leading-relaxed max-w-md pretty ${i === active ? '' : 'lg:hidden'}`}>{s.text}</p>
                      {/* Mobile / reduced motion: image inline */}
                      <div className="lg:hidden relative mt-5 w-full aspect-[4/3] rounded-3xl overflow-hidden border border-line/10">
                        <StepVisual step={s} />
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-7">
              <div className="relative aspect-[5/4] rounded-[2.5rem] overflow-hidden shadow-lift border border-line/10 bg-surface2">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={STEPS[active].n}
                    initial={{ opacity: 0, scale: 1.08 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.7, ease: EASE }}
                    className="absolute inset-0"
                  >
                    <StepVisual step={STEPS[active]} />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={active}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="font-display text-2xl text-[#F4ECE0]"
                    >
                      {STEPS[active].n} · {STEPS[active].title}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Roles bento ---------------- */}
      <section id="roles" className="max-w-content mx-auto px-4 sm:px-6 py-24 sm:py-32">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-accentStrong mb-4">Un espace par rôle</p>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05] balance">
            Chacun voit ce dont il a besoin. Rien de plus.
          </h2>
          <p className="mt-5 text-muted text-lg leading-relaxed pretty">
            Trois codes d’accès séparés pour la direction, le service et la caisse. Le client, lui, n’a besoin que de son téléphone.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
          {ROLES.map((r, i) => (
            <motion.article
              key={r.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8, ease: EASE, delay: (i % 2) * 0.1 }}
              whileHover={reduce ? undefined : { y: -6 }}
              className={`group card overflow-hidden flex flex-col ${r.span}`}
            >
              <div className="relative h-56 overflow-hidden">
                <img data-drift src={r.img} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 w-full h-[120%] -top-[10%] object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />
                <span className="absolute top-4 left-4 badge !bg-black/45 !text-white backdrop-blur-sm">
                  <i className={`fa-solid ${r.icon}`} aria-hidden="true"></i> {r.label}
                </span>
              </div>
              <div className="p-6">
                <h3 className="font-display text-xl font-semibold text-ink">{r.title}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed pretty">{r.text}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ---------------- Anti-fraud band ---------------- */}
      <section id="securite" className="relative isolate overflow-hidden">
        <img src={IMG.pour} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 -z-10 w-full h-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[#0d0a08]/88" aria-hidden="true" />
        <div className="max-w-content mx-auto px-4 sm:px-6 py-24 sm:py-32 text-[#F4ECE0]">
          <Reveal className="max-w-3xl">
            <p className="eyebrow !text-[#E0A33E] mb-4">Anti-fraude</p>
            <h2 className="font-display text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.02] balance">
              Le stock ne bouge qu’à l’encaissement.
            </h2>
            <p className="mt-6 text-lg text-[#F4ECE0]/75 leading-relaxed max-w-2xl pretty">
              Le service prend la commande, seule la caisse la valide. Les prix et les totaux sont calculés côté serveur,
              une commande ne peut pas être encaissée deux fois et chaque action est liée à une session.
            </p>
          </Reveal>

          <div data-flow className="relative mt-16">
            <span className="absolute left-[12.5%] right-[12.5%] top-7 h-px bg-[#F4ECE0]/15 hidden sm:block" aria-hidden="true"></span>
            <span data-flow-line className="absolute left-[12.5%] right-[12.5%] top-7 h-px bg-[#E0A33E] origin-left hidden sm:block" aria-hidden="true"></span>
            <ol className="relative grid grid-cols-2 sm:grid-cols-4 gap-y-10 gap-x-4">
              {FLOW.map((f, i) => (
                <li key={f.label} data-flow-node className="flex flex-col items-center text-center">
                  <span className={`w-14 h-14 rounded-2xl grid place-items-center text-lg ${i === FLOW.length - 1 ? 'bg-[#E0A33E] text-[#1A1512]' : 'bg-[#2B241D] text-[#E0A33E] border border-[#F4ECE0]/10'}`}>
                    <i className={`fa-solid ${f.icon}`} aria-hidden="true"></i>
                  </span>
                  <span className="mt-4 font-semibold">{f.label}</span>
                  <span className="text-xs uppercase tracking-[0.16em] text-[#F4ECE0]/55 mt-1">{f.who}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section data-cta className="max-w-content mx-auto px-4 sm:px-6 py-24 sm:py-32">
        <div className="relative isolate overflow-hidden rounded-[2.5rem] shadow-lift">
          <img data-cta-img src={IMG.interior} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 -z-10 w-full h-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0d0a08]/92 via-[#0d0a08]/75 to-[#0d0a08]/30" aria-hidden="true" />
          <div className="px-6 sm:px-14 py-16 sm:py-24 max-w-2xl text-[#F4ECE0]">
            <Reveal>
              <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05] balance">
                Ouvrez votre bar sur BarSafe ce soir.
              </h2>
              <p className="mt-5 text-lg text-[#F4ECE0]/80 leading-relaxed pretty">
                Nom, visuels, adresse et trois codes d’accès. Moins d’une minute, puis imprimez vos QR codes de table.
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
                onClick={onStart}
                className="btn btn-primary btn-lg mt-9"
              >
                Créer ou rejoindre un établissement <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </motion.button>
            </Reveal>
          </div>
        </div>
      </section>

      <footer className="border-t border-line/10">
        <div className="max-w-content mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <span className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-accent grid place-items-center"><i className="fa-solid fa-martini-glass-citrus text-onAccent text-xs" aria-hidden="true"></i></span>
            BarSafe · Conçu au Togo par Codorah
          </span>
          <ThemeToggle className="sm:hidden" />
          <nav className="flex items-center gap-5" aria-label="Liens légaux">
            <Link to="/connexion" className="hover:text-ink">Se connecter</Link>
            <Link to="/mentions-legales" className="hover:text-ink">Mentions légales</Link>
            <Link to="/confidentialite" className="hover:text-ink">Confidentialité</Link>
            <Link to="/confidentialite#cookies" className="hover:text-ink">Cookies</Link>
            <span className="text-faint">Photos : Unsplash</span>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
