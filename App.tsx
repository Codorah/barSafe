import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { AppState, UserRole, OrderStatus, Establishment, Product, PaymentMethod } from './types';
import { api, NewEstablishmentInput } from './api';

// Pages
import BarList from './pages/BarList';
import Login from './pages/Login';
import ClientMenu from './pages/ClientMenu';
import ServerDashboard from './pages/ServerDashboard';
import PatronDashboard from './pages/PatronDashboard';
import CashierDashboard from './pages/CashierDashboard';

// Components
import Navbar from './components/Navbar';
import SplashScreen from './components/SplashScreen';

const QRCodeRedirect: React.FC<{ establishments: Establishment[]; onMapGuest: (barId: string) => void }> = ({ establishments, onMapGuest }) => {
  const { barId } = useParams();
  useEffect(() => {
    if (barId && establishments.find(e => e.id === barId)) onMapGuest(barId);
  }, [barId, establishments, onMapGuest]);

  return (
    <div className="flex flex-col justify-center items-center h-64 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"></div>
      <p className="text-sm font-medium text-muted">Ouverture du menu…</p>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactElement; currentUser: any; allowedRoles: UserRole[]; fallbackPath: string }> = ({ children, currentUser, allowedRoles, fallbackPath }) => {
  if (!currentUser || !allowedRoles.includes(currentUser.role)) return <Navigate to={fallbackPath} replace />;
  return children;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({ establishments: [], selectedEstablishmentId: null, currentUser: null });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Initial establishments list (+ clear legacy local test data)
  useEffect(() => {
    try { localStorage.removeItem('barsafe_togo_v2'); } catch { /* ignore */ }
    api.getEstablishments().then(list => {
      setState(s => ({ ...s, establishments: list }));
      setLoading(false);
    });
  }, []);

  const currentBar = state.establishments.find(e => e.id === state.selectedEstablishmentId);

  const refreshBar = useCallback(async (barId: string) => {
    const data = await api.getBarData(barId);
    setState(s => ({
      ...s,
      establishments: s.establishments.map(e => (e.id === barId ? { ...e, ...data, loaded: true } : e)),
    }));
  }, []);

  // Realtime for the selected establishment
  useEffect(() => {
    const id = state.selectedEstablishmentId;
    if (!id) return;
    const unsub = api.subscribeToBar(id, () => { refreshBar(id); });
    return unsub;
  }, [state.selectedEstablishmentId, refreshBar]);

  const handleSelectBar = (id: string) => {
    setState(prev => ({ ...prev, selectedEstablishmentId: id }));
    refreshBar(id);
    navigate('/login');
  };

  const handleCreate = async (input: NewEstablishmentInput): Promise<string | null> => {
    const id = await api.createEstablishment(input);
    if (id) {
      const list = await api.getEstablishments();
      setState(prev => ({ ...prev, establishments: list }));
    }
    return id;
  };

  const handleLogin = (user: { name: string; role: UserRole; establishmentId: string }) => {
    setState(prev => ({ ...prev, currentUser: user }));
    if (user.role === UserRole.PATRON) navigate('/patron');
    else if (user.role === UserRole.SERVEUR) navigate('/serveur');
    else if (user.role === UserRole.CAISSIER) navigate('/caissier');
    else navigate('/menu');
  };

  const logout = () => {
    setState(prev => ({ ...prev, currentUser: null, selectedEstablishmentId: null }));
    navigate('/');
  };

  const handleGuestAccess = (barId: string) => {
    setState(prev => ({ ...prev, selectedEstablishmentId: barId, currentUser: { name: 'Client', role: UserRole.CLIENT, establishmentId: barId } }));
    refreshBar(barId);
    navigate('/menu');
  };

  // ---- mutations (write-through to Supabase, then refresh) ----
  const placeClientOrder = async (items: { productId: string; quantity: number }[], table: number, method: PaymentMethod, clientName: string): Promise<string | null> => {
    if (!currentBar) return null;
    const detailed = items.map(i => ({ productId: i.productId, quantity: i.quantity, priceAtTime: currentBar.products.find(p => p.id === i.productId)?.price || 0 }));
    const total = detailed.reduce((acc, i) => acc + i.priceAtTime * i.quantity, 0);
    const orderId = await api.placeOrder(currentBar.id, { tableNumber: table, clientName, paymentMethod: method, serverName: 'Client', total }, detailed);
    await api.addNotification(currentBar.id, { type: 'ORDER', message: `Nouvelle commande de ${clientName} — Table ${table}`, tableNumber: table, orderId: orderId || undefined });
    refreshBar(currentBar.id);
    return orderId;
  };

  const takeServerOrder = async (items: { productId: string; quantity: number }[], table: number, clientName?: string) => {
    if (!currentBar) return;
    const detailed = items.map(i => ({ productId: i.productId, quantity: i.quantity, priceAtTime: currentBar.products.find(p => p.id === i.productId)?.price || 0 }));
    const total = detailed.reduce((acc, i) => acc + i.priceAtTime * i.quantity, 0);
    await api.placeOrder(currentBar.id, { tableNumber: table, clientName, serverName: state.currentUser?.name || 'Serveur', total }, detailed);
    refreshBar(currentBar.id);
  };

  const showNavbar = location.pathname !== '/' && state.selectedEstablishmentId;

  return (
    <div className="min-h-screen flex flex-col text-ink">
      <SplashScreen />
      {showNavbar && (
        <Navbar barName={currentBar?.name || ''} user={state.currentUser} onLogout={logout} />
      )}

      <main className="flex-grow w-full max-w-content mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Routes>
          <Route path="/" element={
            <BarList establishments={state.establishments} loading={loading} onSelect={handleSelectBar} onCreate={handleCreate} />
          } />

          <Route path="/b/:barId" element={
            <QRCodeRedirect establishments={state.establishments} onMapGuest={handleGuestAccess} />
          } />

          <Route path="/login" element={
            <Login
              bar={currentBar}
              onLogin={handleLogin}
              onClientAccess={() => {
                if (!state.selectedEstablishmentId) return;
                handleGuestAccess(state.selectedEstablishmentId);
              }}
            />
          } />

          <Route path="/menu" element={
            currentBar ? (
              <ClientMenu
                products={currentBar.products}
                orders={currentBar.orders}
                establishmentId={currentBar.id}
                onPlaceOrder={placeClientOrder}
                onCallServer={(table) => { if (currentBar) { api.addNotification(currentBar.id, { type: 'CALL_SERVER', message: `Besoin d'un serveur — Table ${table}`, tableNumber: table }); refreshBar(currentBar.id); } }}
              />
            ) : (
              <div className="card p-10 text-center max-w-md mx-auto mt-6">
                <p className="font-display text-xl text-ink mb-1">Établissement introuvable</p>
                <p className="text-sm text-muted">Scannez à nouveau le QR code de votre table.</p>
              </div>
            )
          } />

          <Route path="/serveur" element={
            <ProtectedRoute currentUser={state.currentUser} allowedRoles={[UserRole.SERVEUR, UserRole.PATRON, UserRole.CAISSIER]} fallbackPath="/login">
            {currentBar ? (
              <ServerDashboard
                notifications={currentBar.notifications}
                products={currentBar.products}
                orders={currentBar.orders}
                onUpdateStatus={async (orderId, status) => { await api.updateOrderStatus(orderId, status); refreshBar(currentBar.id); }}
                onTakeOrder={takeServerOrder}
                onClearNotification={async (id) => { await api.clearNotification(id); refreshBar(currentBar.id); }}
              />
            ) : (
              <div className="card p-10 text-center max-w-md mx-auto mt-6">
                <p className="font-display text-xl text-ink mb-1">Accès refusé</p>
                <p className="text-sm text-muted">Cet établissement n'est pas accessible.</p>
              </div>
            )}
            </ProtectedRoute>
          } />

          <Route path="/caissier" element={
            <ProtectedRoute currentUser={state.currentUser} allowedRoles={[UserRole.CAISSIER, UserRole.PATRON]} fallbackPath="/login">
            {currentBar ? (
              <CashierDashboard
                orders={currentBar.orders}
                onValidatePayment={async (orderId) => { await api.payOrder(orderId); refreshBar(currentBar.id); }}
              />
            ) : (
              <div className="card p-10 text-center max-w-md mx-auto mt-6">
                <p className="font-display text-xl text-ink mb-1">Accès refusé</p>
                <p className="text-sm text-muted">Cet établissement n'est pas accessible.</p>
              </div>
            )}
            </ProtectedRoute>
          } />

          <Route path="/patron" element={
            <ProtectedRoute currentUser={state.currentUser} allowedRoles={[UserRole.PATRON]} fallbackPath="/serveur">
            {currentBar ? (
              <PatronDashboard
                state={{ products: currentBar.products, orders: currentBar.orders, currentUser: state.currentUser }}
                onAddProduct={async (product: Omit<Product, 'id'>) => { await api.addProduct(currentBar.id, product); refreshBar(currentBar.id); }}
                onDeleteProduct={async (id: string) => { await api.deleteProduct(id); refreshBar(currentBar.id); }}
                onAddStock={async (productId, qty) => { await api.addStock(productId, qty); refreshBar(currentBar.id); }}
              />
            ) : (
              <div className="card p-10 text-center max-w-md mx-auto mt-6">
                <p className="font-display text-xl text-ink mb-1">Accès refusé</p>
                <p className="text-sm text-muted">Cet établissement n'est pas accessible.</p>
              </div>
            )}
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
};

export default App;
