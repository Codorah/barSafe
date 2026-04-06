
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AppState, UserRole, OrderStatus, Establishment, Notification } from './types';
import { loadState, saveState } from './store';

// Pages
import BarList from './pages/BarList';
import Login from './pages/Login';
import ClientMenu from './pages/ClientMenu';
import ServerDashboard from './pages/ServerDashboard';
import PatronDashboard from './pages/PatronDashboard';
import CashierDashboard from './pages/CashierDashboard';

// Components
import Navbar from './components/Navbar';

const QRCodeRedirect: React.FC<{ establishments: Establishment[], onMapGuest: (barId: string) => void }> = ({ establishments, onMapGuest }) => {
  const { barId } = useParams();
  useEffect(() => {
    if (barId && establishments.find(e => e.id === barId)) {
      onMapGuest(barId);
    }
  }, [barId, establishments, onMapGuest]);
  
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(loadState());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    saveState(state);
  }, [state]);

  const currentBar = state.establishments.find(e => e.id === state.selectedEstablishmentId);

  const updateEstablishment = (id: string, updated: Partial<Establishment>) => {
    setState(prev => ({
      ...prev,
      establishments: prev.establishments.map(e => e.id === id ? { ...e, ...updated } : e)
    }));
  };

  const addNotification = (barId: string, notif: Omit<Notification, 'id' | 'timestamp' | 'handled'>) => {
    if (!currentBar) return;
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      handled: false
    };
    updateEstablishment(barId, { notifications: [newNotif, ...currentBar.notifications] });
  };

  const handleSelectBar = (id: string) => {
    setState(prev => ({ ...prev, selectedEstablishmentId: id }));
    navigate('/login');
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
    setState(prev => ({ 
      ...prev, 
      selectedEstablishmentId: barId,
      currentUser: { name: 'Client', role: UserRole.CLIENT, establishmentId: barId } 
    }));
    navigate('/menu');
  };

  const showNavbar = location.pathname !== '/' && state.selectedEstablishmentId;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {showNavbar && (
        <Navbar 
          barName={currentBar?.name || ''}
          user={state.currentUser} 
          onLogout={logout} 
        />
      )}
      
      <main className="flex-grow container mx-auto px-4 py-6 max-w-6xl">
        <Routes>
          <Route path="/" element={
            <BarList 
              establishments={state.establishments} 
              onSelect={handleSelectBar}
              onCreate={(bar) => setState(prev => ({ ...prev, establishments: [...prev.establishments, bar]}))}
            />
          } />
          <Route path="/b/:barId" element={
            <QRCodeRedirect 
              establishments={state.establishments} 
              onMapGuest={handleGuestAccess} 
            />
          } />
          <Route path="/login" element={
            <Login 
              bar={currentBar} 
              onLogin={handleLogin} 
              onClientAccess={() => {
                setState(prev => ({ ...prev, currentUser: { name: 'Client', role: UserRole.CLIENT, establishmentId: state.selectedEstablishmentId! } }));
                navigate('/menu');
              }}
            />
          } />
          <Route path="/menu" element={
            currentBar ? (
              <ClientMenu 
                products={currentBar.products} 
                onPlaceOrder={(items, table, method, clientName) => {
                   const newOrder = {
                     id: Math.random().toString(36).substr(2, 9),
                     tableNumber: table,
                     clientName,
                     items: items.map(i => ({...i, priceAtTime: currentBar.products.find(p => p.id === i.productId)?.price || 0})),
                     status: OrderStatus.PENDING,
                     paymentMethod: method,
                     serverName: 'Client Direct',
                     timestamp: Date.now(),
                     total: items.reduce((acc, i) => acc + (currentBar.products.find(p => p.id === i.productId)?.price || 0) * i.quantity, 0)
                   };
                   updateEstablishment(currentBar.id, { orders: [newOrder, ...currentBar.orders] });
                   addNotification(currentBar.id, { 
                     type: 'ORDER', 
                     message: `Nouvelle commande de ${clientName} - Table ${table}`, 
                     tableNumber: table,
                     orderId: newOrder.id 
                   });
                }} 
                onCallServer={(table) => {
                  addNotification(currentBar.id, { 
                    type: 'CALL_SERVER', 
                    message: `Besoin d'un serveur Table ${table}`, 
                    tableNumber: table 
                  });
                }}
              />
            ) : <div>Bar non trouvé</div>
          } />
          <Route path="/serveur" element={
            currentBar ? (
              <ServerDashboard 
                notifications={currentBar.notifications}
                products={currentBar.products}
                orders={currentBar.orders} 
                onUpdateStatus={(orderId, status) => {
                   const updatedOrders = currentBar.orders.map(o => o.id === orderId ? { ...o, status } : o);
                   updateEstablishment(currentBar.id, { orders: updatedOrders });
                }}
                onTakeOrder={(items, table, clientName) => {
                  const newOrder = {
                    id: Math.random().toString(36).substr(2, 9),
                    tableNumber: table,
                    clientName,
                    items: items.map(i => ({...i, priceAtTime: currentBar.products.find(p => p.id === i.productId)?.price || 0})),
                    status: OrderStatus.PENDING,
                    serverName: state.currentUser?.name || 'Serveur',
                    timestamp: Date.now(),
                    total: items.reduce((acc, i) => acc + (currentBar.products.find(p => p.id === i.productId)?.price || 0) * i.quantity, 0)
                  };
                  updateEstablishment(currentBar.id, { orders: [newOrder, ...currentBar.orders] });
                }}
                onClearNotification={(id) => {
                  updateEstablishment(currentBar.id, { notifications: currentBar.notifications.filter(n => n.id !== id) });
                }}
              />
            ) : <div>Accès refusé</div>
          } />
          <Route path="/caissier" element={
            currentBar ? (
              <CashierDashboard 
                orders={currentBar.orders}
                onValidatePayment={(orderId) => {
                   const order = currentBar.orders.find(o => o.id === orderId);
                   if (!order) return;
                   
                   // Baisse du stock
                   const updatedProducts = currentBar.products.map(p => {
                     const item = order.items.find(i => i.productId === p.id);
                     return item ? { ...p, currentStock: p.currentStock - item.quantity } : p;
                   });
                   
                   const updatedOrders = currentBar.orders.map(o => o.id === orderId ? { ...o, status: OrderStatus.PAID } : o);
                   updateEstablishment(currentBar.id, { products: updatedProducts, orders: updatedOrders });
                }}
              />
            ) : <div>Accès refusé</div>
          } />
          <Route path="/patron" element={
            currentBar ? (
              <PatronDashboard 
                state={{ products: currentBar.products, orders: currentBar.orders, currentUser: state.currentUser }} 
                onUpdateProducts={(prods) => updateEstablishment(currentBar.id, { products: prods })}
                onAddStock={(productId, qty) => {
                  const updatedProducts = currentBar.products.map(p => p.id === productId ? { ...p, currentStock: p.currentStock + qty, initialStock: p.initialStock + qty } : p);
                  updateEstablishment(currentBar.id, { products: updatedProducts });
                }}
              />
            ) : <div>Accès refusé</div>
          } />
        </Routes>
      </main>
    </div>
  );
};

export default App;
