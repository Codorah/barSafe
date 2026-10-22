import { supabase } from './supabaseClient';
import { Establishment, Order, Product, Notification, UserRole, OrderStatus, PaymentMethod } from './types';
import { FriendlyError, ErrorTone, toFriendlyError } from './lib/errors';
import { blobToDataUrl, compressImage, ImageKind } from './lib/image';

// ---------- mappers (DB row -> app type) ----------
/* eslint-disable @typescript-eslint/no-explicit-any -- raw PostgREST rows */
export const mapProduct = (r: any): Product => ({
  id: r.id,
  name: r.name,
  description: r.description || '',
  category: r.category || 'Autre',
  price: Number(r.price) || 0,
  initialStock: r.initial_stock ?? 0,
  currentStock: r.current_stock ?? 0,
  lowStockThreshold: r.low_stock_threshold ?? 10,
  imageUrl: r.image_url || '',
});

export const mapOrder = (r: any): Order => ({
  id: r.id,
  tableNumber: r.table_number ?? 1,
  clientName: r.client_name || undefined,
  items: (r.order_items || []).map((i: any) => ({
    productId: i.product_id,
    quantity: i.quantity,
    priceAtTime: Number(i.price_at_time) || 0,
  })),
  status: r.status as OrderStatus,
  paymentMethod: (r.payment_method || undefined) as PaymentMethod | undefined,
  serverName: r.server_name || '',
  timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  total: Number(r.total) || 0,
});

const mapNotif = (r: any): Notification => ({
  id: r.id,
  type: r.type,
  message: r.message,
  timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  tableNumber: r.table_number ?? 0,
  handled: !!r.handled,
  orderId: r.order_id || undefined,
});

