import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../supabaseClient', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));

const { api, ApiError, mapOrder } = await import('../api');

beforeEach(() => rpc.mockReset());

describe('placeOrder', () => {
  it('never sends a client-computed total', async () => {
    rpc.mockResolvedValue({ data: 'order-1', error: null });
    await api.placeOrder('bar', { tableNumber: 4, clientName: 'Kossi', paymentMethod: 'ESPECES' }, [{ productId: 'beer', quantity: 2 }]);
    const [fn, args] = rpc.mock.calls[0];
    expect(fn).toBe('place_order');
    expect(args).not.toHaveProperty('p_total');
    expect(args.p_items).toEqual([{ product_id: 'beer', quantity: 2 }]);
    expect(args.p_token).toBeNull();
  });
});

describe('payOrder', () => {
  it('passes the staff token and surfaces the server message', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Commande déjà encaissée.', code: 'P0001' } });
    await expect(api.payOrder('tok', 'order-1')).rejects.toBeInstanceOf(ApiError);
    await expect(api.payOrder('tok', 'order-1')).rejects.toThrow('Commande déjà encaissée.');
    expect(rpc).toHaveBeenCalledWith('pay_order', { p_token: 'tok', p_order: 'order-1' });
  });
});

describe('addStock', () => {
  it('uses the atomic RPC', async () => {
    rpc.mockResolvedValue({ data: 17, error: null });
    expect(await api.addStock('tok', 'beer', 5)).toBe(17);
    expect(rpc).toHaveBeenCalledWith('add_stock', { p_token: 'tok', p_product: 'beer', p_qty: 5 });
  });
});

describe('mapOrder', () => {
  it('maps snake_case rows and numeric strings', () => {
    const o = mapOrder({
      id: 'o', table_number: 3, status: 'PAYÉ', total: '8000', created_at: '2026-10-22T10:00:00Z',
      order_items: [{ product_id: 'beer', quantity: 2, price_at_time: '1000' }],
    });
    expect(o.total).toBe(8000);
    expect(o.items).toEqual([{ productId: 'beer', quantity: 2, priceAtTime: 1000 }]);
    expect(o.tableNumber).toBe(3);
  });
});
