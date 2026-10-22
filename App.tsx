import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate, Link } from 'react-router-dom';
import { AppState, UserRole, OrderStatus, Establishment, Product, PaymentMethod } from './types';
import { api, ApiError, NewEstablishmentInput, SESSION_EXPIRED } from './api';
import { loadSession, saveSession, hasVisited, StoredSession } from './lib/session';
import { addTracked, getTracked } from './lib/tracking';
import { useAuth } from './lib/auth';

// Pages
import BarList from './pages/BarList';
import AuthPage from './pages/AuthPage';
import AccountPage from './pages/AccountPage';
import PrivacyPage from './pages/PrivacyPage';
import Login from './pages/Login';
import ClientMenu from './pages/ClientMenu';
import ServerDashboard from './pages/ServerDashboard';
import CashierDashboard from './pages/CashierDashboard';

// Heavy, route-level chunks: GSAP/Motion for the landing, Recharts for the owner dashboard
const Landing = lazy(() => import('./pages/Landing'));
const PatronDashboard = lazy(() => import('./pages/PatronDashboard'));

// Components
import Navbar from './components/Navbar';
import SplashScreen from './components/SplashScreen';
import Loader from './components/Loader';
import ErrorState from './components/ErrorState';
import CookieBanner from './components/CookieBanner';
import { Toaster, ToastItem, OfflineBanner } from './components/Toaster';

/** Routes that draw their own full-bleed layout (no navbar, no centered container). */
const LANDING_PATHS = ['/', '/decouvrir'];
/** Public pages with their own <SiteHeader>, never the role navbar. */
const PUBLIC_PATHS = ['/etablissements', '/connexion', '/inscription', '/compte', '/confidentialite'];

const BAR_LOADING = 'Chargement des données du bar…';

/** First visit on this device: landing page. Returning visitor: straight to onboarding.
 *  Read once on mount, since the landing itself marks the device as visited. */
const HomeGate: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const [firstVisit] = useState(() => !hasVisited());
  return firstVisit ? <Landing onStart={onStart} /> : <Navigate to="/etablissements" replace />;
};

const QRCodeRedirect: React.FC<{ establishments: Establishment[]; loading: boolean; onMapGuest: (barId: string) => void }> = ({ establishments, loading, onMapGuest }) => {
  const { barId } = useParams();
  const found = !!barId && establishments.some(e => e.id === barId);
  useEffect(() => {
    if (found && barId) onMapGuest(barId);
  }, [found, barId, onMapGuest]);

  if (!loading && !found) {
    return (
      <div className="card p-10 text-center max-w-md mx-auto mt-6">
        <p className="font-display text-xl text-ink mb-1">Établissement introuvable</p>
        <p className="text-sm text-muted">Ce QR code ne correspond à aucun lieu actif.</p>
      </div>
    );
  }
  return <Loader label="Ouverture du menu…" />;
};

const ProtectedRoute: React.FC<{ children: React.ReactElement; currentUser: AppState['currentUser']; restoring: boolean; allowedRoles: UserRole[]; fallbackPath: string }> = ({ children, currentUser, restoring, allowedRoles, fallbackPath }) => {
  if (restoring) return <Loader label="Reprise de la session…" />;
  if (!currentUser || !allowedRoles.includes(currentUser.role)) return <Navigate to={fallbackPath} replace />;
  return children;
};

