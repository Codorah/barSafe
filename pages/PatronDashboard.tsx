
import React, { useEffect, useMemo, useState } from 'react';
import { Product, OrderStatus, Order } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import QRCode from 'react-qr-code';

interface PatronDashboardProps {
  state: {
    products: Product[];
    orders: Order[];
    currentUser: any;
  };
  onUpdateProducts: (products: Product[]) => void;
  onAddStock: (productId: string, qty: number) => void;
}

const PatronDashboard: React.FC<PatronDashboardProps> = ({ state, onUpdateProducts, onAddStock }) => {
  const [activeTab, setActiveTab] = useState<'STATS' | 'STOCK' | 'PRODUCTS' | 'QR_CODE'>('STATS');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState<string | null>(null);
  const [stockQty, setStockQty] = useState(0);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState(0);
  const [newProductImageUrl, setNewProductImageUrl] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [productImageInputKey, setProductImageInputKey] = useState(0);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [cardsAnimated, setCardsAnimated] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; tone: 'success' | 'info' }>>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState<'ALL' | 'LOW_STOCK' | string>('ALL');
  const [displayedSales, setDisplayedSales] = useState(0);
  const [displayedLowStock, setDisplayedLowStock] = useState(0);

  useEffect(() => {
    setCardsAnimated(false);
    const timer = window.setTimeout(() => setCardsAnimated(true), 70);
    return () => window.clearTimeout(timer);
  }, [activeTab]);

  const pushToast = (message: string, tone: 'success' | 'info' = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 2200);
  };

  const totalSales = state.orders
    .filter(o => o.status === OrderStatus.PAID)
    .reduce((acc, o) => acc + o.total, 0);
  const lowStockCount = state.products.filter(p => p.currentStock < 10).length;

  const categoryFilters = useMemo(
    () => Array.from(new Set(state.products.map(p => p.category))),
    [state.products]
  );

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return state.products.filter(p => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term);
      const matchesFilter =
        productFilter === 'ALL' ||
        (productFilter === 'LOW_STOCK' ? p.currentStock < 10 : p.category === productFilter);
      return matchesSearch && matchesFilter;
    });
  }, [state.products, productSearch, productFilter]);

  useEffect(() => {
    let raf = 0;
    const duration = 700;
    const startValue = displayedSales;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const next = Math.round(startValue + (totalSales - startValue) * progress);
      setDisplayedSales(next);
      if (progress < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [totalSales]);

  useEffect(() => {
    let raf = 0;
    const duration = 450;
    const startValue = displayedLowStock;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const next = Math.round(startValue + (lowStockCount - startValue) * progress);
      setDisplayedLowStock(next);
      if (progress < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [lowStockCount]);

  const topProducts = state.products
    .map(p => {
      const sold = state.orders
        .filter(o => o.status === OrderStatus.PAID)
        .reduce((acc, o) => {
          const item = o.items.find(i => i.productId === p.id);
          return acc + (item?.quantity || 0);
        }, 0);
      return { name: p.name, sold };
    })
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black">Espace Patron 👑</h1>
          <p className="text-gray-500">Contrôle total de votre établissement</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border gap-1">
          {['STATS', 'STOCK', 'PRODUCTS', 'QR_CODE'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === tab ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'STATS' ? 'Rapports' : tab === 'STOCK' ? 'Inventaire' : tab === 'PRODUCTS' ? 'Produits' : 'QR Code'}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'STATS' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`bg-white p-6 rounded-3xl border shadow-sm ${cardsAnimated ? 'animate-rise-in' : ''}`}>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Chiffre d'Affaires</p>
              <h4 className="text-2xl font-black text-green-600">{displayedSales.toLocaleString()} <span className="text-sm">FCFA</span></h4>
            </div>
            <div className={`bg-white p-6 rounded-3xl border shadow-sm ${cardsAnimated ? 'animate-rise-in delay-1' : ''}`}>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Stock Alerte</p>
              <h4 className="text-2xl font-black text-red-600">
                {displayedLowStock} <span className="text-sm">Produits</span>
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className={`bg-white p-6 rounded-3xl border shadow-sm ${cardsAnimated ? 'animate-rise-in delay-2' : ''}`}>
              <h3 className="font-black text-xl mb-6">Performance des Produits 🏆</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sold" fill="#EAB308" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className={`bg-white p-6 rounded-3xl border shadow-sm ${cardsAnimated ? 'animate-rise-in delay-3' : ''}`}>
               <h3 className="font-black text-xl mb-6">Inventaire Rapide</h3>
               <div className="space-y-4">
                 {state.products.map(p => {
                    const sold = state.orders.filter(o => o.status === OrderStatus.PAID).reduce((acc, o) => acc + (o.items.find(i => i.productId === p.id)?.quantity || 0), 0);
                    return (
                      <div key={p.id} className="flex justify-between items-center pb-2 border-b">
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="text-xs text-gray-400">Sold: {sold} units</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black ${p.currentStock < 10 ? 'text-red-500' : 'text-gray-900'}`}>{p.currentStock} restants</p>
                          <p className="text-[10px] text-gray-400 uppercase">Initial: {p.initialStock}</p>
                        </div>
                      </div>
                    )
                 })}
               </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'STOCK' && (
        <div className="bg-white rounded-3xl border overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-xl font-black">Gestion de l'Inventaire 📦</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase">Produit</th>
                <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase">Initial</th>
                <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase">Actuel</th>
                <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.products.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-4 font-bold">{p.name}</td>
                  <td className="px-6 py-4 text-gray-500">{p.initialStock}</td>
                  <td className="px-6 py-4">
                    <span className={`font-black ${p.currentStock < 10 ? 'text-red-500' : 'text-green-600'}`}>{p.currentStock}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setShowAddStockModal(p.id)}
                      className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-xl text-xs font-black shadow-sm"
                    >
                      AJOUTER STOCK
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'PRODUCTS' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-black">Vos Produits</h2>
             <button
               onClick={() => setShowAddProduct(true)}
               className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold"
             >
               Ajouter un produit
             </button>
          </div>
          <div className="bg-white border rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between animate-rise-in">
            <div className="flex-1">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-yellow-500 outline-none"
              />
            </div>
            <div className="sm:w-64">
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-yellow-500 outline-none font-medium"
              >
                <option value="ALL">Tous les produits</option>
                <option value="LOW_STOCK">Stock faible</option>
                {categoryFilters.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="text-xs font-bold text-gray-500 whitespace-nowrap">
              {filteredProducts.length} resultat(s)
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredProducts.map((p, index) => (
               <div
                 key={p.id}
                 className={`bg-white rounded-3xl border shadow-sm p-4 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cardsAnimated ? 'animate-rise-in' : ''}`}
                 style={{ animationDelay: `${(index + 1) * 70}ms` }}
               >
                  <img src={p.imageUrl} className="w-full h-40 object-cover rounded-2xl" />
                  <div>
                    <h4 className="font-black text-lg">{p.name}</h4>
                    <p className="text-sm text-gray-400 line-clamp-2">{p.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xl font-black text-yellow-600">{p.price} F</p>
                      <span className="text-[10px] uppercase tracking-wide px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 font-bold">
                        {p.currentStock < 10 ? 'Stock faible' : 'Disponible'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto pt-4 border-t">
                    <button className="flex-grow bg-gray-50 text-gray-500 font-bold py-2 rounded-xl transition-all hover:bg-gray-100">Modifier</button>
                    <button className="p-2 bg-red-50 text-red-500 rounded-xl transition-all hover:bg-red-100"><i className="fa-solid fa-trash"></i></button>
                  </div>
               </div>
             ))}
             {filteredProducts.length === 0 && (
               <div className="col-span-full bg-white border rounded-3xl p-8 text-center text-gray-500 font-medium">
                 Aucun produit ne correspond a ce filtre.
               </div>
             )}
          </div>
        </div>
      )}

      {activeTab === 'QR_CODE' && (
        <div className="bg-white rounded-3xl border shadow-sm p-12 flex flex-col items-center justify-center animate-rise-in text-center">
          <h2 className="text-3xl font-black mb-4">Code QR de l'établissement</h2>
          <p className="text-gray-500 mb-8 max-w-md">Vos clients peuvent scanner ce code pour accéder directement à la carte et passer commande depuis leur table.</p>
          <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-gray-100">
            <QRCode value={`${window.location.origin}/b/${state.currentUser?.establishmentId}`} size={256} />
          </div>
          <p className="mt-8 text-sm font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-full">
            Lien: {`${window.location.origin}/b/${state.currentUser?.establishmentId}`}
          </p>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-pop-in">
            <h3 className="text-2xl font-black mb-4">Nouvel arrivage</h3>
            <p className="text-gray-500 mb-6">Combien de bouteilles/unités avez-vous reçu ?</p>
            <input 
              type="number" 
              className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-yellow-500 outline-none mb-6 text-2xl font-black text-center"
              placeholder="Ex: 24"
              value={stockQty}
              onChange={(e) => setStockQty(Number(e.target.value))}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setShowAddStockModal(null)}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  if (stockQty <= 0 || isAddingStock) return;
                  setIsAddingStock(true);
                  window.setTimeout(() => {
                  onAddStock(showAddStockModal, stockQty);
                  setShowAddStockModal(null);
                  setStockQty(0);
                  setIsAddingStock(false);
                  pushToast('Stock mis a jour');
                  }, 450);
                }}
                className="flex-2 bg-yellow-500 text-gray-900 font-black py-4 rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={stockQty <= 0 || isAddingStock}
              >
                {isAddingStock ? 'MISE A JOUR...' : 'CONFIRMER'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl animate-pop-in">
            <h3 className="text-2xl font-black mb-2">Ajouter un produit</h3>
            <p className="text-gray-500 mb-6">Ajoutez la photo, le prix, le nom et une description (optionnelle).</p>

            <div className="space-y-4">
              <input
                type="text"
                className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-yellow-500 outline-none"
                placeholder="Nom du produit"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
              <input
                type="number"
                min={0}
                className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-yellow-500 outline-none"
                placeholder="Prix (FCFA)"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(Number(e.target.value))}
              />
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-600">Photo du produit</label>
                <input
                  key={productImageInputKey}
                  type="file"
                  accept="image/*"
                  className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-yellow-500 outline-none file:mr-3 file:px-3 file:py-1.5 file:rounded-xl file:border-0 file:bg-yellow-100 file:text-yellow-800 file:font-bold"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setNewProductImageUrl(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {newProductImageUrl && (
                  <img
                    src={newProductImageUrl}
                    alt="Apercu produit"
                    className="w-24 h-24 object-cover rounded-xl border"
                  />
                )}
              </div>
              <textarea
                className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-yellow-500 outline-none resize-none"
                placeholder="Description (optionnelle)"
                rows={3}
                value={newProductDescription}
                onChange={(e) => setNewProductDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddProduct(false);
                  setNewProductName('');
                  setNewProductPrice(0);
                  setNewProductImageUrl('');
                  setNewProductDescription('');
                  setProductImageInputKey(prev => prev + 1);
                }}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!newProductName.trim() || newProductPrice <= 0 || !newProductImageUrl.trim() || isSavingProduct) return;
                  setIsSavingProduct(true);
                  const createdProduct: Product = {
                    id: `p-${Date.now()}`,
                    name: newProductName.trim(),
                    description: newProductDescription.trim(),
                    category: 'Autre',
                    price: newProductPrice,
                    initialStock: 0,
                    currentStock: 0,
                    imageUrl: newProductImageUrl.trim()
                  };
                  window.setTimeout(() => {
                    onUpdateProducts([...state.products, createdProduct]);
                    setShowAddProduct(false);
                    setNewProductName('');
                    setNewProductPrice(0);
                    setNewProductImageUrl('');
                    setNewProductDescription('');
                    setProductImageInputKey(prev => prev + 1);
                    setIsSavingProduct(false);
                    pushToast('Produit ajoute avec succes');
                  }, 550);
                }}
                className="flex-1 bg-yellow-500 text-gray-900 font-black py-4 rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newProductName.trim() || newProductPrice <= 0 || !newProductImageUrl.trim() || isSavingProduct}
              >
                {isSavingProduct ? 'AJOUT...' : 'AJOUTER'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-4 right-4 z-[250] space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-2xl text-sm font-bold text-white shadow-xl animate-toast-in ${
              toast.tone === 'success' ? 'bg-emerald-600' : 'bg-gray-900'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatronDashboard;
