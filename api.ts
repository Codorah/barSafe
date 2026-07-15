import { supabase } from './supabaseClient';
import { Establishment, Order, Product, Notification, UserRole, OrderStatus, PaymentMethod } from './types';

// ---------- mappers (DB row -> app type) ----------
const mapProduct = (r: any): Product => ({
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

const mapOrder = (r: any): Order => ({
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

export const api = {
  // ---------- Establishments ----------
  async getEstablishments(): Promise<Establishment[]> {
    const { data, error } = await supabase
      .from('establishments')
      .select('id,name,description,logo_url,cover_url,address,lat,lng,created_at')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []).map(mapEstablishment);
  },

  // Lightweight product index across all establishments (powers food search on the home page)
  async getProductIndex(): Promise<{ establishmentId: string; name: string; category: string }[]> {
    const { data, error } = await supabase.from('products').select('establishment_id,name,category');
    if (error) return [];
    return (data || []).map((r: any) => ({ establishmentId: r.establishment_id, name: r.name, category: r.category }));
  },

  async getBarData(establishmentId: string): Promise<{ products: Product[]; orders: Order[]; notifications: Notification[] }> {
    const [p, o, n] = await Promise.all([
      supabase.from('products').select('*').eq('establishment_id', establishmentId).order('created_at', { ascending: true }),
      supabase.from('orders').select('*, order_items(*)').eq('establishment_id', establishmentId).order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('establishment_id', establishmentId).eq('handled', false).order('created_at', { ascending: false }),
    ]);
    return {
      products: (p.data || []).map(mapProduct),
      orders: (o.data || []).map(mapOrder),
      notifications: (n.data || []).map(mapNotif),
    };
  },

  async createEstablishment(input: NewEstablishmentInput): Promise<string | null> {
    const { data, error } = await supabase.rpc('create_establishment', {
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
    if (error) { console.error('createEstablishment', error); return null; }
    return data as string;
  },

  // ---------- Auth (3 separate codes) ----------
  async verifyAccess(establishmentId: string, role: UserRole, code: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('verify_access', {
      p_establishment: establishmentId,
      p_role: role,
      p_code: code,
    });
    if (error) { console.error('verifyAccess', error); return false; }
    return !!data;
  },

  // ---------- Products ----------
  async addProduct(establishmentId: string, product: Omit<Product, 'id'>): Promise<Product | null> {
    const { data, error } = await supabase.from('products').insert({
      establishment_id: establishmentId,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      initial_stock: product.initialStock,
      current_stock: product.currentStock,
      low_stock_threshold: product.lowStockThreshold ?? 10,
      image_url: product.imageUrl,
    }).select().single();
    if (error) { console.error('addProduct', error); return null; }
    return mapProduct(data);
  },

  async updateProduct(product: Product): Promise<boolean> {
    const { error } = await supabase.from('products').update({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      current_stock: product.currentStock,
      initial_stock: product.initialStock,
      low_stock_threshold: product.lowStockThreshold ?? 10,
      image_url: product.imageUrl,
    }).eq('id', product.id);
    return !error;
  },

  async deleteProduct(productId: string): Promise<boolean> {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    return !error;
  },

  async addStock(productId: string, qty: number): Promise<boolean> {
    const { data, error } = await supabase.from('products').select('current_stock, initial_stock').eq('id', productId).single();
    if (error || !data) return false;
    const { error: upErr } = await supabase.from('products').update({
      current_stock: (data.current_stock ?? 0) + qty,
      initial_stock: (data.initial_stock ?? 0) + qty,
    }).eq('id', productId);
    return !upErr;
  },

  // ---------- Orders ----------
  async placeOrder(
    establishmentId: string,
    order: { tableNumber: number; clientName?: string; paymentMethod?: PaymentMethod; serverName: string; total: number },
    items: { productId: string; quantity: number; priceAtTime: number }[]
  ): Promise<string | null> {
    const { data, error } = await supabase.from('orders').insert({
      establishment_id: establishmentId,
      table_number: order.tableNumber,
      client_name: order.clientName || null,
      status: 'EN_ATTENTE',
      payment_method: order.paymentMethod || null,
      server_name: order.serverName,
      total: order.total,
    }).select().single();
    if (error || !data) { console.error('placeOrder', error); return null; }

    const rows = items.map(i => ({ order_id: data.id, product_id: i.productId, quantity: i.quantity, price_at_time: i.priceAtTime }));
    if (rows.length) await supabase.from('order_items').insert(rows);
    return data.id as string;
  },

  async addNotification(establishmentId: string, notif: { type: 'ORDER' | 'CALL_SERVER'; message: string; tableNumber?: number; orderId?: string }): Promise<boolean> {
    const { error } = await supabase.from('notifications').insert({
      establishment_id: establishmentId,
      type: notif.type,
      message: notif.message,
      table_number: notif.tableNumber ?? null,
      order_id: notif.orderId ?? null,
    });
    return !error;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    return !error;
  },

  async payOrder(orderId: string): Promise<boolean> {
    const { error } = await supabase.rpc('pay_order', { p_order: orderId });
    if (error) console.error('payOrder', error);
    return !error;
  },

  async clearNotification(id: string): Promise<boolean> {
    const { error } = await supabase.from('notifications').update({ handled: true }).eq('id', id);
    return !error;
  },

  // ---------- Realtime ----------
  subscribeToBar(establishmentId: string, onChange: () => void) {
    const channel = supabase.channel(`bar_${establishmentId}_${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `establishment_id=eq.${establishmentId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `establishment_id=eq.${establishmentId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `establishment_id=eq.${establishmentId}` }, onChange)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
};
