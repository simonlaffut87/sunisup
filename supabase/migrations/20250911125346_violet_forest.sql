/*
  # Ajouter propriété groupe aux participants

  1. Modifications de table
    - Ajouter colonne `groupe` (text, optionnel) à la table `participants`
    - Permettre aux participants d'être organisés en groupes nommés

  2. Index
    - Ajouter index sur la colonne groupe pour optimiser les requêtes de groupement

  3. Sécurité
    - Aucune modification des politiques RLS nécessaire
    - La colonne groupe hérite des permissions existantes
*/

-- Ajouter la colonne groupe à la table participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'groupe'
  ) THEN
    ALTER TABLE participants ADD COLUMN groupe text;
  END IF;
END $$;

-- Ajouter un index sur la colonne groupe pour optimiser les requêtes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'participants' AND indexname = 'idx_participants_groupe'
  ) THEN
    CREATE INDEX idx_participants_groupe ON participants (groupe) WHERE groupe IS NOT NULL;
  END IF;
END $$;