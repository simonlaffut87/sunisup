/*
  # Ajouter colonne numéro d'entreprise

  1. Modifications de table
    - Ajouter la colonne `company_number` à la table `participants`
    - Type: text (optionnel)
    - Permet de stocker le numéro d'entreprise belge (format: BE 0123.456.789)

  2. Sécurité
    - Aucune modification des politiques RLS nécessaire
    - La colonne hérite des politiques existantes de la table participants
*/

-- Ajouter la colonne company_number à la table participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'company_number'
  ) THEN
    ALTER TABLE participants ADD COLUMN company_number text;
  END IF;
END $$;