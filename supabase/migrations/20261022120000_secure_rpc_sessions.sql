-- =============================================================================
-- BarSafe · Lot sécurité (modif.md points 2 à 5, 8, 11)
--
-- Modèle : pas de Supabase Auth. Le personnel se connecte avec l'un des 3 codes
-- de l'établissement ; `staff_login` renvoie un jeton de session (12 h) que le
-- client renvoie à chaque RPC sensible. Les tables restent lisibles par `anon`
-- (menu public, suivi de commande client, realtime) mais AUCUNE écriture directe
-- n'est autorisée : tout passe par des fonctions SECURITY DEFINER qui vérifient
-- le jeton, le rôle et l'établissement.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Contraintes de cohérence
-- ---------------------------------------------------------------------------
alter table products drop constraint if exists products_values_check;
alter table products add constraint products_values_check
  check (price >= 0 and current_stock >= 0 and initial_stock >= 0 and low_stock_threshold >= 0);

-- Catégories libres côté app (type TS `string`) : on borne seulement la longueur.
alter table products drop constraint if exists products_category_check;
alter table products add constraint products_category_check
  check (char_length(category) between 1 and 40);

alter table order_items drop constraint if exists order_items_values_check;
alter table order_items add constraint order_items_values_check
  check (quantity > 0 and price_at_time >= 0);

alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check
  check (payment_method is null or payment_method in ('ESPECES', 'CARTE', 'MOBILE_MONEY'));

