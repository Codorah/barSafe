
import React, { useState } from 'react';
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

  const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.SERVED);

  const manualItems = (Object.entries(currentOrder) as [string, number][])
    .map(([productId, quantity]) => ({ productId, quantity }));
  const manualTotalItems = manualItems.reduce((acc, item) => acc + item.quantity, 0);
  const manualTotalPrice = manualItems.reduce((acc, item) => {
    const product = products.find(p => p.id === item.productId);
    return acc + (product?.price || 0) * item.quantity;
  }, 0);

  const handleManualOrder = () => {
    const items = manualItems;
    if (items.length === 0) return alert("Panier vide");
    onTakeOrder(items, table, clientName.trim() || undefined);
    setCurrentOrder({});
    setClientName('');
    setIsTakingOrder(false);
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-black">Interface Serveur 🍻</h1>
        <button 
          onClick={() => setIsTakingOrder(true)}
          className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
        >
          <i className="fa-solid fa-plus"></i> Prendre Commande
        </button>
      </header>

      {/* Notifications Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-400 uppercase tracking-widest">
          Alertes en direct
          {notifications.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
        </h2>
        <div className="flex flex-col gap-3">
          {notifications.map(notif => (
            <div key={notif.id} className={`p-4 rounded-2xl border-l-8 flex justify-between items-center shadow-sm bg-white ${
              notif.type === 'CALL_SERVER' ? 'border-orange-500' : 'border-blue-500'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                  notif.type === 'CALL_SERVER' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <i className={notif.type === 'CALL_SERVER' ? 'fa-solid fa-bell' : 'fa-solid fa-receipt'}></i>
                </div>
                <div>
                  <p className="font-black text-lg">{notif.message}</p>
                  <p className="text-xs text-gray-400">{new Date(notif.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
              <button 
                onClick={() => onClearNotification(notif.id)}
                className="bg-gray-100 text-gray-400 p-3 rounded-xl hover:bg-gray-200"
              >
                J'y vais !
              </button>
            </div>
          ))}
          {notifications.length === 0 && <p className="text-gray-400 italic text-center py-4">Aucune nouvelle notification.</p>}
        </div>
      </section>

      {/* Tables Tracking */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pendingOrders.map(order => (
          <div key={order.id} className="bg-white border rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-black text-yellow-600">TABLE {order.tableNumber}</span>
                <h3 className="font-black text-xl">#{order.id.slice(0,5)}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Client: <span className="font-semibold text-gray-700">{order.clientName?.trim() || 'Non renseigne'}</span>
                </p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                order.status === OrderStatus.PENDING ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
              }`}>
                {order.status === OrderStatus.PENDING ? 'En Cuisine' : 'À Servir'}
              </span>
            </div>
            
            <div className="flex-grow space-y-2 mb-6">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">x{item.quantity} {products.find(p => p.id === item.productId)?.name}</span>
                  <span className="font-bold">{(item.priceAtTime * item.quantity).toLocaleString()} F</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-2xl font-black">{order.total.toLocaleString()} F</span>
              <div className="flex gap-2">
                {order.status === OrderStatus.PENDING && (
                  <button 
                    onClick={() => onUpdateStatus(order.id, OrderStatus.SERVED)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-md"
                  >
                    Servi ✅
                  </button>
                )}
                <button className="bg-gray-100 text-gray-400 px-4 py-2 rounded-xl font-bold">Ticket</button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Manual Order Modal */}
      {isTakingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl p-6 h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black">Prendre Commande</h2>
              <button onClick={() => setIsTakingOrder(false)} className="text-gray-400"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>

            <div className="flex gap-4 mb-6">
              <span className="font-bold">Table :</span>
              <div className="flex gap-2 flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button 
                    key={n} 
                    onClick={() => setTable(n)}
                    className={`w-10 h-10 rounded-xl border-2 font-bold transition-all ${table === n ? 'bg-yellow-500 border-yellow-500 text-white' : 'border-gray-100'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="font-bold block mb-2">Nom client (optionnel)</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Kossi"
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:border-yellow-500 outline-none"
              />
            </div>

            <div className="mb-4 p-3 rounded-2xl bg-gray-50 border text-sm flex items-center justify-between">
              <span className="font-semibold text-gray-600">Panier</span>
              <span className="font-black text-gray-900">{manualTotalItems} article(s) • {manualTotalPrice.toLocaleString()} F</span>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 pr-2">
              {products.length === 0 && (
                <div className="h-full min-h-40 grid place-items-center text-center p-6 bg-gray-50 rounded-2xl border">
                  <p className="text-gray-500 font-medium">
                    Aucun produit dans ce resto. Ajoutez des produits dans l'espace patron.
                  </p>
                </div>
              )}
              {products.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
                  <div>
                    <p className="font-bold">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.price} F</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setCurrentOrder(prev => {
                        const next = {...prev};
                        if (next[p.id] > 0) next[p.id]--;
                        if (next[p.id] === 0) delete next[p.id];
                        return next;
                      })}
                      className="w-8 h-8 rounded-lg bg-white shadow-sm font-bold"
                    >-</button>
                    <span className="font-black w-4 text-center">{currentOrder[p.id] || 0}</span>
                    <button 
                      onClick={() => setCurrentOrder(prev => ({...prev, [p.id]: (prev[p.id] || 0) + 1}))}
                      className="w-8 h-8 rounded-lg bg-white shadow-sm font-bold"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>

            {manualItems.length > 0 && (
              <div className="mt-4 bg-gray-50 rounded-2xl p-4 space-y-2 border">
                <p className="text-xs font-bold text-gray-500 uppercase">Resume panier</p>
                {manualItems.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-gray-600">x{item.quantity} {product?.name || 'Produit'}</span>
                      <span className="font-semibold">{((product?.price || 0) * item.quantity).toLocaleString()} F</span>
                    </div>
                  );
                })}
              </div>
            )}

            <button 
              onClick={handleManualOrder}
              disabled={manualItems.length === 0}
              className="mt-6 w-full bg-yellow-500 text-gray-900 font-black py-4 rounded-2xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              VALIDER LA COMMANDE ({manualTotalPrice.toLocaleString()} F)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerDashboard;
