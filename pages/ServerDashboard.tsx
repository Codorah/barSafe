import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, Notification, Product } from '../types';

interface ServerDashboardProps {
  notifications: Notification[];
  orders: Order[];
  products: Product[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onTakeOrder: (items: { productId: string; quantity: number }[], table: number, clientName?: string) => void;
  onClearNotification: (id: string) => void;
}

const ServerDashboard: React.FC<ServerDashboardProps> = ({ notifications, orders, products, onUpdateStatus, onTakeOrder, onClearNotification }) => {
  const [isTakingOrder, setIsTakingOrder] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<{ [id: string]: number }>({});
  const [table, setTable] = useState(1);
  const [clientName, setClientName] = useState('');
  const prevNotifCount = useRef(notifications.length);

  // Audible alert when a new notification arrives (respects the sound setting)
  useEffect(() => {
    if (notifications.length > prevNotifCount.current && localStorage.getItem('barsafe_sound') !== 'off') {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.36);
      } catch { /* audio not available */ }
    }
    prevNotifCount.current = notifications.length;
  }, [notifications.length]);

  const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.SERVED);

  const manualItems = (Object.entries(currentOrder) as [string, number][]).map(([productId, quantity]) => ({ productId, quantity }));
  const manualTotalItems = manualItems.reduce((acc, item) => acc + item.quantity, 0);
  const manualTotalPrice = manualItems.reduce((acc, item) => acc + (products.find(p => p.id === item.productId)?.price || 0) * item.quantity, 0);

  const handleManualOrder = () => {
    if (manualItems.length === 0) return;
    onTakeOrder(manualItems, table, clientName.trim() || undefined);
    setCurrentOrder({});
    setClientName('');
    setIsTakingOrder(false);
  };

  return (
    <div className="space-y-8 pb-16">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink tracking-tight">Service</h1>
          <p className="text-sm text-muted mt-0.5">Alertes en direct et suivi des tables</p>
        </div>
        <button onClick={() => setIsTakingOrder(true)} className="btn btn-primary">
          <i className="fa-solid fa-plus" aria-hidden="true"></i> <span className="hidden sm:inline">Prendre commande</span>
        </button>
      </header>

      {/* Live alerts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="eyebrow">Alertes en direct</h2>
          {notifications.length > 0 && <span className="pulse-dot" aria-hidden="true"></span>}
        </div>
        <div className="flex flex-col gap-3">
          {notifications.map(notif => {
            const isCall = notif.type === 'CALL_SERVER';
            return (
              <div key={notif.id} className="card p-4 flex items-center justify-between gap-4 animate-rise-in">
                <div className="flex items-center gap-4 min-w-0">
                  <span className={`w-12 h-12 rounded-xl grid place-items-center text-lg shrink-0 ${isCall ? 'bg-warn/16 text-warn' : 'bg-accent/14 text-accentStrong'}`}>
                    <i className={`fa-solid ${isCall ? 'fa-bell' : 'fa-receipt'}`} aria-hidden="true"></i>
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{notif.message}</p>
                    <p className="text-xs text-muted mt-0.5">{new Date(notif.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                <button onClick={() => onClearNotification(notif.id)} className="btn btn-soft btn-sm shrink-0">
                  <i className="fa-solid fa-check" aria-hidden="true"></i> J'y vais
                </button>
              </div>
            );
          })}
          {notifications.length === 0 && (
            <div className="card-flat p-8 text-center text-muted text-sm">Aucune nouvelle alerte.</div>
          )}
        </div>
      </section>

      {/* Tables tracking */}
      <section className="space-y-4">
        <h2 className="eyebrow">Commandes en cours</h2>
        {pendingOrders.length === 0 ? (
          <div className="card-flat p-8 text-center text-muted text-sm">Aucune commande à suivre pour le moment.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingOrders.map(order => (
              <div key={order.id} className="card p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="eyebrow text-accentStrong mb-1">Table {order.tableNumber}</p>
                    <h3 className="font-display text-lg font-semibold text-ink">#{order.id.slice(0, 5)}</h3>
                    <p className="text-xs text-muted mt-1">Client : <span className="text-ink font-medium">{order.clientName?.trim() || 'Non renseigné'}</span></p>
                  </div>
                  <span className={`badge ${order.status === OrderStatus.PENDING ? 'badge-amber' : 'badge-warn'}`}>
                    {order.status === OrderStatus.PENDING ? 'En attente' : 'À servir'}
                  </span>
                </div>
                <div className="flex-grow space-y-2 mb-5">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted">x{item.quantity} {products.find(p => p.id === item.productId)?.name || 'Produit'}</span>
                      <span className="font-medium text-ink tabnum">{(item.priceAtTime * item.quantity).toLocaleString()} F</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-line/8">
                  <span className="font-display text-xl font-semibold text-ink tabnum">{order.total.toLocaleString()} F</span>
                  {order.status === OrderStatus.PENDING && (
                    <button onClick={() => onUpdateStatus(order.id, OrderStatus.SERVED)} className="btn btn-primary btn-sm">
                      <i className="fa-solid fa-check" aria-hidden="true"></i> Marquer servi
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Manual order sheet */}
      {isTakingOrder && (
        <div className="overlay items-end sm:items-center justify-center" onClick={() => setIsTakingOrder(false)}>
          <div className="sheet w-full max-w-3xl rounded-t-[2rem] sm:rounded-[2rem] p-6 h-[86vh] sm:h-[80vh] flex flex-col animate-sheet-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-2xl font-semibold text-ink">Prendre une commande</h2>
              <button onClick={() => setIsTakingOrder(false)} className="icon-btn" aria-label="Fermer"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button>
            </div>

            <div className="mb-4">
              <label className="label">Table</label>
              <div className="flex gap-2 flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setTable(n)} className={`w-10 h-10 rounded-xl font-semibold border transition-all ${table === n ? 'bg-accent border-accent text-onAccent' : 'border-line/12 text-muted hover:border-line/25'}`}>{n}</button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="label" htmlFor="srv-client">Nom client <span className="text-faint font-normal">(optionnel)</span></label>
              <input id="srv-client" type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex : Kossi" className="field" />
            </div>

            <div className="rounded-2xl bg-surface2 border border-line/8 px-4 py-3 mb-4 flex items-center justify-between text-sm">
              <span className="font-medium text-muted">Panier</span>
              <span className="font-semibold text-ink tabnum">{manualTotalItems} article(s) • {manualTotalPrice.toLocaleString()} F</span>
            </div>

            <div className="flex-grow overflow-y-auto scroll-slim space-y-2 pr-1">
              {products.length === 0 ? (
                <div className="h-full min-h-40 grid place-items-center text-center p-6 card-flat">
                  <p className="text-muted text-sm">Aucun produit. Ajoutez-en depuis l'espace direction.</p>
                </div>
              ) : products.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-surface2 border border-line/8 p-3 rounded-2xl">
                  <div>
                    <p className="font-semibold text-ink text-sm">{p.name}</p>
                    <p className="text-xs text-muted tabnum">{p.price.toLocaleString()} F</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentOrder(prev => { const n = { ...prev }; if (n[p.id] > 0) n[p.id]--; if (n[p.id] === 0) delete n[p.id]; return n; })}
                      className="w-8 h-8 rounded-lg bg-surface border border-line/10 font-semibold" aria-label="Retirer">–</button>
                    <span className="font-semibold w-5 text-center tabnum">{currentOrder[p.id] || 0}</span>
                    <button
                      onClick={() => setCurrentOrder(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))}
                      className="w-8 h-8 rounded-lg bg-accent text-onAccent font-semibold" aria-label="Ajouter">+</button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleManualOrder} disabled={manualItems.length === 0} className="btn btn-primary btn-block btn-lg mt-5">
              Valider la commande ({manualTotalPrice.toLocaleString()} F)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerDashboard;