-- ---------------------------------------------------------------------------
-- 2. Codes d'accès hachés (bcrypt)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'establishment_access' and column_name = 'code') then
    alter table establishment_access rename column code to code_hash;
    update establishment_access set code_hash = extensions.crypt(code_hash, extensions.gen_salt('bf'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Sessions du personnel + anti brute-force
-- ---------------------------------------------------------------------------
create table if not exists staff_sessions (
  token uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  role text not null check (role in ('PATRON', 'SERVEUR', 'CAISSIER')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours'
);

create table if not exists login_attempts (
  id bigint generated always as identity primary key,
  establishment_id uuid not null references establishments(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index if not exists login_attempts_estab_idx on login_attempts (establishment_id, attempted_at);

alter table staff_sessions enable row level security;   -- aucune policy : invisible pour anon
alter table login_attempts enable row level security;
alter table establishment_access enable row level security;

-- ---------------------------------------------------------------------------
-- 4. RLS : lecture publique, écriture interdite hors RPC
-- ---------------------------------------------------------------------------
drop policy if exists products_all on products;
drop policy if exists orders_all on orders;
drop policy if exists items_all on order_items;
drop policy if exists notif_all on notifications;

drop policy if exists products_read on products;
drop policy if exists orders_read on orders;
drop policy if exists items_read on order_items;
drop policy if exists notif_read on notifications;
create policy products_read on products for select using (true);
create policy orders_read on orders for select using (true);
create policy items_read on order_items for select using (true);
create policy notif_read on notifications for select using (true);

revoke insert, update, delete, truncate on
  establishments, establishment_access, products, orders, order_items, notifications,
  staff_sessions, login_attempts
from anon, authenticated;
revoke select on establishment_access, staff_sessions, login_attempts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Fonctions internes
-- ---------------------------------------------------------------------------
create or replace function verify_access(p_establishment uuid, p_role text, p_code text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from establishment_access
    where establishment_id = p_establishment
      and role = p_role
      and code_hash = extensions.crypt(p_code, code_hash)
  );
$$;

-- Renvoie l'établissement du jeton si la session est valide et le rôle autorisé.
create or replace function _require_session(p_token uuid, p_roles text[])
returns staff_sessions
language plpgsql stable security definer set search_path = public
as $$
declare s staff_sessions;
begin
  select * into s from staff_sessions where token = p_token and expires_at > now();
  if not found then
    raise exception 'Session expirée, reconnectez-vous.' using errcode = '28000';
  end if;
  if not (s.role = any (p_roles)) then
    raise exception 'Action non autorisée pour ce rôle.' using errcode = '42501';
  end if;
  return s;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Établissements et connexion
-- ---------------------------------------------------------------------------
create or replace function create_establishment(
  p_name text, p_description text, p_logo_url text, p_cover_url text,
  p_address text, p_lat double precision, p_lng double precision,
  p_code_patron text, p_code_serveur text, p_code_caissier text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Le nom est obligatoire.';
  end if;
  if p_code_patron !~ '^\d{4,8}$' or p_code_serveur !~ '^\d{4,8}$' or p_code_caissier !~ '^\d{4,8}$' then
    raise exception 'Chaque code doit contenir 4 à 8 chiffres.';
  end if;
  if p_code_patron in (p_code_serveur, p_code_caissier) or p_code_serveur = p_code_caissier then
    raise exception 'Les trois codes doivent être différents.';
  end if;

  insert into establishments (name, description, logo_url, cover_url, address, lat, lng)
  values (trim(p_name), coalesce(p_description, ''), coalesce(p_logo_url, ''), coalesce(p_cover_url, ''),
          coalesce(p_address, ''), p_lat, p_lng)
  returning id into v_id;

  insert into establishment_access (establishment_id, role, code_hash) values
    (v_id, 'PATRON',   extensions.crypt(p_code_patron,   extensions.gen_salt('bf'))),
    (v_id, 'SERVEUR',  extensions.crypt(p_code_serveur,  extensions.gen_salt('bf'))),
    (v_id, 'CAISSIER', extensions.crypt(p_code_caissier, extensions.gen_salt('bf')));
  return v_id;
end;
$$;

create or replace function staff_login(p_establishment uuid, p_role text, p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_token uuid;
begin
  -- 10 échecs en 15 minutes bloquent l'établissement pendant ce délai.
  if (select count(*) from login_attempts
      where establishment_id = p_establishment and attempted_at > now() - interval '15 minutes') >= 10 then
    raise exception 'Trop de tentatives. Réessayez dans quelques minutes.' using errcode = '54000';
  end if;

  if not verify_access(p_establishment, p_role, p_code) then
    insert into login_attempts (establishment_id) values (p_establishment);
    return null;
  end if;

  delete from staff_sessions where expires_at < now();
  insert into staff_sessions (establishment_id, role) values (p_establishment, p_role)
  returning token into v_token;
  return v_token;
end;
$$;

create or replace function staff_session(p_token uuid)
returns table (establishment_id uuid, role text, expires_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select s.establishment_id, s.role, s.expires_at
  from staff_sessions s where s.token = p_token and s.expires_at > now();
$$;

create or replace function staff_logout(p_token uuid)
returns void
language sql security definer set search_path = public
as $$ delete from staff_sessions where token = p_token; $$;

-- ---------------------------------------------------------------------------
-- 7. Commandes
-- ---------------------------------------------------------------------------
-- Le total est TOUJOURS calculé ici à partir des prix en base.
-- p_items : [{"product_id": "...", "quantity": 2}, ...]
-- p_token NULL = commande client (menu QR), sinon commande saisie par le personnel.
create or replace function place_order(
  p_establishment uuid, p_table integer, p_client_name text,
  p_payment_method text, p_items jsonb, p_token uuid default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_order uuid;
  v_server text := 'Client';
  v_total numeric := 0;
  v_count int;
  r record;
begin
  if p_token is not null then
    select case s.role when 'PATRON' then 'Direction' when 'SERVEUR' then 'Service' else 'Caisse' end
      into v_server
    from _require_session(p_token, array['PATRON', 'SERVEUR', 'CAISSIER']) s;
    if (select establishment_id from staff_sessions where token = p_token) <> p_establishment then
      raise exception 'Action non autorisée pour cet établissement.' using errcode = '42501';
    end if;
  else
    if coalesce(trim(p_client_name), '') = '' then
      raise exception 'Votre nom est obligatoire.';
    end if;
    select count(*) into v_count from orders
    where establishment_id = p_establishment and table_number = p_table
      and status = 'EN_ATTENTE' and created_at > now() - interval '1 hour';
    if v_count >= 5 then
      raise exception 'Trop de commandes en attente pour cette table. Patientez un instant.' using errcode = '54000';
    end if;
  end if;

  if p_table is null or p_table < 1 or p_table > 999 then
    raise exception 'Numéro de table invalide.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La commande est vide.';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Trop d''articles dans une seule commande.';
  end if;

  insert into orders (establishment_id, table_number, client_name, status, payment_method, server_name, total)
  values (p_establishment, p_table, nullif(left(trim(p_client_name), 60), ''), 'EN_ATTENTE',
          p_payment_method, v_server, 0)
  returning id into v_order;

  for r in
    select (i->>'product_id')::uuid as product_id, sum((i->>'quantity')::int) as quantity
    from jsonb_array_elements(p_items) i
    group by 1
  loop
    if r.quantity is null or r.quantity < 1 or r.quantity > 99 then
      raise exception 'Quantité invalide.';
    end if;
    perform 1 from products
      where id = r.product_id and establishment_id = p_establishment and current_stock >= r.quantity;
    if not found then
      raise exception 'Produit indisponible ou stock insuffisant.';
    end if;
    insert into order_items (order_id, product_id, quantity, price_at_time)
    select v_order, p.id, r.quantity, p.price from products p where p.id = r.product_id;
    v_total := v_total + (select price from products where id = r.product_id) * r.quantity;
  end loop;

  update orders set total = v_total where id = v_order;

  if p_token is null then
    insert into notifications (establishment_id, type, message, table_number, order_id)
    values (p_establishment, 'ORDER',
            'Nouvelle commande de ' || left(trim(p_client_name), 60) || ' · Table ' || p_table,
            p_table, v_order);
  end if;
  return v_order;
end;
$$;

create or replace function call_server(p_establishment uuid, p_table integer)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if p_table is null or p_table < 1 or p_table > 999 then
    raise exception 'Numéro de table invalide.';
  end if;
  -- Un seul appel non traité par table et par minute.
  if exists (select 1 from notifications
             where establishment_id = p_establishment and table_number = p_table
               and type = 'CALL_SERVER' and not handled and created_at > now() - interval '1 minute') then
    return false;
  end if;
  insert into notifications (establishment_id, type, message, table_number)
  values (p_establishment, 'CALL_SERVER', 'Besoin d''un serveur · Table ' || p_table, p_table);
  return true;
end;
$$;

create or replace function set_order_status(p_token uuid, p_order uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
declare s staff_sessions; o orders;
begin
  s := _require_session(p_token, array['PATRON', 'SERVEUR', 'CAISSIER']);
  if p_status not in ('SERVI', 'ANNULÉ') then
    raise exception 'Statut non autorisé. Le paiement passe par la caisse.';
  end if;
  select * into o from orders where id = p_order and establishment_id = s.establishment_id for update;
  if not found then raise exception 'Commande introuvable.'; end if;
  if o.status not in ('EN_ATTENTE', 'SERVI') then
    raise exception 'Cette commande est déjà clôturée.';
  end if;
  update orders set status = p_status where id = p_order;
end;
$$;

-- Encaissement : seul moment où le stock baisse. Idempotent : une commande déjà
-- payée est refusée, le stock n'est donc jamais déduit deux fois.
drop function if exists pay_order(uuid);
create or replace function pay_order(p_token uuid, p_order uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare s staff_sessions; o orders; v_short text;
begin
  s := _require_session(p_token, array['PATRON', 'CAISSIER']);
  select * into o from orders where id = p_order and establishment_id = s.establishment_id for update;
  if not found then raise exception 'Commande introuvable.'; end if;
  if o.status = 'PAYÉ' then raise exception 'Commande déjà encaissée.'; end if;
  if o.status = 'ANNULÉ' then raise exception 'Commande annulée.'; end if;

  -- Verrouille les produits concernés puis vérifie le stock avant de déduire.
  perform 1 from products where id in (select product_id from order_items where order_id = p_order) for update;
  select string_agg(p.name, ', ') into v_short
  from order_items oi join products p on p.id = oi.product_id
  where oi.order_id = p_order and p.current_stock < oi.quantity;
  if v_short is not null then
    raise exception 'Stock insuffisant : %. Faites un réassort.', v_short;
  end if;

  update products p set current_stock = p.current_stock - oi.quantity
  from order_items oi where oi.order_id = p_order and oi.product_id = p.id;
  update orders set status = 'PAYÉ' where id = p_order;
end;
$$;

create or replace function clear_notification(p_token uuid, p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare s staff_sessions;
begin
  s := _require_session(p_token, array['PATRON', 'SERVEUR', 'CAISSIER']);
  update notifications set handled = true where id = p_id and establishment_id = s.establishment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Catalogue (Direction uniquement)
-- ---------------------------------------------------------------------------
create or replace function add_product(
  p_token uuid, p_name text, p_description text, p_category text, p_price numeric,
  p_stock integer, p_low_stock_threshold integer, p_image_url text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare s staff_sessions; v_id uuid;
begin
  s := _require_session(p_token, array['PATRON']);
  insert into products (establishment_id, name, description, category, price, initial_stock, current_stock,
                        low_stock_threshold, image_url)
  values (s.establishment_id, trim(p_name), coalesce(p_description, ''), coalesce(nullif(trim(p_category), ''), 'Autre'),
          p_price, coalesce(p_stock, 0), coalesce(p_stock, 0), coalesce(p_low_stock_threshold, 10), coalesce(p_image_url, ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function delete_product(p_token uuid, p_product uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare s staff_sessions;
begin
  s := _require_session(p_token, array['PATRON']);
  delete from products where id = p_product and establishment_id = s.establishment_id;
end;
$$;

-- Réassort atomique (remplace le lire-puis-écrire côté client).
create or replace function add_stock(p_token uuid, p_product uuid, p_qty integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare s staff_sessions; v_stock integer;
begin
  s := _require_session(p_token, array['PATRON']);
  if p_qty is null or p_qty < 1 or p_qty > 100000 then
    raise exception 'Quantité invalide.';
  end if;
  update products
     set current_stock = current_stock + p_qty, initial_stock = initial_stock + p_qty
   where id = p_product and establishment_id = s.establishment_id
  returning current_stock into v_stock;
  if not found then raise exception 'Produit introuvable.'; end if;
  return v_stock;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Droits d'exécution
-- ---------------------------------------------------------------------------
revoke execute on function verify_access(uuid, text, text) from public, anon, authenticated;
revoke execute on function _require_session(uuid, text[]) from public, anon, authenticated;

grant execute on function
  create_establishment(text, text, text, text, text, double precision, double precision, text, text, text),
  staff_login(uuid, text, text),
  staff_session(uuid),
  staff_logout(uuid),
  place_order(uuid, integer, text, text, jsonb, uuid),
  call_server(uuid, integer),
  set_order_status(uuid, uuid, text),
  pay_order(uuid, uuid),
  clear_notification(uuid, uuid),
  add_product(uuid, text, text, text, numeric, integer, integer, text),
  delete_product(uuid, uuid),
  add_stock(uuid, uuid, integer)
to anon, authenticated;
