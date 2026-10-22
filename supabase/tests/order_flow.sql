-- =============================================================================
-- BarSafe · Tests : comptes, isolement des données, commande, encaissement, stock
-- À exécuter dans l'éditeur SQL Supabase APRÈS les migrations. Tout se passe dans
-- une transaction annulée à la fin : aucune donnée n'est conservée.
-- Succès = "BarSafe : tous les tests passent" ; sinon une ASSERT échoue.
-- =============================================================================
begin;

-- Comptes de test (le trigger crée les profils)
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-a000-000000000001', 'owner@test.local',    'authenticated', 'authenticated', '{"account_type":"OWNER","full_name":"Patronne"}'),
  ('00000000-0000-4000-a000-000000000002', 'owner2@test.local',   'authenticated', 'authenticated', '{"account_type":"OWNER","full_name":"Autre"}'),
  ('00000000-0000-4000-a000-000000000003', 'client@test.local',   'authenticated', 'authenticated', '{"account_type":"CUSTOMER","full_name":"Kossi"}'),
  ('00000000-0000-4000-a000-000000000004', 'pirate@test.local',   'authenticated', 'authenticated', '{"account_type":"ADMIN"}');

do $$
declare
  owner1 uuid := '00000000-0000-4000-a000-000000000001';
  owner2 uuid := '00000000-0000-4000-a000-000000000002';
  client uuid := '00000000-0000-4000-a000-000000000003';
  v_bar uuid; v_other uuid; v_beer uuid; v_dish uuid;
  t_patron uuid; t_serveur uuid; t_caisse uuid; t_other uuid; t_owner uuid;
  v_track uuid; v_track2 uuid; v_order uuid; v_order2 uuid; v_total numeric; v_status text;
  v_failed boolean; v_json jsonb;
