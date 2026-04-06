
import React from 'react';
import { Order, OrderStatus } from '../types';

interface CashierDashboardProps {
  orders: Order[];
  onValidatePayment: (orderId: string) => void;
}

const CashierDashboard: React.FC<CashierDashboardProps> = ({ orders, onValidatePayment }) => {
  const pendingPayments = orders.filter(o => o.status === OrderStatus.SERVED || o.status === OrderStatus.PENDING);
  const paidToday = orders.filter(o => o.status === OrderStatus.PAID);

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-3xl font-black">Caisse Centrale 💰</h1>
        <p className="text-gray-500 italic">Validation des paiements et sorties de stock</p>
      </header>

      <section>
        <h2 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-4">Paiements attendus</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingPayments.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-black text-gray-400 uppercase">Table {order.tableNumber}</span>
                  <p className="text-lg font-black">#{order.id.slice(0,5)}</p>
                </div>
                <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                  {order.paymentMethod?.replace('_', ' ') || 'À DÉFINIR'}
                </span>
              </div>

              <div className="text-2xl font-black text-gray-900">
                {order.total.toLocaleString()} FCFA
              </div>

              <button 
                onClick={() => onValidatePayment(order.id)}
                className="w-full bg-green-600 text-white font-black py-3 rounded-2xl shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-check-double"></i> ENCAISSÉ
              </button>
            </div>
          ))}
          {pendingPayments.length === 0 && <p className="text-gray-400 italic text-center col-span-full py-10 bg-white rounded-3xl border border-dashed">Aucun paiement en attente.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-4">Derniers encaissements</h2>
        <div className="bg-white rounded-3xl border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 font-bold">Heure</th>
                <th className="px-6 py-4 font-bold">Table</th>
                <th className="px-6 py-4 font-bold">Mode</th>
                <th className="px-6 py-4 font-bold text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paidToday.slice(0, 10).map(o => (
                <tr key={o.id}>
                  <td className="px-6 py-4 text-gray-400">{new Date(o.timestamp).toLocaleTimeString()}</td>
                  <td className="px-6 py-4 font-bold">Table {o.tableNumber}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-lg font-bold">{o.paymentMethod}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-green-600">{o.total.toLocaleString()} F</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default CashierDashboard;