const mapEstablishment = (r: any): Establishment => ({
  id: r.id,
  name: r.name,
  description: r.description || '',
  logoUrl: r.logo_url || '',
  coverUrl: r.cover_url || '',
  address: r.address || '',
  lat: r.lat ?? null,
  lng: r.lng ?? null,
  products: [],
  orders: [],
  employees: [],
  notifications: [],
  loaded: false,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface NewEstablishmentInput {
  name: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  address: string;
  lat: number | null;
  lng: number | null;
  codePatron: string;
  codeServeur: string;
  codeCaissier: string;
}

export { SESSION_EXPIRED } from './lib/errors';

/** Every failure leaves the API as an ApiError carrying a user-ready title and message. */
export class ApiError extends Error implements FriendlyError {
  readonly title: string;
  readonly tone: ErrorTone;
  readonly code?: string;
  readonly hint?: string;
  readonly retryable: boolean;

  constructor(f: FriendlyError) {
    super(f.message);
    this.title = f.title;
    this.tone = f.tone;
    this.code = f.code;
    this.hint = f.hint;
    this.retryable = f.retryable;
  }

  static from(err: unknown, context: string): ApiError {
    if (err instanceof ApiError) return err;
    console.error(`[api] ${context}`, err);
    return new ApiError(toFriendlyError(err));
  }
}

const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
  let result;
  try {
    result = await supabase.rpc(fn, args);
  } catch (e) {
    throw ApiError.from(e, fn); // network failure: fetch itself rejected
  }
  if (result.error) throw ApiError.from(result.error, fn);
  return result.data as T;
};

export const api = {
  // ---------- Establishments ----------
  async getEstablishments(): Promise<Establishment[]> {
    const { data, error } = await supabase
      .from('establishments')
      .select('id,name,description,logo_url,cover_url,address,lat,lng,created_at')
      .order('created_at', { ascending: false });
    if (error) throw ApiError.from(error, 'getEstablishments');
    return (data || []).map(mapEstablishment);
  },

  // Lightweight product index across all establishments (powers food search on the home page)
  async getProductIndex(): Promise<{ establishmentId: string; name: string; category: string }[]> {
    const { data, error } = await supabase.from('products').select('establishment_id,name,category');
    if (error) return [];
    return (data || []).map(r => ({ establishmentId: r.establishment_id, name: r.name, category: r.category }));
  },

  /** Public menu of one establishment. */
  async getProducts(establishmentId: string): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').eq('establishment_id', establishmentId).order('created_at', { ascending: true });
    if (error) throw ApiError.from(error, 'getProducts');
    return (data || []).map(mapProduct);
  },

  /** Staff only: orders + open notifications of the session's establishment. */
  async getBarActivity(token: string): Promise<{ orders: Order[]; notifications: Notification[] }> {
    const data = await rpc<{ orders: unknown[]; notifications: unknown[] }>('get_bar_activity', { p_token: token });
    return { orders: (data?.orders || []).map(mapOrder), notifications: (data?.notifications || []).map(mapNotif) };
  },

  /** QR client: only the orders whose tracking tokens this device holds. */
  async trackOrders(tokens: string[]): Promise<Order[]> {
    if (tokens.length === 0) return [];
    const data = await rpc<unknown[]>('track_orders', { p_tokens: tokens });
    return (data || []).map(mapOrder);
  },

  // ---------- Accounts ----------
  /** Signed-in customer: order history across establishments. */
  async myOrders(): Promise<(Order & { establishmentName: string })[]> {
    const data = await rpc<Record<string, unknown>[]>('my_orders', {});
    return (data || []).map(r => ({ ...mapOrder(r), establishmentName: String(r.establishment_name || '') }));
  },

  /** Signed-in owner: establishments attached to the account. */
  async myEstablishments(): Promise<Establishment[]> {
    const data = await rpc<unknown[]>('my_establishments', {});
    return (data || []).map(mapEstablishment);
  },

  /**
   * Compresses then stores an image; returns the URL to save on the bar/product.
   * Uses the `upload-image` Edge Function (Storage). If that function is not deployed
   * yet, falls back to an inline compressed data URL (capped server-side at ~150 KB).
   */
  async uploadImage(file: File, kind: ImageKind, staffToken?: string): Promise<string> {
    let blob: Blob;
    try {
      blob = await compressImage(file, kind);
    } catch (e) {
      throw new ApiError({ title: 'Image refusée', message: (e as Error).message, tone: 'error', retryable: false });
    }
    const form = new FormData();
    form.append('file', new File([blob], `${kind}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`, { type: blob.type }));
    form.append('kind', kind);
    if (staffToken) form.append('token', staffToken);

    const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>('upload-image', { body: form });
    if (!error && data?.url) return data.url;

    // Function answered with a reason (403, 413…): show it
    const status = (error as { context?: Response } | null)?.context?.status;
    if (error && status && status !== 404) {
      let message = 'L’image n’a pas pu être envoyée.';
      try { message = (await (error as unknown as { context: Response }).context.json()).error || message; } catch { /* not JSON */ }
      throw new ApiError({ title: 'Image non envoyée', message, tone: 'error', retryable: status >= 500 });
    }
    // Function not deployed (404) or unreachable: keep a small inline copy
    if (blob.size > 150 * 1024) {
      throw new ApiError({ title: 'Image trop lourde', message: 'Choisissez une image plus légère.', tone: 'error', retryable: false });
    }
    return blobToDataUrl(blob);
  },

  /** Right to erasure: deletes the signed-in account (orders are kept, detached). */
  async deleteMyAccount(): Promise<void> {
    await rpc('delete_my_account', {});
  },

  /** Signed-in owner: opens a Direction session on one of their bars, no code needed. */
  async ownerSession(establishmentId: string): Promise<string> {
    return rpc<string>('owner_session', { p_establishment: establishmentId });
  },

  async createEstablishment(input: NewEstablishmentInput): Promise<string> {
    return rpc<string>('create_establishment', {
      p_name: input.name,
      p_description: input.description,
      p_logo_url: input.logoUrl,
      p_cover_url: input.coverUrl,
      p_address: input.address,
      p_lat: input.lat,
      p_lng: input.lng,
      p_code_patron: input.codePatron,
      p_code_serveur: input.codeServeur,
      p_code_caissier: input.codeCaissier,
    });
  },

  // ---------- Staff session (3 separate codes) ----------
  /** Returns a session token, or null when the code is wrong. */
  async staffLogin(establishmentId: string, role: UserRole, code: string): Promise<string | null> {
    return rpc<string | null>('staff_login', { p_establishment: establishmentId, p_role: role, p_code: code });
  },

  /** Server-side check used to restore a session after a reload.
   *  null = session invalid or expired; throws when the server can't be reached. */
  async staffSession(token: string): Promise<{ establishmentId: string; role: UserRole } | null> {
    const data = await rpc<{ establishment_id: string; role: string }[]>('staff_session', { p_token: token });
    const row = Array.isArray(data) ? data[0] : null;
    return row ? { establishmentId: row.establishment_id, role: row.role as UserRole } : null;
  },

  async staffLogout(token: string): Promise<void> {
    // Best effort: the session expires on its own anyway.
    try { await supabase.rpc('staff_logout', { p_token: token }); } catch { /* offline */ }
  },

  // ---------- Products (Direction) ----------
  async addProduct(token: string, product: Omit<Product, 'id'>): Promise<string> {
    return rpc<string>('add_product', {
      p_token: token,
      p_name: product.name,
      p_description: product.description,
      p_category: product.category,
      p_price: product.price,
      p_stock: product.currentStock,
      p_low_stock_threshold: product.lowStockThreshold ?? 10,
      p_image_url: product.imageUrl,
    });
  },

  async deleteProduct(token: string, productId: string): Promise<void> {
    await rpc('delete_product', { p_token: token, p_product: productId });
  },

  /** Atomic restock, returns the new current stock. */
  async addStock(token: string, productId: string, qty: number): Promise<number> {
    return rpc<number>('add_stock', { p_token: token, p_product: productId, p_qty: qty });
  },

  // ---------- Orders ----------
  /** The total is computed server-side from product prices; `token` is set for staff-entered orders.
   *  Returns the order's secret tracking token (the only way a QR client can read it back). */
  async placeOrder(
    establishmentId: string,
    order: { tableNumber: number; clientName?: string; paymentMethod?: PaymentMethod; token?: string },
    items: { productId: string; quantity: number }[]
  ): Promise<string> {
    return rpc<string>('place_order', {
      p_establishment: establishmentId,
      p_table: order.tableNumber,
      p_client_name: order.clientName || null,
      p_payment_method: order.paymentMethod || null,
      p_items: items.map(i => ({ product_id: i.productId, quantity: i.quantity })),
      p_token: order.token || null,
    });
  },

  /** Returns false when the table already called less than a minute ago. */
  async callServer(establishmentId: string, tableNumber: number): Promise<boolean> {
    return rpc<boolean>('call_server', { p_establishment: establishmentId, p_table: tableNumber });
  },

  async updateOrderStatus(token: string, orderId: string, status: OrderStatus.SERVED | OrderStatus.CANCELLED): Promise<void> {
    await rpc('set_order_status', { p_token: token, p_order: orderId, p_status: status });
  },

  /** Marks the order PAYÉ and deducts stock atomically. Refused if already paid. */
  async payOrder(token: string, orderId: string): Promise<void> {
    await rpc('pay_order', { p_token: token, p_order: orderId });
  },

  async clearNotification(token: string, id: string): Promise<void> {
    await rpc('clear_notification', { p_token: token, p_id: id });
  },

  // ---------- Realtime ----------
  /**
   * Orders and notifications are private, so the database only broadcasts content-free
   * "change" signals (topics `bar:<id>` and `order:<tracking token>`); the app then
   * re-reads through the authorized RPCs. Products are public and use postgres_changes.
   */
  subscribe(establishmentId: string, topics: string[], onChange: () => void) {
    const menu = supabase.channel(`menu_${establishmentId}_${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `establishment_id=eq.${establishmentId}` }, onChange)
      .subscribe();
    const signals = topics.map(topic => supabase.channel(topic).on('broadcast', { event: 'change' }, onChange).subscribe());
    return () => { [menu, ...signals].forEach(c => { supabase.removeChannel(c); }); };
  },
};