begin
  -- Profils créés par le trigger, type d'inconnu ramené à CUSTOMER
  assert (select role from profiles where id = owner1) = 'OWNER', 'profil établissement';
  assert (select role from profiles where id = '00000000-0000-4000-a000-000000000004') = 'CUSTOMER', 'type inconnu => CUSTOMER';

  -- Création de bar : refusée sans compte et pour un compte client
  perform set_config('request.jwt.claims', '', true);
  v_failed := false;
  begin perform create_establishment('X', '', '', '', '', null, null, '123456', '111111', '222222'); exception when others then v_failed := true; end;
  assert v_failed, 'création de bar sans compte refusée';

  perform set_config('request.jwt.claims', json_build_object('sub', client, 'role', 'authenticated')::text, true);
  v_failed := false;
  begin perform create_establishment('X', '', '', '', '', null, null, '123456', '111111', '222222'); exception when others then v_failed := true; end;
  assert v_failed, 'un compte client ne crée pas de bar';

  -- Un client peut devenir établissement (connexion Google, ou depuis Mon compte)
  perform become_owner();
  assert (select role from profiles where id = client) = 'OWNER', 'become_owner';
  update profiles set role = 'CUSTOMER' where id = client;   -- on le remet client pour la suite

  perform set_config('request.jwt.claims', json_build_object('sub', owner1, 'role', 'authenticated')::text, true);
  v_bar := create_establishment('Test Bar', '', '', '', '', null, null, '123456', '111111', '222222');
  assert (select owner_id from establishments where id = v_bar) = owner1, 'bar rattaché à son créateur';
  assert (select count(*) from my_establishments()) = 1, 'my_establishments';
  t_owner := owner_session(v_bar);
  assert (select role from staff_session(t_owner)) = 'PATRON', 'propriétaire => session Direction sans code';

  perform set_config('request.jwt.claims', json_build_object('sub', owner2, 'role', 'authenticated')::text, true);
  v_other := create_establishment('Autre Bar', '', '', '', '', null, null, '999999', '888888', '777777');
  v_failed := false;
  begin perform owner_session(v_bar); exception when others then v_failed := true; end;
  assert v_failed, 'un autre propriétaire ne peut pas ouvrir ce bar';

  perform set_config('request.jwt.claims', '', true);

  -- Codes hachés
  assert not exists (select 1 from establishment_access where code_hash in ('123456', '111111', '222222')), 'codes hachés';

  -- Connexion par code
  t_patron := staff_login(v_bar, 'PATRON', '123456');
  t_serveur := staff_login(v_bar, 'SERVEUR', '111111');
  t_caisse := staff_login(v_bar, 'CAISSIER', '222222');
  t_other := staff_login(v_other, 'PATRON', '999999');
  assert t_patron is not null and t_serveur is not null and t_caisse is not null, 'login valide';
  assert staff_login(v_bar, 'PATRON', '000000') is null, 'mauvais code refusé';
  assert staff_login(v_bar, 'SERVEUR', '123456') is null, 'code patron refusé sur le rôle serveur';

  -- Catalogue
  v_beer := add_product(t_patron, 'Flag', '', 'Bière', 1000, 10, 3, '');
  v_dish := add_product(t_patron, 'Brochette', '', 'Plat maison', 2500, 5, 2, '');
  v_failed := false;
  begin perform add_stock(t_serveur, v_beer, 50); exception when others then v_failed := true; end;
  assert v_failed, 'un serveur ne peut pas modifier le stock';
  v_failed := false;
  begin perform add_stock(t_other, v_beer, 50); exception when others then v_failed := true; end;
  assert v_failed, 'pas de stock sur le bar d''un autre';

  -- Commande client QR (sans compte) : total calculé en base, jeton de suivi renvoyé
  v_track := place_order(v_bar, 4, 'Ama', 'MOBILE_MONEY', jsonb_build_array(
      jsonb_build_object('product_id', v_beer, 'quantity', 2),
      jsonb_build_object('product_id', v_beer, 'quantity', 1),
      jsonb_build_object('product_id', v_dish, 'quantity', 2)));
  select id, total into v_order, v_total from orders where tracking_token = v_track;
  assert v_total = 8000, format('total attendu 8000, obtenu %s', v_total);
  assert (select customer_id from orders where id = v_order) is null, 'commande QR non rattachée à un compte';

  -- Suivi : uniquement avec le bon jeton
  assert jsonb_array_length(track_orders(array[v_track])) = 1, 'suivi avec le jeton';
  assert jsonb_array_length(track_orders(array[gen_random_uuid()])) = 0, 'aucune commande avec un faux jeton';
  assert jsonb_array_length(track_orders(array[v_order])) = 0, 'l''id interne ne sert pas de jeton';

  -- Commande d'un client connecté : dans son historique
  perform set_config('request.jwt.claims', json_build_object('sub', client, 'role', 'authenticated')::text, true);
  v_track2 := place_order(v_bar, 2, 'Kossi', 'ESPECES', jsonb_build_array(jsonb_build_object('product_id', v_dish, 'quantity', 3)));
  assert jsonb_array_length(my_orders()) = 1, 'historique client';
  assert (my_orders()->0->>'establishment_name') = 'Test Bar', 'historique avec le nom du bar';
  perform set_config('request.jwt.claims', '', true);
  select id into v_order2 from orders where tracking_token = v_track2;

  -- Activité du bar : personnel de CE bar uniquement
  v_json := get_bar_activity(t_serveur);
  assert jsonb_array_length(v_json->'orders') = 2, 'le service voit les commandes de son bar';
  assert jsonb_array_length(get_bar_activity(t_other)->'orders') = 0, 'l''autre bar ne voit rien';
  v_failed := false;
  begin perform get_bar_activity(gen_random_uuid()); exception when others then v_failed := true; end;
  assert v_failed, 'activité refusée sans session';

  -- Encaissement
  perform set_order_status(t_serveur, v_order, 'SERVI');
  v_failed := false;
  begin perform pay_order(t_serveur, v_order); exception when others then v_failed := true; end;
  assert v_failed, 'un serveur ne peut pas encaisser';
  perform pay_order(t_caisse, v_order);
  assert (select status from orders where id = v_order) = 'PAYÉ', 'commande payée';
  assert (select current_stock from products where id = v_beer) = 7, 'bière : 10 - 3 = 7';
  v_failed := false;
  begin perform pay_order(t_caisse, v_order); exception when others then v_failed := true; end;
  assert v_failed, 'double encaissement refusé';
  assert (select current_stock from products where id = v_beer) = 7, 'pas de double déduction';

  -- Stock insuffisant à l'encaissement
  update products set current_stock = 1 where id = v_dish;
  v_failed := false;
  begin perform pay_order(t_caisse, v_order2); exception when others then v_failed := true; end;
  assert v_failed, 'encaissement refusé si stock insuffisant';
  assert add_stock(t_patron, v_dish, 10) = 11, 'réassort atomique';

  -- Codes à 6 chiffres minimum pour un nouveau bar
  perform set_config('request.jwt.claims', json_build_object('sub', owner1, 'role', 'authenticated')::text, true);
  v_failed := false;
  begin perform create_establishment('Court', '', '', '', '', null, null, '1234', '5678', '9012'); exception when others then v_failed := true; end;
  assert v_failed, 'codes à 4 chiffres refusés';
  perform set_config('request.jwt.claims', '', true);

  -- Blocage par rôle : 8 erreurs sur Service ne bloquent pas la Caisse
  -- (1 échec Service plus haut, « code patron refusé sur le rôle serveur », + 7 ici = 8)
  for i in 1..7 loop
    assert staff_login(v_bar, 'SERVEUR', '000000') is null, 'mauvais code refusé avant blocage';
  end loop;
  v_failed := false;
  begin perform staff_login(v_bar, 'SERVEUR', '111111'); exception when others then v_failed := true; end;
  assert v_failed, 'Service bloqué après 8 erreurs';
  assert staff_login(v_bar, 'CAISSIER', '222222') is not null, 'la Caisse reste accessible';

  -- Déconnexion
  perform staff_logout(t_caisse);
  v_failed := false;
  begin perform pay_order(t_caisse, v_order2); exception when others then v_failed := true; end;
  assert v_failed, 'jeton révoqué refusé';

  -- Transmis aux blocs suivants (joués avec d'autres rôles) jusqu'à la fin de la transaction
  perform set_config('barsafe.test_bar', v_bar::text, true);
end $$;

-- Clé publique (client QR) : aucune lecture directe des données privées
set local role anon;
do $$
declare v_failed boolean;
begin
  v_failed := false;
  begin perform 1 from orders limit 1; exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'commandes illisibles en direct';

  v_failed := false;
  begin perform 1 from order_items limit 1; exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'lignes de commande illisibles';

  v_failed := false;
  begin perform 1 from notifications limit 1; exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'notifications illisibles';

  v_failed := false;
  begin perform owner_id from establishments limit 1; exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'propriétaire des bars masqué';

  v_failed := false;
  begin perform 1 from profiles limit 1; exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'profils illisibles sans compte';

  v_failed := false;
  begin perform my_orders(); exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'my_orders réservé aux comptes';

  v_failed := false;
  begin update products set current_stock = 999; exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'stock non modifiable en direct';

  assert (select count(*) from products where establishment_id = current_setting('barsafe.test_bar')::uuid) = 2, 'menu public lisible';
end $$;
reset role;

-- Compte connecté : ne voit que son propre profil
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}', true);
do $$
begin
  assert (select count(*) from profiles) = 1, 'un compte ne lit que son profil';
  begin
    update profiles set role = 'OWNER' where id = auth.uid();
    assert false, 'le rôle ne doit pas être modifiable';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select 'BarSafe : tous les tests passent' as resultat;
rollback;
