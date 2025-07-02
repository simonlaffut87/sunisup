/*
  # Nettoyage complet des données factices

  1. Suppression des données
    - Toutes les données energy_data
    - Tous les utilisateurs sauf l'admin
    - Tous les profils utilisateurs sauf l'admin

  2. Conservation
    - Admin (info@sunisup.be)
    - Participants réels de la base
    - Structure de la base de données
*/

DO $$
BEGIN
  -- Supprimer TOUTES les données d'énergie
  DELETE FROM energy_data;
  
  -- Supprimer TOUS les utilisateurs sauf l'admin
  DELETE FROM auth.users WHERE email != 'info@sunisup.be';
  
  -- Supprimer TOUS les profils utilisateurs sauf l'admin
  DELETE FROM users WHERE email != 'info@sunisup.be';
  
  RAISE NOTICE 'Toutes les données factices ont été supprimées';
  RAISE NOTICE 'Seul l''admin (info@sunisup.be) reste dans le système';
  RAISE NOTICE 'Toutes les données energy_data ont été supprimées';
  RAISE NOTICE 'Le système est prêt pour recevoir vos données d''avril 2025';
END $$;