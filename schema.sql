-- Active: 1714088921200@@127.0.0.1@5432@postgres
-- Schéma initial pour BarSafe
-- A copier/coller dans l'éditeur SQL de Supabase (SQL Editor)

-- 1. Table des Établissements (Bars)
CREATE TABLE establishments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    logoUrl TEXT,
    coverUrl TEXT,
    secretCode TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des Employés
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('PATRON', 'SERVEUR', 'CAISSIER', 'CLIENT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table des Produits
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('Bière', 'Sucrerie', 'Plat', 'Autre')),
    price INTEGER NOT NULL,
    initialStock INTEGER NOT NULL DEFAULT 0,
    currentStock INTEGER NOT NULL DEFAULT 0,
    imageUrl TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table des Commandes
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
    tableNumber INTEGER NOT NULL,
    clientName TEXT,
    status TEXT NOT NULL CHECK (status IN ('EN_ATTENTE', 'SERVI', 'PAYÉ', 'ANNULÉ')) DEFAULT 'EN_ATTENTE',
    paymentMethod TEXT CHECK (paymentMethod IN ('ESPECES', 'CARTE', 'MOBILE_MONEY')),
    serverName TEXT NOT NULL,
    total INTEGER NOT NULL DEFAULT 0,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table des Articles de Commande
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    priceAtTime INTEGER NOT NULL
);

-- 6. Table des Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('ORDER', 'CALL_SERVER')),
    message TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    tableNumber INTEGER NOT NULL,
    handled BOOLEAN DEFAULT false,
    orderId UUID REFERENCES orders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active la fonction temps-réel pour Supabase
alter publication supabase_realtime add table establishments, products, orders, notifications;
