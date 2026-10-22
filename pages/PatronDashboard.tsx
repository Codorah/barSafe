import React, { useEffect, useMemo, useState } from 'react';
import { Product, OrderStatus, Order, AppState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import QRCode from 'react-qr-code';
import { useTheme } from '../theme';

interface PatronDashboardProps {
  state: {
    products: Product[];
    orders: Order[];
    currentUser: AppState['currentUser'];
  };
  /** Each resolves to true on success; failures are already reported by the app. */
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  onDeleteProduct: (id: string) => Promise<boolean>;
  onAddStock: (productId: string, qty: number) => Promise<boolean>;
  /** Compresses + stores a product photo; null when it failed (already reported). */
  onUploadImage: (file: File) => Promise<string | null>;
}

const CATEGORIES = ['Bière', 'Sucrerie', 'Plat', 'Autre'];

type Tab = 'STATS' | 'STOCK' | 'PRODUCTS' | 'QR_CODE';
const TABS: { key: Tab; label: string }[] = [
  { key: 'STATS', label: 'Rapports' },
  { key: 'STOCK', label: 'Inventaire' },
  { key: 'PRODUCTS', label: 'Produits' },
  { key: 'QR_CODE', label: 'QR Code' },
];

const PatronDashboard: React.FC<PatronDashboardProps> = ({ state, onAddProduct, onDeleteProduct, onAddStock, onUploadImage }) => {
  const { resolved } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('STATS');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState<string | null>(null);
  const [stockQty, setStockQty] = useState(0);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState(0);
  const [newProductImageUrl, setNewProductImageUrl] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Bière');
  const [newProductThreshold, setNewProductThreshold] = useState(10);
  const [productImageInputKey, setProductImageInputKey] = useState(0);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; tone: 'success' | 'info' }>>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState<'ALL' | 'LOW_STOCK' | string>('ALL');
  const [displayedSales, setDisplayedSales] = useState(0);
  const [displayedLowStock, setDisplayedLowStock] = useState(0);

  const chart = resolved === 'dark'
    ? { bar: '#E0A33E', grid: 'rgba(244,236,224,0.10)', tick: '#B0A394', tipBg: '#201B16', tipText: '#F4ECE0' }
    : { bar: '#E0A33E', grid: 'rgba(26,21,18,0.10)', tick: '#6B5D4F', tipBg: '#FFFDF9', tipText: '#1A1512' };

  const pushToast = (message: string, tone: 'success' | 'info' = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, message, tone }]);
    window.setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2400);
  };

  const totalSales = state.orders.filter(o => o.status === OrderStatus.PAID).reduce((acc, o) => acc + o.total, 0);
  const isLow = (p: Product) => p.currentStock < (p.lowStockThreshold ?? 10);
  const lowStockCount = state.products.filter(isLow).length;
  const stockValue = state.products.reduce((acc, p) => acc + p.currentStock * p.price, 0);
  const alertCount = state.products.filter(p => isLow(p) && p.currentStock > 0).length;
  const outCount = state.products.filter(p => p.currentStock <= 0).length;
  const suggestReorder = (p: Product) => Math.max((p.lowStockThreshold ?? 10) * 2 - p.currentStock, p.lowStockThreshold ?? 10);

  const categoryFilters = useMemo(() => Array.from(new Set(state.products.map(p => p.category))), [state.products]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return state.products.filter(p => {
      const matchesSearch = !term || p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term);
      const matchesFilter = productFilter === 'ALL' || (productFilter === 'LOW_STOCK' ? p.currentStock < (p.lowStockThreshold ?? 10) : p.category === productFilter);
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
      setDisplayedSales(Math.round(startValue + (totalSales - startValue) * progress));
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
      setDisplayedLowStock(Math.round(startValue + (lowStockCount - startValue) * progress));
      if (progress < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [lowStockCount]);

  const topProducts = state.products
    .map(p => {
      const sold = state.orders.filter(o => o.status === OrderStatus.PAID).reduce((acc, o) => acc + (o.items.find(i => i.productId === p.id)?.quantity || 0), 0);
      return { name: p.name, sold };
    })
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  // One QR per table: the menu opens with the table already set
  const [tableCount, setTableCount] = useState(() => {
    const saved = Number(localStorage.getItem('barsafe_table_count'));
    return saved >= 1 && saved <= 100 ? saved : 10;
  });
  const qrFor = (table: number) => `${window.location.origin}/b/${state.currentUser?.establishmentId}?t=${table}`;
  const [imageUploading, setImageUploading] = useState(false);

  const paidOrders = state.orders.filter(o => o.status === OrderStatus.PAID);
  const paidCount = paidOrders.length;
  const avgTicket = paidCount ? Math.round(totalSales / paidCount) : 0;

  const salesByDay = useMemo(() => {
    const out: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const start = d.getTime(); const end = start + 86400000;
      const total = state.orders
        .filter(o => o.status === OrderStatus.PAID && o.timestamp >= start && o.timestamp < end)
        .reduce((a, o) => a + o.total, 0);
      out.push({ label: d.toLocaleDateString('fr-FR', { weekday: 'short' }), total });
    }
    return out;
  }, [state.orders]);

  const paymentBreakdown = [
    { method: 'Espèces', key: 'ESPECES', icon: 'fa-money-bill-wave' },
    { method: 'Carte', key: 'CARTE', icon: 'fa-credit-card' },
    { method: 'Mobile Money', key: 'MOBILE_MONEY', icon: 'fa-mobile-screen-button' },
  ].map(m => ({ ...m, total: paidOrders.filter(o => o.paymentMethod === m.key).reduce((a, o) => a + o.total, 0) }));
  const paymentMax = Math.max(1, ...paymentBreakdown.map(p => p.total));

  const exportCSV = () => {
    const header = ['Date', 'Heure', 'Table', 'Client', 'Statut', 'Paiement', 'Total'];
    const rows = state.orders.map(o => [
      new Date(o.timestamp).toLocaleDateString('fr-FR'),
      new Date(o.timestamp).toLocaleTimeString('fr-FR'),
      o.tableNumber, o.clientName || '', o.status, o.paymentMethod || '', o.total,
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barsafe-commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Export CSV téléchargé');
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      {/* Header + tabs */}
      <header className="space-y-5">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted mt-1">Pilotez votre établissement d'un coup d'œil</p>
        </div>
        <div className="overflow-x-auto scroll-slim -mx-1 px-1">
          <div className="segmented w-max">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`seg-item ${activeTab === t.key ? 'seg-item-active' : ''}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* STATS */}
      {activeTab === 'STATS' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-ink">Aperçu</h3>
            <button onClick={exportCSV} className="btn btn-outline btn-sm"><i className="fa-solid fa-file-csv" aria-hidden="true"></i> Export CSV</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-6">
              <p className="eyebrow mb-2">Chiffre d'affaires</p>
              <p className="font-display text-2xl sm:text-3xl font-semibold text-positive tabnum">{displayedSales.toLocaleString()}<span className="text-sm text-muted font-sans font-medium ml-1">F</span></p>
            </div>
            <div className="card p-6">
              <p className="eyebrow mb-2">Panier moyen</p>
              <p className="font-display text-2xl sm:text-3xl font-semibold text-ink tabnum">{avgTicket.toLocaleString()}<span className="text-sm text-muted font-sans font-medium ml-1">F</span></p>
            </div>
            <div className="card p-6">
              <p className="eyebrow mb-2">Commandes payées</p>
              <p className="font-display text-2xl sm:text-3xl font-semibold text-ink tabnum">{paidCount}</p>
            </div>
            <button onClick={() => setActiveTab('STOCK')} className="card card-hover p-6 text-left">
              <p className="eyebrow mb-2">Stock faible</p>
              <p className="font-display text-2xl sm:text-3xl font-semibold text-danger tabnum">{displayedLowStock} <span className="text-sm text-muted font-sans font-medium">prod.</span></p>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-display text-lg font-semibold text-ink mb-5">Produits les plus vendus</h3>
              {topProducts.length === 0 ? (
                <div className="h-64 grid place-items-center text-sm text-muted">Pas encore de ventes.</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chart.grid} />
                      <XAxis dataKey="name" tick={{ fill: chart.tick, fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: chart.tick, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: chart.grid }} contentStyle={{ background: chart.tipBg, border: 'none', borderRadius: 14, color: chart.tipText, boxShadow: '0 10px 30px -12px rgba(0,0,0,0.4)' }} labelStyle={{ color: chart.tipText }} />
                      <Bar dataKey="sold" fill={chart.bar} radius={[8, 8, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card p-6">
              <h3 className="font-display text-lg font-semibold text-ink mb-5">Inventaire rapide</h3>
              {state.products.length === 0 ? (
                <div className="h-64 grid place-items-center text-sm text-muted">Aucun produit enregistré.</div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto scroll-slim pr-1">
                  {state.products.map(p => {
                    const sold = state.orders.filter(o => o.status === OrderStatus.PAID).reduce((acc, o) => acc + (o.items.find(i => i.productId === p.id)?.quantity || 0), 0);
                    return (
                      <div key={p.id} className="flex justify-between items-center pb-3 border-b border-line/6 last:border-0">
                        <div>
                          <p className="font-medium text-ink text-sm">{p.name}</p>
                          <p className="text-xs text-muted">Vendus : {sold}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold tabnum ${isLow(p) ? 'text-danger' : 'text-ink'}`}>{p.currentStock} restants</p>
                          <p className="text-[0.65rem] text-faint uppercase tracking-wide">Initial : {p.initialStock}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-display text-lg font-semibold text-ink mb-5">Ventes des 7 derniers jours</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByDay} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chart.grid} />
                    <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: chart.tick, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: chart.grid }} contentStyle={{ background: chart.tipBg, border: 'none', borderRadius: 14, color: chart.tipText }} labelStyle={{ color: chart.tipText }} formatter={(v: unknown) => [`${Number(v).toLocaleString()} F`, 'Ventes']} />
                    <Bar dataKey="total" fill={chart.bar} radius={[8, 8, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card p-6">
              <h3 className="font-display text-lg font-semibold text-ink mb-5">Encaissements par moyen</h3>
              <div className="space-y-4">
                {paymentBreakdown.map(m => (
                  <div key={m.key}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-ink font-medium flex items-center gap-2"><i className={`fa-solid ${m.icon} text-accentStrong`} aria-hidden="true"></i> {m.method}</span>
                      <span className="text-muted tabnum">{m.total.toLocaleString()} F</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface2 overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(m.total / paymentMax) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {totalSales === 0 && <p className="text-sm text-muted">Pas encore d'encaissement.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STOCK */}
      {activeTab === 'STOCK' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-6">
              <p className="eyebrow mb-2">Valeur du stock</p>
              <p className="font-display text-2xl sm:text-3xl font-semibold text-ink tabnum">{stockValue.toLocaleString()}<span className="text-sm text-muted font-sans font-medium ml-1">FCFA</span></p>
            </div>
            <div className="card p-6">
              <p className="eyebrow mb-2">En alerte</p>
              <p className="font-display text-2xl sm:text-3xl font-semibold text-warn tabnum">{alertCount} <span className="text-sm text-muted font-sans font-medium">produits</span></p>
            </div>
            <div className="card p-6">
              <p className="eyebrow mb-2">Ruptures</p>
              <p className="font-display text-2xl sm:text-3xl font-semibold text-danger tabnum">{outCount} <span className="text-sm text-muted font-sans font-medium">produits</span></p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-6 border-b border-line/8">
              <h3 className="font-display text-xl font-semibold text-ink">Gestion de l'inventaire</h3>
            </div>
            {state.products.length === 0 ? (
              <div className="p-10 text-center text-muted text-sm">Aucun produit. Ajoutez-en dans l'onglet Produits.</div>
            ) : (
              <div className="overflow-x-auto scroll-slim">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line/8">
                      <th className="px-6 py-4 eyebrow font-semibold">Produit</th>
                      <th className="px-6 py-4 eyebrow font-semibold">Actuel</th>
                      <th className="px-6 py-4 eyebrow font-semibold">Seuil</th>
                      <th className="px-6 py-4 eyebrow font-semibold text-right">Valeur</th>
                      <th className="px-6 py-4 eyebrow font-semibold">État</th>
                      <th className="px-6 py-4 eyebrow font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.products.map(p => {
                      const out = p.currentStock <= 0;
                      const low = isLow(p);
                      return (
                        <tr key={p.id} className="border-b border-line/6 last:border-0">
                          <td className="px-6 py-4 font-medium text-ink">{p.name}</td>
                          <td className="px-6 py-4"><span className={`font-semibold tabnum ${low ? 'text-danger' : 'text-positive'}`}>{p.currentStock}</span></td>
                          <td className="px-6 py-4 text-muted tabnum">{p.lowStockThreshold ?? 10}</td>
                          <td className="px-6 py-4 text-right text-ink tabnum">{(p.currentStock * p.price).toLocaleString()} F</td>
                          <td className="px-6 py-4">
                            {out ? <span className="badge badge-danger">Rupture</span> : low ? <span className="badge badge-warn">Alerte</span> : <span className="badge badge-positive">OK</span>}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => { setStockQty(suggestReorder(p)); setShowAddStockModal(p.id); }} className="btn btn-soft btn-sm"><i className="fa-solid fa-plus" aria-hidden="true"></i> Réassort</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRODUCTS */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-ink">Vos produits</h2>
            <button onClick={() => setShowAddProduct(true)} className="btn btn-primary"><i className="fa-solid fa-plus" aria-hidden="true"></i> Ajouter un produit</button>
          </div>

          <div className="card p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true"></i>
              <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Rechercher un produit…" className="field field-icon" />
            </div>
            <div className="flex gap-2 overflow-x-auto scroll-slim">
              <button onClick={() => setProductFilter('ALL')} className={`chip ${productFilter === 'ALL' ? 'chip-active' : ''}`}>Tous</button>
              <button onClick={() => setProductFilter('LOW_STOCK')} className={`chip ${productFilter === 'LOW_STOCK' ? 'chip-active' : ''}`}>Stock faible</button>
              {categoryFilters.map(c => (
                <button key={c} onClick={() => setProductFilter(c)} className={`chip ${productFilter === c ? 'chip-active' : ''}`}>{c}</button>
              ))}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="card-flat p-10 text-center text-muted text-sm">Aucun produit ne correspond à ce filtre.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map(p => (
                <div key={p.id} className="card overflow-hidden flex flex-col">
                  <img src={p.imageUrl} alt={p.name} className="w-full h-40 object-cover" />
                  <div className="p-4 flex flex-col flex-grow">
                    <h4 className="font-semibold text-ink">{p.name}</h4>
                    <p className="text-xs text-muted line-clamp-2 mt-1 flex-grow">{p.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="font-display text-lg font-semibold text-accentStrong tabnum">{p.price.toLocaleString()} <span className="text-xs text-muted font-sans font-medium">F</span></p>
                      <span className={`badge ${isLow(p) ? 'badge-danger' : 'badge-positive'}`}>{isLow(p) ? 'Stock faible' : 'Disponible'}</span>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-line/8">
                      <button className="btn btn-danger btn-sm flex-grow" onClick={async () => { if (await onDeleteProduct(p.id)) pushToast('Produit supprimé', 'info'); }}>
                        <i className="fa-solid fa-trash" aria-hidden="true"></i> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR CODE : un code par table */}
      {activeTab === 'QR_CODE' && (
        <div className="space-y-6 animate-rise-in">
          <div className="panel p-6 sm:p-8 flex flex-wrap items-end justify-between gap-5 no-print">
            <div className="max-w-md">
              <h3 className="font-display text-2xl font-semibold text-ink">QR codes des tables</h3>
              <p className="text-muted text-sm mt-1.5 pretty">Chaque code ouvre le menu avec le bon numéro de table : le client n’a rien à saisir. Imprimez-les et posez chacun sur sa table.</p>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className="label" htmlFor="table-count">Nombre de tables</label>
                <input
                  id="table-count" type="number" min={1} max={100} className="field !w-28"
                  value={tableCount}
                  onChange={(e) => {
                    const n = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                    setTableCount(n);
                    try { localStorage.setItem('barsafe_table_count', String(n)); } catch { /* storage unavailable */ }
                  }}
                />
              </div>
              <button onClick={() => window.print()} className="btn btn-primary"><i className="fa-solid fa-print" aria-hidden="true"></i> Imprimer</button>
            </div>
          </div>

          <div className="print-area grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: tableCount }, (_, i) => i + 1).map(n => (
              <div key={n} className="qr-card card p-4 flex flex-col items-center text-center">
                <div className="bg-white p-3 rounded-2xl w-full">
                  <QRCode value={qrFor(n)} size={256} style={{ width: '100%', height: 'auto' }} />
                </div>
                <p className="font-display text-xl font-semibold text-ink mt-3">Table {n}</p>
                <p className="text-xs text-muted">Scannez pour commander</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="overlay items-center justify-center" onClick={() => setShowAddStockModal(null)}>
          <div className="sheet w-full max-w-sm rounded-[2rem] p-7 animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl font-semibold text-ink mb-1">Nouvel arrivage</h3>
            <p className="text-sm text-muted mb-5">Combien d'unités avez-vous reçu&nbsp;?</p>
            <input
              type="number"
              className="field field-lg text-center text-2xl font-semibold tabnum mb-5"
              placeholder="Ex : 24"
              value={stockQty || ''}
              onChange={(e) => setStockQty(Number(e.target.value))}
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowAddStockModal(null); setStockQty(0); }} className="btn btn-ghost flex-1">Annuler</button>
              <button
                onClick={async () => {
                  if (stockQty <= 0 || isAddingStock) return;
                  setIsAddingStock(true);
                  const ok = await onAddStock(showAddStockModal, stockQty);
                  setIsAddingStock(false);
                  if (!ok) return; // keep the modal open so the owner can retry
                  setShowAddStockModal(null);
                  setStockQty(0);
                  pushToast('Stock mis à jour');
                }}
                className="btn btn-primary flex-1"
                disabled={stockQty <= 0 || isAddingStock}
              >
                {isAddingStock ? 'Mise à jour…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="overlay items-start sm:items-center justify-center overflow-y-auto scroll-slim" onClick={() => setShowAddProduct(false)}>
          <div className="sheet w-full max-w-lg rounded-[2rem] p-7 my-4 sm:my-8 animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl font-semibold text-ink mb-1">Ajouter un produit</h3>
            <p className="text-sm text-muted mb-5">Photo, prix, nom et une description optionnelle.</p>

            <div className="space-y-4">
              <input type="text" className="field" placeholder="Nom du produit" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min={0} className="field" placeholder="Prix (FCFA)" value={newProductPrice || ''} onChange={(e) => setNewProductPrice(Number(e.target.value))} />
                <select className="field" value={newProductCategory} onChange={(e) => setNewProductCategory(e.target.value)} aria-label="Catégorie du produit">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="p-threshold">Seuil d'alerte stock</label>
                <input id="p-threshold" type="number" min={0} className="field" placeholder="Ex : 10" value={newProductThreshold || ''} onChange={(e) => setNewProductThreshold(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Photo du produit</label>
                <input
                  key={productImageInputKey}
                  type="file"
                  accept="image/*"
                  aria-label="Photo du produit"
                  className="field !py-2.5 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-accent/15 file:text-accentStrong file:font-semibold"
                  disabled={imageUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImageUploading(true);
                    const url = await onUploadImage(file);
                    setImageUploading(false);
                    if (url) setNewProductImageUrl(url);
                    else setProductImageInputKey(k => k + 1);
                  }}
                />
                {imageUploading && <p className="text-xs text-accentStrong mt-2"><i className="fa-solid fa-circle-notch fa-spin mr-1.5" aria-hidden="true"></i>Optimisation de la photo…</p>}
                {newProductImageUrl && <img src={newProductImageUrl} alt="Aperçu produit" className="w-24 h-24 object-cover rounded-xl border border-line/10 mt-3" />}
              </div>
              <textarea className="field" placeholder="Description (optionnelle)" rows={3} value={newProductDescription} onChange={(e) => setNewProductDescription(e.target.value)} />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddProduct(false);
                  setNewProductName(''); setNewProductPrice(0); setNewProductImageUrl(''); setNewProductDescription('');
                  setProductImageInputKey(prev => prev + 1);
                }}
                className="btn btn-ghost flex-1"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!newProductName.trim() || newProductPrice <= 0 || !newProductImageUrl.trim() || isSavingProduct) return;
                  setIsSavingProduct(true);
                  const createdProduct: Omit<Product, 'id'> = {
                    name: newProductName.trim(),
                    description: newProductDescription.trim(),
                    category: newProductCategory,
                    price: newProductPrice,
                    initialStock: 0,
                    currentStock: 0,
                    lowStockThreshold: newProductThreshold || 10,
                    imageUrl: newProductImageUrl.trim(),
                  };
                  const ok = await onAddProduct(createdProduct);
                  setIsSavingProduct(false);
                  if (!ok) return; // keep the form filled so nothing is lost
                  setShowAddProduct(false);
                  setNewProductName(''); setNewProductPrice(0); setNewProductImageUrl(''); setNewProductDescription(''); setNewProductCategory('Bière'); setNewProductThreshold(10);
                  setProductImageInputKey(prev => prev + 1);
                  pushToast('Produit ajouté');
                }}
                className="btn btn-primary flex-1"
                disabled={!newProductName.trim() || newProductPrice <= 0 || !newProductImageUrl.trim() || isSavingProduct}
              >
                {isSavingProduct ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed top-24 right-4 z-[250] space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-3 rounded-2xl text-sm font-semibold shadow-lift animate-toast-in ${toast.tone === 'success' ? 'bg-positive text-white' : 'bg-ink text-bg'}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatronDashboard;
