-- =============================================================================
-- BarSafe · MISE À JOUR DE PRODUCTION (fichier unique, généré)
-- À coller UNE fois dans Supabase > SQL Editor, puis « Run ».
-- Contient, dans l'ordre :
--   1. migrations/20261023090000_accounts_and_private_orders.sql
--   2. migrations/20261023120000_become_owner.sql
--   3. migrations/20261023150000_production_hardening.sql
-- Une seule transaction : si une erreur survient, rien n'est modifié.
-- Ensuite : exécuter tests/order_flow.sql pour vérifier.
-- =============================================================================
begin;


-- >>>>>>>>>> migrations/20261023090000_accounts_and_private_orders.sql
-- =============================================================================
-- BarSafe · Comptes (établissements & clients) + commandes privées
--
-- 1. Comptes Supabase Auth : profil OWNER (gère des bars) ou CUSTOMER (client).
-- 2. Un bar appartient à son créateur (owner_id). Le propriétaire ouvre son
--    tableau de bord sans code via owner_session().
-- 3. Les commandes, lignes et notifications ne sont PLUS lisibles avec la clé
--    publique. Lecture uniquement via :
--      - get_bar_activity(token)   : personnel connecté (jeton de session)
--      - track_orders(tokens[])    : client QR, avec les jetons de suivi reçus
--                                    à la commande (secret, non devinable)
--      - my_orders()               : client connecté à son compte
-- 4. Temps réel : signaux sans données (topics "bar:<id>" et "order:<jeton>"),
--    l'app recharge ensuite via les fonctions ci-dessus.
-- Prérequis : 20261022120000_secure_rpc_sessions.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profils
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'CUSTOMER' check (role in ('OWNER', 'CUSTOMER')),
  full_name  text not null default '' check (char_length(full_name) <= 80),
  phone      text not null default '' check (char_length(phone) <= 30),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

drop policy if exists profiles_self_read on profiles;
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_read on profiles for select to authenticated using (id = auth.uid());
create policy profiles_self_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke all on profiles from anon, authenticated;
grant select on profiles to authenticated;
grant update (full_name, phone) on profiles to authenticated;   -- le rôle n'est pas modifiable par l'utilisateur

-- Profil créé automatiquement à l'inscription (type choisi dans le formulaire)
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, role, full_name, phone)
  values (
    new.id,
    case when new.raw_user_meta_data->>'account_type' = 'OWNER' then 'OWNER' else 'CUSTOMER' end,
    left(coalesce(new.raw_user_meta_data->>'full_name', ''), 80),
    left(coalesce(new.raw_user_meta_data->>'phone', ''), 30)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Propriété des établissements, suivi et rattachement des commandes
-- ---------------------------------------------------------------------------
alter table establishments add column if not exists owner_id uuid references auth.users(id) on delete set null;
create index if not exists establishments_owner_idx on establishments (owner_id);

alter table orders add column if not exists tracking_token uuid not null default gen_random_uuid();
alter table orders add column if not exists customer_id uuid references auth.users(id) on delete set null;
create unique index if not exists orders_tracking_token_idx on orders (tracking_token);
create index if not exists orders_customer_idx on orders (customer_id);

-- owner_id ne sort jamais par l'API publique : lecture colonne par colonne
revoke select on establishments from anon, authenticated;
grant select (id, name, description, logo_url, cover_url, address, lat, lng, created_at) on establishments to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Commandes et notifications : fermées en lecture publique
-- ---------------------------------------------------------------------------
drop policy if exists orders_read on orders;
drop policy if exists items_read on order_items;
drop policy if exists notif_read on notifications;
revoke select on orders, order_items, notifications from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders') then
    alter publication supabase_realtime drop table orders;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
    alter publication supabase_realtime drop table notifications;
  end if;
end $$;

-- Commande -> JSON (forme attendue par api.ts : colonnes + order_items)
create or replace function _order_json(o orders)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select (to_jsonb(o) - 'customer_id')
    || jsonb_build_object('order_items', coalesce(
         (select jsonb_agg(to_jsonb(oi)) from order_items oi where oi.order_id = o.id), '[]'::jsonb));
$$;
revoke execute on function _order_json(orders) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Lecture autorisée
-- ---------------------------------------------------------------------------
-- Personnel : toutes les commandes + notifications non traitées de SON bar
create or replace function get_bar_activity(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare s staff_sessions;
begin
  s := _require_session(p_token, array['PATRON', 'SERVEUR', 'CAISSIER']);
  return jsonb_build_object(
    'orders', coalesce((
      select jsonb_agg(_order_json(o) order by o.created_at desc)
      from orders o where o.establishment_id = s.establishment_id), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(to_jsonb(n) order by n.created_at desc)
      from notifications n where n.establishment_id = s.establishment_id and not n.handled), '[]'::jsonb)
  );
end;
$$;

-- Client QR : uniquement les commandes dont il détient le jeton de suivi
create or replace function track_orders(p_tokens uuid[])
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(_order_json(o) order by o.created_at desc), '[]'::jsonb)
  from orders o
  where o.tracking_token = any (p_tokens[1:30]);   -- 30 jetons max par appel
