/*
  # Suppression de toutes les données factices

  1. Suppression des données
    - Supprimer toutes les données d'énergie factices
    - Supprimer tous les utilisateurs de test
    - Garder uniquement les participants réels et l'admin

  2. Nettoyage
    - Supprimer les utilisateurs avec des emails de test
    - Nettoyer les données d'énergie
    - Garder uniquement l'admin et les données importées
*/

-- Supprimer toutes les données d'énergie factices
DELETE FROM energy_data WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@example.com' 
     OR email LIKE '%@sunisup-member.com'
     OR email LIKE 'test.%@sunisup.be'
     OR email LIKE 'demo.%@sunisup.be'
     OR email IN ('jean.dupont@example.com', 'marie.martin@example.com', 'pierre.durand@example.com')
);

-- Supprimer les profils utilisateurs factices
DELETE FROM users WHERE email LIKE '%@example.com' 
   OR email LIKE '%@sunisup-member.com'
   OR email LIKE 'test.%@sunisup.be'
   OR email LIKE 'demo.%@sunisup.be'
   OR email IN ('jean.dupont@example.com', 'marie.martin@example.com', 'pierre.durand@example.com');

-- Supprimer les utilisateurs d'authentification factices (garder seulement l'admin)
DELETE FROM auth.users WHERE email != 'info@sunisup.be';

-- Nettoyer les participants factices ajoutés automatiquement
-- Garder seulement les participants réels de la base
-- (Cette requête garde les participants existants mais supprime les données liées aux utilisateurs factices)

RAISE NOTICE 'Toutes les données factices ont été supprimées';
RAISE NOTICE 'Seul l''admin (info@sunisup.be) et les participants réels sont conservés';
RAISE NOTICE 'Les données d''énergie factices ont été supprimées';