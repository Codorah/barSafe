
export enum UserRole {
  PATRON = 'PATRON',
  SERVEUR = 'SERVEUR',
  CAISSIER = 'CAISSIER',
  CLIENT = 'CLIENT'
}

export type PaymentMethod = 'ESPECES' | 'CARTE' | 'MOBILE_MONEY';

export interface Notification {
  id: string;
  type: 'ORDER' | 'CALL_SERVER';
  message: string;
  timestamp: number;
  tableNumber: number;
  handled: boolean;
  orderId?: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: 'Bière' | 'Sucrerie' | 'Plat' | 'Autre' | string;
  price: number;
  initialStock: number;
  currentStock: number;
  lowStockThreshold?: number;
  imageUrl: string;
}

export enum OrderStatus {
  PENDING = 'EN_ATTENTE',
  SERVED = 'SERVI',
  PAID = 'PAYÉ',
  CANCELLED = 'ANNULÉ'
}

export interface Order {
  id: string;
  tableNumber: number;
  clientName?: string;
  items: { productId: string; quantity: number; priceAtTime: number }[];
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  serverName: string;
  timestamp: number;
  total: number;
}

export interface Establishment {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  secretCode?: string;
  products: Product[];
  orders: Order[];
  employees: Employee[];
  notifications: Notification[];
  loaded?: boolean;
}

export interface AppState {
  establishments: Establishment[];
  selectedEstablishmentId: string | null;
  currentUser: { name: string; role: UserRole; establishmentId: string } | null;
}
