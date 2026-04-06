
import { AppState, UserRole, Establishment } from './types';

const STORAGE_KEY = 'barsafe_togo_v2';

const DUMMY_BARS: Establishment[] = [
  {
    id: 'b1',
    name: 'Le Grand Plateau',
    description: 'Le meilleur bar de Lomé pour vos soirées entre amis.',
    logoUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=plateau',
    coverUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800',
    secretCode: '1234',
    employees: [],
    orders: [],
    // Added missing notifications array
    notifications: [],
    products: [
      // Added missing description to satisfy Product interface
      { id: 'p1', name: 'Pils 33cl', description: 'Une bière pils locale rafraîchissante.', category: 'Bière', price: 600, initialStock: 100, currentStock: 100, imageUrl: 'https://picsum.photos/seed/pils/400/300' },
      // Added missing description to satisfy Product interface
      { id: 'p2', name: 'Coca 50cl', description: 'Boisson gazeuse rafraîchissante.', category: 'Sucrerie', price: 500, initialStock: 50, currentStock: 50, imageUrl: 'https://picsum.photos/seed/coca/400/300' },
    ]
  },
  {
    id: 'b2',
    name: 'Chez Maman Togo',
    description: 'Cuisine traditionnelle et ambiance chaleureuse.',
    logoUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=maman',
    coverUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&q=80&w=800',
    secretCode: '0000',
    employees: [],
    orders: [],
    // Added missing notifications array
    notifications: [],
    products: [
      // Added missing description to satisfy Product interface
      { id: 'p3', name: 'Brochettes', description: 'Brochettes de bœuf grillées savoureuses.', category: 'Plat', price: 1500, initialStock: 20, currentStock: 20, imageUrl: 'https://picsum.photos/seed/meat/400/300' },
    ]
  }
];

export const loadState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return {
    establishments: DUMMY_BARS,
    selectedEstablishmentId: null,
    currentUser: null,
  };
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
