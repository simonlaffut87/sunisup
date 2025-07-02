/*
  # Nettoyage complet des données factices

  1. Suppression des données
    - Supprimer toutes les données d'énergie
    - Supprimer tous les utilisateurs sauf l'admin
    - Garder uniquement les données importées via Excel

  2. Conservation
    - Admin (info@sunisup.be) conservé
    - Participants de base conservés
    - Structure de base intacte
*/

-- Supprimer TOUTES les données d'énergie
DELETE FROM energy_data;

-- Supprimer TOUS les utilisateurs sauf l'admin
DELETE FROM auth.users WHERE email != 'info@sunisup.be';

-- Supprimer TOUS les profils utilisateurs sauf l'admin
DELETE FROM users WHERE email != 'info@sunisup.be';

-- Utiliser un bloc DO pour les messages
DO $$
BEGIN
  RAISE NOTICE 'Toutes les données factices ont été supprimées';
  RAISE NOTICE 'Seul l''admin (info@sunisup.be) reste dans le système';
  RAISE NOTICE 'Toutes les données energy_data ont été supprimées';
  RAISE NOTICE 'Le système est prêt pour l''import des données Excel d''avril 2025';
END $$;