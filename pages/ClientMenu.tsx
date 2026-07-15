import React, { useEffect, useMemo, useState } from 'react';
import { Product, PaymentMethod, Order, OrderStatus } from '../types';

interface ClientMenuProps {
  products: Product[];
  orders: Order[];
  establishmentId: string;
  onPlaceOrder: (items: { productId: string; quantity: number }[], table: number, method: PaymentMethod, clientName: string) => Promise<string | null> | void;
  onCallServer: (table: number) => void;
}

const PAYMENTS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'ESPECES', label: 'Espèces', icon: 'fa-money-bill-wave' },
  { value: 'CARTE', label: 'Carte', icon: 'fa-credit-card' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: 'fa-mobile-screen-button' },
];

const STATUS_STEPS = [
  { key: OrderStatus.PENDING, label: 'En attente', icon: 'fa-clock' },
  { key: OrderStatus.SERVED, label: 'Servie', icon: 'fa-utensils' },
  { key: OrderStatus.PAID, label: 'Payée', icon: 'fa-circle-check' },
];

const ClientMenu: React.FC<ClientMenuProps> = ({ products, orders, establishmentId, onPlaceOrder, onCallServer }) => {
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [table, setTable] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [clientName, setClientName] = useState('');
  const [serverCalled, setServerCalled] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('Tous');
  const [view, setView] = useState<'MENU' | 'ORDERS'>('MENU');

  const storeKey = `barsafe_myorders_${establishmentId}`;
  const [myIds, setMyIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(storeKey, JSON.stringify(myIds)); } catch { /* ignore */ } }, [myIds, storeKey]);

  const myOrders = useMemo(() => orders.filter(o => myIds.includes(o.id)), [orders, myIds]);

  const categories = useMemo(() => ['Tous', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter(p => {
      const matchCat = category === 'Tous' || p.category === category;
      const matchTerm = !term || p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term);
      return matchCat && matchTerm;
    });
  }, [products, query, category]);

  const addToCart = (id: string) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const removeFromCart = (id: string) => setCart(prev => {
    if (!prev[id]) return prev;
    const next = { ...prev };
    if (next[id] === 1) delete next[id]; else next[id]--;
    return next;
  });

  const totalItems = (Object.values(cart) as number[]).reduce((a, b) => a + b, 0);
  const totalPrice = (Object.entries(cart) as [string, number][]).reduce((acc, [id, qty]) => acc + (products.find(p => p.id === id)?.price || 0) * qty, 0);

  const handleSendOrder = async () => {
    if (!clientName.trim()) return;
    const items = (Object.entries(cart) as [string, number][]).map(([productId, quantity]) => ({ productId, quantity }));
    const id = await onPlaceOrder(items, table, paymentMethod, clientName.trim());
    setCart({});
    setShowCheckout(false);
    if (id) { setMyIds(prev => [id, ...prev]); setView('ORDERS'); }
  };

  const handleCallServer = () => {
    onCallServer(table);
    setServerCalled(true);
    setTimeout(() => setServerCalled(false), 5000);
  };

  return (
    <div className="pb-32 space-y-7">
      {/* Table + actions */}
      <div className="card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-xl bg-accent/14 text-accentStrong grid place-items-center font-display font-semibold text-lg">{table}</span>
          <div>
            <h1 className="font-display text-lg font-semibold text-ink leading-tight">Votre table</h1>
            <p className="text-xs text-muted">Choisissez votre numéro de table</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={table} onChange={(e) => setTable(Number(e.target.value))} aria-label="Numéro de table" className="field !py-2.5 !w-auto">
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>Table {n}</option>)}
          </select>
          <button onClick={handleCallServer} disabled={serverCalled} className="btn btn-outline btn-sm">
            <i className="fa-solid fa-bell" aria-hidden="true"></i>
            <span className="hidden sm:inline">{serverCalled ? 'Serveur appelé' : 'Appeler'}</span>
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className="segmented w-full sm:w-auto">
        <button onClick={() => setView('MENU')} className={`seg-item flex-1 ${view === 'MENU' ? 'seg-item-active' : ''}`}>Menu</button>
        <button onClick={() => setView('ORDERS')} className={`seg-item flex-1 ${view === 'ORDERS' ? 'seg-item-active' : ''}`}>
          Mes commandes{myOrders.length > 0 ? ` (${myOrders.length})` : ''}
        </button>
      </div>

      {view === 'ORDERS' ? (
        /* ---------------- My orders ---------------- */
        myOrders.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent/12 text-accentStrong grid place-items-center mx-auto text-xl mb-4"><i className="fa-solid fa-receipt" aria-hidden="true"></i></div>
            <p className="font-display text-lg text-ink mb-1">Aucune commande</p>
            <p className="text-sm text-muted">Vos commandes passées ici apparaîtront avec leur suivi en direct.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myOrders.map(order => {
              const cancelled = order.status === OrderStatus.CANCELLED;
              const currentIdx = STATUS_STEPS.findIndex(s => s.key === order.status);
              return (
                <div key={order.id} className="card p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="eyebrow text-accentStrong mb-1">Commande #{order.id.slice(0, 5)}</p>
                      <p className="text-sm text-muted tabnum">{new Date(order.timestamp).toLocaleTimeString()} · Table {order.tableNumber}</p>
                    </div>
                    <span className="font-display text-xl font-semibold text-ink tabnum">{order.total.toLocaleString()} F</span>
                  </div>

                  {cancelled ? (
                    <span className="badge badge-danger">Annulée</span>
                  ) : (
                    <div className="flex items-center">
                      {STATUS_STEPS.map((s, i) => {
                        const done = i <= currentIdx;
                        return (
                          <React.Fragment key={s.key}>
                            <div className="flex flex-col items-center gap-1.5 shrink-0">
                              <span className={`w-9 h-9 rounded-full grid place-items-center text-sm ${done ? 'bg-accent text-onAccent' : 'bg-surface2 text-faint border border-line/10'}`}>
                                <i className={`fa-solid ${s.icon}`} aria-hidden="true"></i>
                              </span>
                              <span className={`text-[0.7rem] font-medium ${i === currentIdx ? 'text-ink' : 'text-faint'}`}>{s.label}</span>
                            </div>
                            {i < STATUS_STEPS.length - 1 && <span className={`h-0.5 flex-1 mb-5 ${i < currentIdx ? 'bg-accent' : 'bg-line/12'}`} />}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-5 pt-4 border-t border-line/8 space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-muted">x{item.quantity} {products.find(p => p.id === item.productId)?.name || 'Produit'}</span>
                        <span className="text-ink tabnum">{(item.priceAtTime * item.quantity).toLocaleString()} F</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ---------------- Menu ---------------- */
        <>
          {products.length > 0 && (
            <div className="space-y-4">
              <div className="relative max-w-md">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true"></i>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une boisson, un plat…" aria-label="Rechercher" className="field field-icon" />
              </div>
              <div className="flex gap-2 overflow-x-auto scroll-slim pb-1 -mx-1 px-1">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} className={`chip ${category === cat ? 'chip-active' : ''}`}>{cat}</button>
                ))}
              </div>
            </div>
          )}

          {products.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/12 text-accentStrong grid place-items-center mx-auto text-xl mb-4"><i className="fa-solid fa-wine-bottle" aria-hidden="true"></i></div>
              <p className="font-display text-lg text-ink mb-1">Menu en préparation</p>
              <p className="text-sm text-muted">L'établissement n'a pas encore ajouté de produits.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card-flat p-10 text-center text-muted font-medium">Aucun produit ne correspond à votre recherche.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(product => {
                const qty = cart[product.id] || 0;
                const out = product.currentStock <= 0;
                return (
                  <div key={product.id} className={`card overflow-hidden flex flex-col ${out ? 'opacity-60' : ''}`}>
                    <div className="h-40 relative overflow-hidden">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      <span className="absolute top-3 left-3 badge badge-muted !bg-black/45 !text-white backdrop-blur-sm">{product.category}</span>
                      {out && <span className="absolute top-3 right-3 badge badge-danger">Épuisé</span>}
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="font-semibold text-ink leading-tight">{product.name}</h3>
                      <p className="text-xs text-muted line-clamp-2 mt-1 flex-grow">{product.description}</p>
                      <div className="flex items-center justify-between gap-3 mt-4">
                        <span className="font-display text-lg font-semibold text-accentStrong tabnum">{product.price.toLocaleString()}<span className="text-xs text-muted font-sans font-medium ml-1">FCFA</span></span>
                        {qty === 0 ? (
                          <button onClick={() => addToCart(product.id)} disabled={out} className="btn btn-soft btn-sm"><i className="fa-solid fa-plus" aria-hidden="true"></i> Ajouter</button>
                        ) : (
                          <div className="flex items-center gap-2 bg-surface2 rounded-full p-1 border border-line/10">
                            <button onClick={() => removeFromCart(product.id)} className="w-8 h-8 rounded-full bg-surface grid place-items-center text-ink" aria-label="Retirer">–</button>
                            <span className="font-semibold w-5 text-center tabnum">{qty}</span>
                            <button onClick={() => addToCart(product.id)} className="w-8 h-8 rounded-full bg-accent text-onAccent grid place-items-center" aria-label="Ajouter">+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Sticky cart */}
      {view === 'MENU' && totalItems > 0 && !showCheckout && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-50 animate-slide-up">
          <div className="panel !rounded-3xl p-3 pl-5 flex items-center justify-between shadow-lift">
            <div className="flex flex-col">
              <span className="text-xs text-muted">{totalItems} article{totalItems > 1 ? 's' : ''}</span>
              <span className="font-display text-xl font-semibold text-ink tabnum">{totalPrice.toLocaleString()} FCFA</span>
            </div>
            <button onClick={() => setShowCheckout(true)} className="btn btn-primary btn-lg">Commander <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
          </div>
        </div>
      )}

      {/* Checkout sheet */}
      {showCheckout && (
        <div className="overlay items-end sm:items-center justify-center" onClick={() => setShowCheckout(false)}>
          <div className="sheet w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] p-6 space-y-6 animate-sheet-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="font-display text-2xl font-semibold text-ink">Finaliser la commande</h2>
              <button onClick={() => setShowCheckout(false)} className="icon-btn" aria-label="Fermer"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button>
            </div>
            <div>
              <label className="label" htmlFor="client-name">Votre nom</label>
              <input id="client-name" type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex : Kossi" className="field" />
            </div>
            <div>
              <label className="label">Mode de paiement</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENTS.map(m => (
                  <button key={m.value} onClick={() => setPaymentMethod(m.value)} className={`rounded-2xl border p-3 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${paymentMethod === m.value ? 'border-accent bg-accent/10 text-accentStrong' : 'border-line/12 text-muted hover:border-line/25'}`}>
                    <i className={`fa-solid ${m.icon} text-base`} aria-hidden="true"></i>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-surface2 border border-line/8 p-4 flex justify-between items-center">
              <span className="font-medium text-muted">Total à payer</span>
              <span className="font-display text-2xl font-semibold text-ink tabnum">{totalPrice.toLocaleString()} FCFA</span>
            </div>
            <button onClick={handleSendOrder} disabled={!clientName.trim() || totalItems === 0} className="btn btn-primary btn-block btn-lg">Valider ma commande</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientMenu;
