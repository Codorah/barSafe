
import React, { useState } from 'react';
import { Product, PaymentMethod } from '../types';

interface ClientMenuProps {
  products: Product[];
  onPlaceOrder: (items: { productId: string; quantity: number }[], table: number, method: PaymentMethod, clientName: string) => void;
  onCallServer: (table: number) => void;
}

const ClientMenu: React.FC<ClientMenuProps> = ({ products, onPlaceOrder, onCallServer }) => {
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [table, setTable] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [clientName, setClientName] = useState('');
  const [orderSent, setOrderSent] = useState(false);
  const [serverCalled, setServerCalled] = useState(false);

  const addToCart = (id: string) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    if (!cart[id]) return;
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] === 1) delete newCart[id];
      else newCart[id]--;
      return newCart;
    });
  };

  const totalItems = (Object.values(cart) as number[]).reduce((a, b) => a + b, 0);
  const totalPrice = (Object.entries(cart) as [string, number][]).reduce((acc, [id, qty]) => {
    const p = products.find(prod => prod.id === id);
    return acc + (p?.price || 0) * qty;
  }, 0);

  const handleSendOrder = () => {
    if (!clientName.trim()) return;
    const items = (Object.entries(cart) as [string, number][])
      .map(([productId, quantity]) => ({ productId, quantity }));
    onPlaceOrder(items, table, paymentMethod, clientName.trim());
    setCart({});
    setShowCheckout(false);
    setOrderSent(true);
    setTimeout(() => setOrderSent(false), 5000);
  };

  const handleCallServer = () => {
    onCallServer(table);
    setServerCalled(true);
    setTimeout(() => setServerCalled(false), 5000);
  };

  return (
    <div className="pb-32">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 font-black">
            {table}
          </div>
          <div>
            <h1 className="text-xl font-bold">Votre Table</h1>
            <p className="text-xs text-gray-400">Changer de table en haut à droite</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={handleCallServer}
            disabled={serverCalled}
            className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all ${
              serverCalled ? 'bg-gray-100 text-gray-400' : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {serverCalled ? 'Appel en cours...' : 'Appeler Serveur'}
          </button>
          <button
            onClick={() => setShowCheckout(true)}
            disabled={totalItems === 0}
            className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all ${
              totalItems > 0 ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400'
            }`}
          >
            Commander
          </button>
          <select 
            value={table}
            onChange={(e) => setTable(Number(e.target.value))}
            className="border rounded-xl px-3 py-2 text-sm bg-gray-50"
          >
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>Table {n}</option>)}
          </select>
        </div>
      </div>

      {orderSent && (
        <div className="bg-green-600 text-white p-4 rounded-2xl mb-6 flex items-center gap-3 animate-bounce">
          <i className="fa-solid fa-circle-check text-xl"></i>
          <p className="font-bold">Commande envoyée ! Elle arrive bientôt.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border p-8 text-center">
            <p className="font-bold text-gray-700 mb-2">Aucun produit disponible</p>
            <p className="text-sm text-gray-500">Le restaurant n'a pas encore ajoute de produits.</p>
          </div>
        )}
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-3xl shadow-sm border p-4 flex gap-4 items-center">
            <img src={product.imageUrl} alt={product.name} className="w-24 h-24 rounded-2xl object-cover" />
            <div className="flex-grow">
              <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
              <p className="text-xs text-gray-400 line-clamp-1 mb-2">{product.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-yellow-600 font-black">{product.price.toLocaleString()} FCFA</span>
                <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-full">
                  <button onClick={() => removeFromCart(product.id)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">-</button>
                  <span className="font-bold">{cart[product.id] || 0}</span>
                  <button onClick={() => addToCart(product.id)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">+</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalItems > 0 && !showCheckout && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-gray-900 text-white rounded-3xl shadow-2xl p-4 flex items-center justify-between z-50 animate-slide-up">
          <div className="flex flex-col">
            <span className="text-xs opacity-50">{totalItems} articles</span>
            <span className="text-xl font-black">{totalPrice.toLocaleString()} F</span>
          </div>
          <button 
            onClick={() => setShowCheckout(true)}
            className="bg-yellow-500 text-gray-900 px-8 py-3 rounded-2xl font-black hover:bg-yellow-400"
          >
            Commander
          </button>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-2xl font-black">Finaliser Commande</h2>
              <button onClick={() => setShowCheckout(false)} className="text-gray-400"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-bold">Votre nom :</h3>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Kossi"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:border-yellow-500 outline-none"
                />
              </div>
              <h3 className="font-bold">Mode de paiement :</h3>
              <div className="grid grid-cols-3 gap-3">
                {(['ESPECES', 'CARTE', 'MOBILE_MONEY'] as PaymentMethod[]).map(m => (
                  <button 
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all ${
                      paymentMethod === m ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-100 text-gray-400'
                    }`}
                  >
                    {m === 'MOBILE_MONEY' ? 'T-Money/Moov' : m}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl">
               <div className="flex justify-between font-bold text-xl">
                 <span>Total à payer</span>
                 <span className="text-yellow-600">{totalPrice.toLocaleString()} FCFA</span>
               </div>
            </div>

            <button 
              onClick={handleSendOrder}
              disabled={!clientName.trim() || totalItems === 0}
              className="w-full bg-yellow-500 text-gray-900 font-black py-4 rounded-2xl shadow-xl hover:bg-yellow-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              VALIDER MA COMMANDE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientMenu;
