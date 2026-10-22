-- =============================================================================
-- BarSafe · Suppression des données de démonstration avant l'ouverture
-- IRRÉVERSIBLE : supprime TOUS les établissements qui ne sont rattachés à aucun
-- compte (créés avant l'arrivée des comptes), avec leurs produits, commandes,
-- notifications, codes et sessions (suppression en cascade).
-- Vérifiez d'abord la liste avec la première requête.
-- =============================================================================

-- 1. Ce qui sera supprimé :
select id, name, created_at from establishments where owner_id is null order by created_at;

-- 2. Suppression (à exécuter après vérification) :
delete from establishments where owner_id is null;
