import { supabase } from './supabaseClient';
import { Establishment, Order, Product, Notification, UserRole } from './types';

export const api = {
  // Establishments
  async getEstablishments(): Promise<Establishment[]> {
    const { data, error } = await supabase.from('establishments').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return data as Establishment[];
  },

  async createEstablishment(bar: Establishment): Promise<Establishment | null> {
    const { data, error } = await supabase.from('establishments').insert([bar]).select().single();
    if (error) {
       console.error("Error creating establishment:", error);
       return null;
    }
    return data as Establishment;
  },

  // Products
  async getProducts(establishmentId: string): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').eq('establishment_id', establishmentId);
    if (error) return [];
    return data as Product[];
  },

  async updateProducts(products: Product[]): Promise<boolean> {
     const { error } = await supabase.from('products').upsert(products);
     return !error;
  },

  // Orders
  async getOrders(establishmentId: string): Promise<Order[]> {
    const { data, error } = await supabase.from('orders').select('*, items:order_items(*)').eq('establishment_id', establishmentId).order('timestamp', { ascending: false });
    if (error) return [];
    return data as Order[];
  },

  async placeOrder(order: any, items: any[]): Promise<boolean> {
    const { data: insertedOrder, error: orderError } = await supabase.from('orders').insert([order]).select().single();
    if (orderError || !insertedOrder) return false;
    
    const itemsWithOrderId = items.map(i => ({ ...i, order_id: insertedOrder.id }));
    const { error: itemsError } = await supabase.from('order_items').insert(itemsWithOrderId);
    return !itemsError;
  },

  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    return !error;
  },

  // Notifications
  async getNotifications(establishmentId: string): Promise<Notification[]> {
    const { data, error } = await supabase.from('notifications').select('*').eq('establishment_id', establishmentId).order('timestamp', { ascending: false });
    if (error) return [];
    return data as Notification[];
  },

  async addNotification(notif: any): Promise<boolean> {
     const { error } = await supabase.from('notifications').insert([notif]);
     return !error;
  },

  async clearNotification(id: string): Promise<boolean> {
     const { error } = await supabase.from('notifications').delete().eq('id', id);
     return !error;
  },

  // Subscriptions
  subscribeToBarUpdates(establishmentId: string, onUpdate: () => void) {
    const channel = supabase.channel(`bar_${establishmentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `establishment_id=eq.${establishmentId}` }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `establishment_id=eq.${establishmentId}` }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `establishment_id=eq.${establishmentId}` }, onUpdate)
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