$$;

-- Client connecté : son historique, tous bars confondus
create or replace function my_orders()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(
           _order_json(o) || jsonb_build_object('establishment_name', e.name)
           order by o.created_at desc), '[]'::jsonb)
  from orders o join establishments e on e.id = o.establishment_id
  where auth.uid() is not null and o.customer_id = auth.uid();
$$;

-- Propriétaire : ses établissements
create or replace function my_establishments()
returns setof establishments
language sql stable security definer set search_path = public
as $$
  select * from establishments where auth.uid() is not null and owner_id = auth.uid() order by created_at desc;
$$;

-- Propriétaire connecté -> session Direction sans code
create or replace function owner_session(p_establishment uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_token uuid;
begin
  if auth.uid() is null then
    raise exception 'Connectez-vous à votre compte établissement.' using errcode = '28000';
  end if;
  if not exists (select 1 from establishments where id = p_establishment and owner_id = auth.uid()) then
    raise exception 'Cet établissement n''est pas rattaché à votre compte.' using errcode = '42501';
  end if;
  insert into staff_sessions (establishment_id, role) values (p_establishment, 'PATRON')
  returning token into v_token;
  return v_token;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Écriture : création de bar réservée aux comptes établissement,
--    commande client avec jeton de suivi (+ rattachement au compte client)
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
  if auth.uid() is null or not exists (select 1 from profiles where id = auth.uid() and role = 'OWNER') then
    raise exception 'Connectez-vous avec un compte établissement pour créer un bar.' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Le nom est obligatoire.';
  end if;
  if p_code_patron !~ '^\d{4,8}$' or p_code_serveur !~ '^\d{4,8}$' or p_code_caissier !~ '^\d{4,8}$' then
    raise exception 'Chaque code doit contenir 4 à 8 chiffres.';
  end if;
  if p_code_patron in (p_code_serveur, p_code_caissier) or p_code_serveur = p_code_caissier then
    raise exception 'Les trois codes doivent être différents.';
  end if;
  insert into establishments (name, description, logo_url, cover_url, address, lat, lng, owner_id)
  values (trim(p_name), coalesce(p_description, ''), coalesce(p_logo_url, ''), coalesce(p_cover_url, ''),
          coalesce(p_address, ''), p_lat, p_lng, auth.uid())
  returning id into v_id;
  insert into establishment_access (establishment_id, role, code_hash) values
    (v_id, 'PATRON',   extensions.crypt(p_code_patron,   extensions.gen_salt('bf'))),
    (v_id, 'SERVEUR',  extensions.crypt(p_code_serveur,  extensions.gen_salt('bf'))),
    (v_id, 'CAISSIER', extensions.crypt(p_code_caissier, extensions.gen_salt('bf')));
  return v_id;
end;
$$;

-- place_order renvoie désormais le JETON DE SUIVI (et non l'id interne)
drop function if exists place_order(uuid, integer, text, text, jsonb, uuid);
create or replace function place_order(
  p_establishment uuid, p_table integer, p_client_name text,
  p_payment_method text, p_items jsonb, p_token uuid default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_order uuid;
  v_tracking uuid;
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

  insert into orders (establishment_id, table_number, client_name, status, payment_method, server_name, total, customer_id)
  values (p_establishment, p_table, nullif(left(trim(p_client_name), 60), ''), 'EN_ATTENTE',
          p_payment_method, v_server, 0,
          case when p_token is null then auth.uid() end)   -- client connecté : commande dans son historique
  returning id, tracking_token into v_order, v_tracking;

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
  return v_tracking;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Temps réel : signaux sans contenu
-- ---------------------------------------------------------------------------
create or replace function _signal_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare r record := coalesce(new, old);
begin
  perform realtime.send('{}'::jsonb, 'change', 'bar:' || r.establishment_id, false);
  if tg_table_name = 'orders' then
    perform realtime.send('{}'::jsonb, 'change', 'order:' || r.tracking_token, false);
  end if;
  return null;
exception when others then
  return null;   -- le temps réel ne doit jamais bloquer une commande
end;
$$;
revoke execute on function _signal_change() from public, anon, authenticated;

drop trigger if exists orders_signal on orders;
create trigger orders_signal after insert or update on orders for each row execute function _signal_change();
drop trigger if exists notifications_signal on notifications;
create trigger notifications_signal after insert or update on notifications for each row execute function _signal_change();

-- Purge des tentatives de connexion (> 24 h) et sessions expirées à chaque login,
-- conformément à la politique de confidentialité.
create or replace function staff_login(p_establishment uuid, p_role text, p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_token uuid;
begin
  delete from login_attempts where attempted_at < now() - interval '24 hours';
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

-- ---------------------------------------------------------------------------
-- 7. Droit à l'effacement : l'utilisateur supprime lui-même son compte.
--    Profil supprimé (cascade) ; commandes conservées pour la comptabilité des
--    bars mais détachées du compte ; bars conservés, sans propriétaire.
-- ---------------------------------------------------------------------------
create or replace function delete_my_account()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Connectez-vous pour supprimer votre compte.' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Droits d'exécution
-- ---------------------------------------------------------------------------
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function my_orders(), my_establishments(), owner_session(uuid), delete_my_account() from public, anon;
grant execute on function my_orders(), my_establishments(), owner_session(uuid), delete_my_account() to authenticated;
grant execute on function get_bar_activity(uuid), track_orders(uuid[]) to anon, authenticated;
grant execute on function place_order(uuid, integer, text, text, jsonb, uuid) to anon, authenticated;


-- >>>>>>>>>> migrations/20261023120000_become_owner.sql
-- =============================================================================
-- BarSafe · Passage d'un compte client à un compte établissement
--
-- Utilisé après une connexion Google (Google ne transmet pas le type de compte
-- choisi : le profil est créé en CUSTOMER puis promu) et depuis "Mon compte".
-- Sans risque d'élévation : être OWNER permet seulement de créer SES bars.
-- Prérequis : 20261023090000_accounts_and_private_orders.sql
-- =============================================================================

create or replace function become_owner()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Connectez-vous à votre compte.' using errcode = '28000';
  end if;
  update profiles set role = 'OWNER' where id = auth.uid();
end;
$$;

-- Nom affiché : Google fournit "full_name" ou "name"
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, role, full_name, phone)
  values (
    new.id,
    case when new.raw_user_meta_data->>'account_type' = 'OWNER' then 'OWNER' else 'CUSTOMER' end,
    left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 80),
    left(coalesce(new.raw_user_meta_data->>'phone', ''), 30)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function become_owner() from public, anon;
grant execute on function become_owner() to authenticated;


-- >>>>>>>>>> migrations/20261023150000_production_hardening.sql
-- =============================================================================
-- BarSafe · Durcissement avant production
--   1. Index manquants (signalés par l'advisor Supabase)
--   2. Anti brute-force des codes PAR RÔLE (un attaquant ne bloque plus tout le bar)
--   3. Codes à 6 chiffres minimum pour les nouveaux établissements
--   4. Anti-spam global par établissement (commandes anonymes, appels serveur)
--   5. Images : bucket Storage "media" (lecture publique, écriture via la fonction
--      Edge upload-image) et plafond de taille pour les images encore en base
-- Prérequis : 20261023120000_become_owner.sql
-- =============================================================================

-- 1. Index ---------------------------------------------------------------------
create index if not exists order_items_product_idx on order_items (product_id);
create index if not exists staff_sessions_establishment_idx on staff_sessions (establishment_id);
create index if not exists orders_estab_status_created_idx on orders (establishment_id, status, created_at);
create index if not exists notifications_estab_type_created_idx on notifications (establishment_id, type, created_at);

-- 2. Tentatives de connexion par rôle -------------------------------------------
alter table login_attempts add column if not exists role text;
drop index if exists login_attempts_estab_idx;
create index if not exists login_attempts_estab_role_idx on login_attempts (establishment_id, role, attempted_at);

create or replace function staff_login(p_establishment uuid, p_role text, p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_token uuid;
begin
  delete from login_attempts where attempted_at < now() - interval '24 hours';
  -- 8 échecs en 15 min bloquent CE rôle seulement (Service bloqué ≠ Caisse bloquée)
  if (select count(*) from login_attempts
      where establishment_id = p_establishment and role = p_role
        and attempted_at > now() - interval '15 minutes') >= 8 then
    raise exception 'Trop de tentatives pour cet espace. Réessayez dans 15 minutes.' using errcode = '54000';
  end if;
  if not verify_access(p_establishment, p_role, p_code) then
    insert into login_attempts (establishment_id, role) values (p_establishment, p_role);
    return null;
  end if;
  delete from staff_sessions where expires_at < now();
  insert into staff_sessions (establishment_id, role) values (p_establishment, p_role)
  returning token into v_token;
  return v_token;
end;
$$;

-- 3. Codes à 6 chiffres (les codes existants restent valides) --------------------
create or replace function create_establishment(
  p_name text, p_description text, p_logo_url text, p_cover_url text,
  p_address text, p_lat double precision, p_lng double precision,
  p_code_patron text, p_code_serveur text, p_code_caissier text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from profiles where id = auth.uid() and role = 'OWNER') then
    raise exception 'Connectez-vous avec un compte établissement pour créer un bar.' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Le nom est obligatoire.';
  end if;
  if p_code_patron !~ '^\d{6,8}$' or p_code_serveur !~ '^\d{6,8}$' or p_code_caissier !~ '^\d{6,8}$' then
    raise exception 'Chaque code doit contenir 6 à 8 chiffres.';
  end if;
  if p_code_patron in (p_code_serveur, p_code_caissier) or p_code_serveur = p_code_caissier then
    raise exception 'Les trois codes doivent être différents.';
  end if;
  if (select count(*) from establishments where owner_id = auth.uid()) >= 20 then
    raise exception 'Limite de 20 établissements par compte atteinte. Contactez le support.' using errcode = '54000';
  end if;
  insert into establishments (name, description, logo_url, cover_url, address, lat, lng, owner_id)
  values (left(trim(p_name), 80), left(coalesce(p_description, ''), 500), coalesce(p_logo_url, ''), coalesce(p_cover_url, ''),
          left(coalesce(p_address, ''), 200), p_lat, p_lng, auth.uid())
  returning id into v_id;
  insert into establishment_access (establishment_id, role, code_hash) values
    (v_id, 'PATRON',   extensions.crypt(p_code_patron,   extensions.gen_salt('bf'))),
    (v_id, 'SERVEUR',  extensions.crypt(p_code_serveur,  extensions.gen_salt('bf'))),
    (v_id, 'CAISSIER', extensions.crypt(p_code_caissier, extensions.gen_salt('bf')));
  return v_id;
end;
$$;

-- 4. Anti-spam global par établissement -----------------------------------------
-- Déclenché avant toute commande anonyme : au-delà de 40 commandes clients en
-- 10 minutes pour un même bar, on refuse (un bar réel n'atteint pas ce rythme
-- via le QR, et le personnel peut toujours saisir les commandes).
create or replace function _guard_anonymous_order()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.server_name = 'Client' and (
       select count(*) from orders
       where establishment_id = new.establishment_id and server_name = 'Client'
         and created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'Le bar reçoit trop de commandes en ce moment. Appelez un serveur.' using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke execute on function _guard_anonymous_order() from public, anon, authenticated;
drop trigger if exists orders_guard_anonymous on orders;
create trigger orders_guard_anonymous before insert on orders for each row execute function _guard_anonymous_order();

create or replace function call_server(p_establishment uuid, p_table integer)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if p_table is null or p_table < 1 or p_table > 999 then
    raise exception 'Numéro de table invalide.';
  end if;
  if not exists (select 1 from establishments where id = p_establishment) then
    raise exception 'Établissement introuvable.';
  end if;
  -- Un appel non traité par table et par minute, 30 appels max par bar en 5 minutes
  if exists (select 1 from notifications
             where establishment_id = p_establishment and table_number = p_table
               and type = 'CALL_SERVER' and not handled and created_at > now() - interval '1 minute') then
    return false;
  end if;
  if (select count(*) from notifications
      where establishment_id = p_establishment and type = 'CALL_SERVER'
        and created_at > now() - interval '5 minutes') >= 30 then
    raise exception 'Trop d''appels en ce moment. Un serveur va passer.' using errcode = '54000';
  end if;
  insert into notifications (establishment_id, type, message, table_number)
  values (p_establishment, 'CALL_SERVER', 'Besoin d''un serveur · Table ' || p_table, p_table);
  return true;
end;
$$;

-- 5. Images ---------------------------------------------------------------------
-- Bucket public en lecture ; aucune policy d'écriture : seule la fonction Edge
-- upload-image (clé service, après vérification du compte ou du jeton) écrit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

-- Plafond pour les images encore stockées en texte (data URL compressée, ~150 Ko).
-- NOT VALID : les lignes existantes ne sont pas bloquées, seules les nouvelles.
alter table establishments drop constraint if exists establishments_images_size_check;
alter table establishments add constraint establishments_images_size_check
  check (char_length(coalesce(logo_url, '')) <= 200000 and char_length(coalesce(cover_url, '')) <= 200000) not valid;
alter table products drop constraint if exists products_image_size_check;
alter table products add constraint products_image_size_check
  check (char_length(coalesce(image_url, '')) <= 200000) not valid;

-- Droits
grant execute on function staff_login(uuid, text, text), call_server(uuid, integer) to anon, authenticated;
grant execute on function create_establishment(text, text, text, text, text, double precision, double precision, text, text, text) to anon, authenticated;


commit;

select 'BarSafe : base à jour' as resultat;
