import { Product } from '../types';

export type Cart = Record<string, number>;

/** Display-only estimate. The authoritative total is computed by the `place_order` RPC. */
export const cartTotal = (cart: Cart, products: Pick<Product, 'id' | 'price'>[]): number =>
  Object.entries(cart).reduce((acc, [id, qty]) => acc + (products.find(p => p.id === id)?.price || 0) * qty, 0);

export const cartCount = (cart: Cart): number =>
  Object.values(cart).reduce((a, b) => a + b, 0);

export const cartItems = (cart: Cart): { productId: string; quantity: number }[] =>
  Object.entries(cart)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));

/** Products that cannot cover the ordered quantity, i.e. what `pay_order` would refuse. */
export const stockShortfalls = (
  items: { productId: string; quantity: number }[],
  products: Pick<Product, 'id' | 'name' | 'currentStock'>[],
): string[] =>
  items.flatMap(i => {
    const p = products.find(x => x.id === i.productId);
    return p && p.currentStock < i.quantity ? [p.name] : [];
  });