const AccessDenied: React.FC = () => (
  <div className="card p-10 text-center max-w-md mx-auto mt-6">
    <p className="font-display text-xl text-ink mb-1">Accès refusé</p>
    <p className="text-sm text-muted">Cet établissement n'est pas accessible.</p>
  </div>
);

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({ establishments: [], selectedEstablishmentId: null, currentUser: null });
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(() => loadSession() !== null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [barError, setBarError] = useState<ApiError | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, session, becomeOwner } = useAuth();

  const dismissToast = useCallback((id: number) => setToasts(ts => ts.filter(t => t.id !== id)), []);
  const pushToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    setToasts(ts => {
      // Same message already on screen (e.g. realtime refresh failing repeatedly): don't stack it
      if (ts.some(x => x.title === t.title && x.message === t.message)) return ts;
      return [...ts, { ...t, id: Date.now() + Math.random() }].slice(-3);
    });
  }, []);

  /** Shows any failure as a readable notification, with a retry when it can help. */
  const showError = useCallback((err: unknown, retry?: () => void) => {
    const e = ApiError.from(err, 'ui');
    pushToast({
      title: e.title,
      message: e.message,
      tone: e.tone,
      hint: e.hint,
      action: retry && e.retryable ? { label: 'Réessayer', run: retry } : undefined,
    });
  }, [pushToast]);

  const currentBar = state.establishments.find(e => e.id === state.selectedEstablishmentId);

  // Read inside refreshBar without re-creating it (and re-subscribing) on every login
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;
  /** Bumped when this device places an order, to listen to its new tracking topic. */
  const [trackVersion, setTrackVersion] = useState(0);

  /** Menu is public; orders/notifications come only from what this viewer may see. */
  const refreshBar = useCallback(async (barId: string) => {
    try {
      const staffToken = tokenRef.current;
      const [products, activity] = await Promise.all([
        api.getProducts(barId),
        staffToken
          ? api.getBarActivity(staffToken)
          : api.trackOrders(getTracked(barId)).then(orders => ({ orders, notifications: [] })),
      ]);
      const data = { products, ...activity };
      setBarError(null);
      setState(s => ({
        ...s,
        establishments: s.establishments.map(e => (e.id === barId ? { ...e, ...data, loaded: true } : e)),
      }));
    } catch (e) {
      const err = ApiError.from(e, 'refreshBar');
      setBarError(err);
      showError(err, () => refreshBar(barId));
    }
  }, [showError]);

  const startSession = useCallback((s: StoredSession) => {
    saveSession(s);
    setToken(s.token ?? null);
    setState(prev => ({ ...prev, selectedEstablishmentId: s.establishmentId, currentUser: { name: s.name, role: s.role, establishmentId: s.establishmentId } }));
  }, []);

  const endSession = useCallback(() => {
    saveSession(null);
    setToken(null);
    setState(prev => ({ ...prev, currentUser: null }));
  }, []);

  /** Establishments list, then restore the previous session (checked server-side for staff). */
  const boot = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    let list: Establishment[];
    try {
      list = await api.getEstablishments();
    } catch (e) {
      setLoadError(ApiError.from(e, 'boot'));
      setLoading(false);
      setRestoring(false);
      return;
    }
    setState(s => ({ ...s, establishments: list }));
    setLoading(false);

    const saved = loadSession();
    if (saved && list.some(e => e.id === saved.establishmentId)) {
      if (saved.role === UserRole.CLIENT) {
        startSession(saved);
      } else if (saved.token) {
        try {
          const live = await api.staffSession(saved.token);
          if (live && live.establishmentId === saved.establishmentId && live.role === saved.role) {
            startSession(saved);
          } else {
            saveSession(null);
            pushToast({ title: 'Session expirée', message: 'Reconnectez-vous avec votre code d’accès.', tone: 'info' });
          }
        } catch (e) {
          // Server unreachable: keep the user in, every action is re-checked server-side anyway.
          startSession(saved);
          showError(e);
        }
      }
    } else if (saved) {
      saveSession(null);
    }
    setRestoring(false);
  }, [startSession, pushToast, showError]);

  useEffect(() => { boot(); }, [boot]);

  // Load data + realtime for the selected establishment
  useEffect(() => {
    const id = state.selectedEstablishmentId;
    if (!id || loading) return;
    refreshBar(id);
    const topics = token ? [`bar:${id}`] : getTracked(id).map(t => `order:${t}`);
    return api.subscribe(id, topics, () => { refreshBar(id); });
  }, [state.selectedEstablishmentId, loading, refreshBar, token, trackVersion]);

  /** Runs a staff mutation, surfaces errors and handles expired sessions. Resolves to success. */
  const run = useCallback(async function runAction(action: (t: string) => Promise<unknown>): Promise<boolean> {
    if (!token) {
      endSession();
      pushToast({ title: 'Session expirée', message: 'Reconnectez-vous avec votre code d’accès.', tone: 'info' });
      navigate('/login');
      return false;
    }
    try {
      await action(token);
      return true;
    } catch (e) {
      const err = ApiError.from(e, 'mutation');
      if (err.code === SESSION_EXPIRED) {
        endSession();
        navigate('/login');
      }
      showError(err, () => { runAction(action); });
      return false;
    } finally {
      if (state.selectedEstablishmentId) refreshBar(state.selectedEstablishmentId);
    }
  }, [token, endSession, navigate, pushToast, showError, refreshBar, state.selectedEstablishmentId]);

  const handleSelectBar = (id: string) => {
    setState(prev => ({ ...prev, selectedEstablishmentId: id }));
    navigate('/login');
  };

  /** Bars attached to the signed-in owner account (enables code-free Direction access). */
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  useEffect(() => {
    if (profile?.role !== 'OWNER') { setOwnedIds([]); return; }
    api.myEstablishments().then(list => setOwnedIds(list.map(b => b.id))).catch(() => setOwnedIds([]));
  }, [profile?.id, profile?.role, state.establishments.length]);

  const openOwnedBar = (barId: string, staffToken: string) => {
    startSession({ name: 'Direction', role: UserRole.PATRON, establishmentId: barId, token: staffToken });
    navigate('/patron');
  };

  const enterAsOwner = async (barId: string) => {
    try {
      openOwnedBar(barId, await api.ownerSession(barId));
    } catch (e) {
      showError(e, () => enterAsOwner(barId));
    }
  };

  /** Only owner accounts can create a bar: route others to the right place. */
  const requestCreate = (): boolean => {
    if (!session) {
      pushToast({ title: 'Compte établissement requis', message: 'Créez un compte ou connectez-vous pour ouvrir votre bar sur BarSafe.', tone: 'info' });
      navigate(`/inscription?type=OWNER&next=${encodeURIComponent('/etablissements?creer=1')}`);
      return false;
    }
    if (profile?.role !== 'OWNER') {
      pushToast({
        title: 'Compte client',
        message: 'Passez en compte établissement pour créer votre bar. Votre historique de commandes est conservé.',
        tone: 'info',
        action: {
          label: 'Passer en compte établissement',
          run: async () => {
            try { await becomeOwner(); navigate('/etablissements?creer=1'); }
            catch (e) { showError(e); }
          },
        },
      });
      return false;
    }
    return true;
  };

  const handleCreate = async (input: NewEstablishmentInput): Promise<string | null> => {
    try {
      const id = await api.createEstablishment(input);
      const list = await api.getEstablishments();
      setState(prev => ({ ...prev, establishments: list }));
      return id;
    } catch (e) {
      showError(e);
      return null;
    }
  };

  const handleLogin = (user: { name: string; role: UserRole; establishmentId: string; token: string }) => {
    startSession(user);
    if (user.role === UserRole.PATRON) navigate('/patron');
    else if (user.role === UserRole.SERVEUR) navigate('/serveur');
    else navigate('/caissier');
  };

  const logout = () => {
    if (token) api.staffLogout(token);
    endSession();
    setState(prev => ({ ...prev, selectedEstablishmentId: null }));
    navigate('/etablissements');
  };

  const handleGuestAccess = useCallback((barId: string) => {
    startSession({ name: 'Client', role: UserRole.CLIENT, establishmentId: barId });
    navigate('/menu', { replace: true });
  }, [startSession, navigate]);

  // ---- mutations ----
  const placeClientOrder = async (items: { productId: string; quantity: number }[], table: number, method: PaymentMethod, clientName: string): Promise<string | null> => {
    if (!currentBar) return null;
    try {
      const tracking = await api.placeOrder(currentBar.id, { tableNumber: table, clientName, paymentMethod: method }, items);
      addTracked(currentBar.id, tracking);
      setTrackVersion(v => v + 1);
      return tracking;
    } catch (e) {
      showError(e);
      return null;
    } finally {
      refreshBar(currentBar.id);
    }
  };

  const callServer = async (table: number): Promise<boolean> => {
    if (!currentBar) return false;
    try {
      const sent = await api.callServer(currentBar.id, table);
      pushToast(sent
        ? { title: 'Serveur appelé', message: `Quelqu’un arrive à la table ${table}.`, tone: 'success' }
        : { title: 'Déjà appelé', message: 'Un serveur a été prévenu il y a moins d’une minute.', tone: 'info' });
      return sent;
    } catch (e) {
      showError(e, () => callServer(table));
      return false;
    }
  };

  const takeServerOrder = (items: { productId: string; quantity: number }[], table: number, clientName?: string) => {
    if (!currentBar) return;
    run(t => api.placeOrder(currentBar.id, { tableNumber: table, clientName, token: t }, items));
  };

  const isLanding = LANDING_PATHS.includes(location.pathname);
  const showNavbar = !isLanding && !PUBLIC_PATHS.includes(location.pathname) && state.selectedEstablishmentId;

  const overlays = (
    <>
      <Toaster toasts={toasts} onDismiss={dismissToast} />
      <OfflineBanner />
      <CookieBanner />
    </>
  );

  /** Bar-scoped screens: wait for data, show a retryable error instead of an endless loader. */
  const withBar = (render: (bar: Establishment) => React.ReactElement) => {
    if (!currentBar) return <AccessDenied />;
    if (!currentBar.loaded) {
      return barError
        ? <ErrorState error={barError} onRetry={() => { setBarError(null); refreshBar(currentBar.id); }} />
        : <Loader label={BAR_LOADING} />;
    }
    return render(currentBar);
  };

  if (isLanding) {
    return (
      <>
        {overlays}
        <Suspense fallback={<Loader fullscreen label="Préparation de la présentation…" />}>
        <Routes>
          <Route path="/" element={<HomeGate onStart={() => navigate('/etablissements')} />} />
          <Route path="/decouvrir" element={<Landing onStart={() => navigate('/etablissements')} />} />
        </Routes>
        </Suspense>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-ink">
      <SplashScreen ready={!loading} />
      {overlays}
      {showNavbar && (
        <Navbar barName={currentBar?.name || ''} user={state.currentUser} onLogout={logout} />
      )}

      <main className="flex-grow w-full max-w-content mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {loadError ? (
          <ErrorState error={loadError} onRetry={boot} />
        ) : (
        <Suspense fallback={<Loader label="Chargement…" />}>
        <Routes>
          <Route path="/etablissements" element={
            <BarList establishments={state.establishments} loading={loading} onSelect={handleSelectBar} onCreate={handleCreate} onRequestCreate={requestCreate} />
          } />

          <Route path="/connexion" element={<AuthPage key="login" initialMode="login" />} />
          <Route path="/inscription" element={<AuthPage key="signup" initialMode="signup" />} />
          <Route path="/confidentialite" element={<PrivacyPage />} />
          <Route path="/compte" element={
            <AccountPage
              onOpenBar={(bar, staffToken) => openOwnedBar(bar.id, staffToken)}
              onError={showError}
              onSuccess={(title, message) => pushToast({ title, message, tone: 'success' })}
            />
          } />

          <Route path="/b/:barId" element={
            <QRCodeRedirect establishments={state.establishments} loading={loading} onMapGuest={handleGuestAccess} />
          } />

          <Route path="/login" element={
            loading ? <Loader label="Chargement…" /> : (
              <Login
                bar={currentBar}
                onLogin={handleLogin}
                onOwnerEnter={currentBar && ownedIds.includes(currentBar.id) ? () => enterAsOwner(currentBar.id) : undefined}
                onClientAccess={() => {
                  if (!state.selectedEstablishmentId) return;
                  handleGuestAccess(state.selectedEstablishmentId);
                }}
              />
            )
          } />

          <Route path="/menu" element={
            restoring || loading ? <Loader label="Chargement du menu…" /> : !currentBar ? (
              <div className="card p-10 text-center max-w-md mx-auto mt-6">
                <p className="font-display text-xl text-ink mb-1">Établissement introuvable</p>
                <p className="text-sm text-muted">Scannez à nouveau le QR code de votre table.</p>
              </div>
            ) : withBar(bar => (
              <ClientMenu
                products={bar.products}
                orders={bar.orders}
                defaultName={profile?.fullName}
                onPlaceOrder={placeClientOrder}
                onCallServer={callServer}
              />
            ))
          } />

          <Route path="/serveur" element={
            <ProtectedRoute currentUser={state.currentUser} restoring={restoring} allowedRoles={[UserRole.SERVEUR, UserRole.PATRON, UserRole.CAISSIER]} fallbackPath="/login">
            {withBar(bar => (
              <ServerDashboard
                notifications={bar.notifications}
                products={bar.products}
                orders={bar.orders}
                onUpdateStatus={(orderId, status) => { run(t => api.updateOrderStatus(t, orderId, status as OrderStatus.SERVED | OrderStatus.CANCELLED)); }}
                onTakeOrder={takeServerOrder}
                onClearNotification={(id) => { run(t => api.clearNotification(t, id)); }}
              />
            ))}
            </ProtectedRoute>
          } />

          <Route path="/caissier" element={
            <ProtectedRoute currentUser={state.currentUser} restoring={restoring} allowedRoles={[UserRole.CAISSIER, UserRole.PATRON]} fallbackPath="/login">
            {withBar(bar => (
              <CashierDashboard
                orders={bar.orders}
                onValidatePayment={async (orderId) => {
                  if (await run(t => api.payOrder(t, orderId))) {
                    pushToast({ title: 'Paiement validé', message: 'Le stock a été mis à jour.', tone: 'success' });
                  }
                }}
              />
            ))}
            </ProtectedRoute>
          } />

          <Route path="/patron" element={
            <ProtectedRoute currentUser={state.currentUser} restoring={restoring} allowedRoles={[UserRole.PATRON]} fallbackPath="/login">
            {withBar(bar => (
              <PatronDashboard
                state={{ products: bar.products, orders: bar.orders, currentUser: state.currentUser }}
                onAddProduct={(product: Omit<Product, 'id'>) => run(t => api.addProduct(t, product))}
                onDeleteProduct={(id: string) => run(t => api.deleteProduct(t, id))}
                onAddStock={(productId, qty) => run(t => api.addStock(t, productId, qty))}
              />
            ))}
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/etablissements" replace />} />
        </Routes>
        </Suspense>
        )}
      </main>

      <footer className="w-full max-w-content mx-auto px-4 sm:px-6 pb-8 pt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-faint">
        <span>BarSafe · Togo</span>
        <Link to="/confidentialite" className="hover:text-ink">Confidentialité</Link>
        <Link to="/confidentialite#cookies" className="hover:text-ink">Cookies</Link>
        {!session && <Link to="/connexion" className="hover:text-ink">Se connecter</Link>}
      </footer>
    </div>
  );
};

export default App;
