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
