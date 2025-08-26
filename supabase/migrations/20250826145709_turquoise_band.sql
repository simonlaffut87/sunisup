/*
  # Ajouter colonne prix énergie partagée

  1. Modifications
    - Ajouter la colonne `shared_energy_price` à la table `participants`
    - Type: numeric avec valeur par défaut de 100 (€/MWh)
    - Mettre à jour tous les participants existants avec la valeur par défaut

  2. Sécurité
    - Aucune modification des politiques RLS nécessaire
*/

-- Ajouter la colonne shared_energy_price avec valeur par défaut
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'shared_energy_price'
  ) THEN
    ALTER TABLE participants ADD COLUMN shared_energy_price numeric DEFAULT 100;
  END IF;
END $$;

-- Mettre à jour tous les participants existants qui n'ont pas de valeur
UPDATE participants 
SET shared_energy_price = 100 
WHERE shared_energy_price IS NULL;