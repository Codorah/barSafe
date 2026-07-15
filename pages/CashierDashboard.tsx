import React from 'react';
import { Order, OrderStatus } from '../types';

interface CashierDashboardProps {
  orders: Order[];
  onValidatePayment: (orderId: string) => void;
}

const methodLabel: Record<string, string> = {
  ESPECES: 'Espèces',
  CARTE: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
};

const CashierDashboard: React.FC<CashierDashboardProps> = ({ orders, onValidatePayment }) => {
  const pendingPayments = orders.filter(o => o.status === OrderStatus.SERVED || o.status === OrderStatus.PENDING);
  const paidToday = orders.filter(o => o.status === OrderStatus.PAID);
  const takings = paidToday.reduce((acc, o) => acc + o.total, 0);
  const pendingTotal = pendingPayments.reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="space-y-8 pb-16">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink tracking-tight">Encaissement</h1>
        <p className="text-sm text-muted mt-0.5">Validez les paiements — le stock est déduit à la validation</p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6">
          <p className="eyebrow mb-2">Encaissé</p>
          <p className="font-display text-3xl font-semibold text-positive tabnum">{takings.toLocaleString()}<span className="text-sm text-muted font-sans font-medium ml-1">FCFA</span></p>
        </div>
        <div className="card p-6">
          <p className="eyebrow mb-2">En attente</p>
          <p className="font-display text-3xl font-semibold text-ink tabnum">{pendingTotal.toLocaleString()}<span className="text-sm text-muted font-sans font-medium ml-1">FCFA</span></p>
        </div>
        <div className="card p-6">
          <p className="eyebrow mb-2">Tickets réglés</p>
          <p className="font-display text-3xl font-semibold text-ink tabnum">{paidToday.length}</p>
        </div>
      </div>

      {/* Pending payments */}
      <section className="space-y-4">
        <h2 className="eyebrow">Paiements attendus</h2>
        {pendingPayments.length === 0 ? (
          <div className="card-flat p-10 text-center text-muted text-sm">Aucun paiement en attente.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingPayments.map(order => (
              <div key={order.id} className="card p-6 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="eyebrow mb-1">Table {order.tableNumber}</p>
                    <p className="font-display text-lg font-semibold text-ink">#{order.id.slice(0, 5)}</p>
                  </div>
                  <span className="badge badge-amber">{order.paymentMethod ? methodLabel[order.paymentMethod] : 'À définir'}</span>
                </div>
                <div className="font-display text-2xl font-semibold text-ink tabnum">{order.total.toLocaleString()} <span className="text-sm text-muted font-sans font-medium">FCFA</span></div>
                <button onClick={() => onValidatePayment(order.id)} className="btn btn-primary btn-block">
                  <i className="fa-solid fa-check-double" aria-hidden="true"></i> Valider le paiement
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section className="space-y-4">
        <h2 className="eyebrow">Derniers encaissements</h2>
        {paidToday.length === 0 ? (
          <div className="card-flat p-8 text-center text-muted text-sm">Aucun encaissement enregistré.</div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto scroll-slim">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line/8">
                    <th className="px-6 py-4 eyebrow font-semibold">Heure</th>
                    <th className="px-6 py-4 eyebrow font-semibold">Table</th>
                    <th className="px-6 py-4 eyebrow font-semibold">Mode</th>
                    <th className="px-6 py-4 eyebrow font-semibold text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {paidToday.slice(0, 12).map(o => (
                    <tr key={o.id} className="border-b border-line/6 last:border-0">
                      <td className="px-6 py-4 text-muted tabnum">{new Date(o.timestamp).toLocaleTimeString()}</td>
                      <td className="px-6 py-4 font-medium text-ink">Table {o.tableNumber}</td>
                      <td className="px-6 py-4"><span className="badge badge-muted">{o.paymentMethod ? methodLabel[o.paymentMethod] : '—'}</span></td>
                      <td className="px-6 py-4 text-right font-semibold text-positive tabnum">{o.total.toLocaleString()} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default CashierDashboard;
