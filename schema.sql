-- =============================================================================
-- BarSafe · Schéma de base (aligné sur la base Supabase réelle et sur api.ts)
--
-- Installation d'un nouveau projet, dans l'éditeur SQL de Supabase :
--   1. ce fichier
--   2. supabase/migrations/20261022120000_secure_rpc_sessions.sql
--      (RLS, sessions du personnel, RPC create_establishment / staff_login /
--       place_order / pay_order / add_stock …)
--   3. supabase/migrations/20261023090000_accounts_and_private_orders.sql
--      (comptes établissement / client, commandes privées, suivi par jeton)
--   4. supabase/migrations/20261023120000_become_owner.sql (passage client -> établissement, Google)
--   5. (optionnel) supabase/tests/order_flow.sql pour vérifier le tout
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Établissements (lecture publique : liste d'accueil et redirection QR)
create table if not exists establishments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  logo_url    text default '',
  cover_url   text default '',
  address     text default '',
  lat         double precision,
  lng         double precision,
  created_at  timestamptz default now()
);

-- 2. Codes d'accès : un code (haché bcrypt) par rôle et par établissement.
--    Table illisible côté client, vérifiée uniquement par staff_login().
create table if not exists establishment_access (
  establishment_id uuid not null references establishments(id) on delete cascade,
  role             text not null check (role in ('PATRON', 'SERVEUR', 'CAISSIER')),
  code_hash        text not null,
  primary key (establishment_id, role)
);

-- 3. Produits (catégorie libre, comme le type TS)
create table if not exists products (
  id                  uuid primary key default gen_random_uuid(),
  establishment_id    uuid references establishments(id) on delete cascade,
  name                text not null,
  description         text default '',
  category            text not null default 'Autre',
  price               numeric not null default 0,
  initial_stock       integer not null default 0,
  current_stock       integer not null default 0,
  low_stock_threshold integer not null default 10,
  image_url           text default '',
  created_at          timestamptz default now()
);

-- 4. Commandes
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  establishment_id uuid references establishments(id) on delete cascade,
  table_number     integer not null default 1,
  client_name      text,
  status           text not null default 'EN_ATTENTE'
                   check (status in ('EN_ATTENTE', 'SERVI', 'PAYÉ', 'ANNULÉ')),
  payment_method   text,
  server_name      text default '',
  total            numeric not null default 0,
  created_at       timestamptz default now()
);

-- 5. Lignes de commande (prix figé au moment de la commande)
create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references orders(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  quantity      integer not null default 1,
  price_at_time numeric not null default 0
);

-- 6. Notifications (nouvelle commande, appel serveur)
create table if not exists notifications (
  id               uuid primary key default gen_random_uuid(),
  establishment_id uuid references establishments(id) on delete cascade,
  type             text not null check (type in ('ORDER', 'CALL_SERVER')),
  message          text not null,
  table_number     integer,
  handled          boolean default false,
  order_id         uuid,
  created_at       timestamptz default now()
);

alter table establishments enable row level security;
alter table establishment_access enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table notifications enable row level security;

drop policy if exists estab_read on establishments;
create policy estab_read on establishments for select using (true);

-- Temps réel sur les tables suivies par les tableaux de bord
alter publication supabase_realtime add table products, orders, notifications;
