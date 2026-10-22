import { describe, expect, it } from 'vitest';
import { cartCount, cartItems, cartTotal, stockShortfalls } from '../lib/order';

const products = [
  { id: 'beer', name: 'Flag', price: 1000, currentStock: 10 },
  { id: 'dish', name: 'Brochette', price: 2500, currentStock: 1 },
];

describe('cart', () => {
  it('computes the total from product prices', () => {
    expect(cartTotal({ beer: 3, dish: 2 }, products)).toBe(8000);
  });

  it('ignores products that no longer exist', () => {
    expect(cartTotal({ beer: 1, ghost: 4 }, products)).toBe(1000);
  });

  it('is zero for an empty cart', () => {
    expect(cartTotal({}, products)).toBe(0);
    expect(cartCount({})).toBe(0);
  });

  it('counts items and drops empty lines', () => {
    expect(cartCount({ beer: 3, dish: 2 })).toBe(5);
    expect(cartItems({ beer: 2, dish: 0 })).toEqual([{ productId: 'beer', quantity: 2 }]);
  });
});

describe('stockShortfalls', () => {
  it('lists products whose stock cannot cover the order', () => {
    expect(stockShortfalls([{ productId: 'beer', quantity: 3 }, { productId: 'dish', quantity: 2 }], products)).toEqual(['Brochette']);
  });

  it('is empty when the stock covers everything', () => {
    expect(stockShortfalls([{ productId: 'beer', quantity: 10 }], products)).toEqual([]);
  });
});
